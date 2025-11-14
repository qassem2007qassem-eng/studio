
'use client';

import {
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  updateDoc,
  limit,
  startAfter,
  or,
  DocumentSnapshot,
} from 'firebase/firestore';
import {
  ref,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { type Post, type PrivacySetting, type User, type Group } from '@/lib/types';
import { createNotification } from './notification-service';

const { auth, firestore, storage } = initializeFirebase();

type CreatePostInput = {
  content: string;
  author: {
    name: string;
    username: string;
  };
  privacy: PrivacySetting;
  commenting: PrivacySetting;
  background?: string;
  groupId?: string; // Add groupId
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  let status: 'pending' | 'approved' = 'approved';
  if (input.groupId) {
    const groupRef = doc(firestore, 'groups', input.groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
        const groupData = groupSnap.data() as Group;
        if (groupData.moderationRequired && groupData.creatorId !== user.uid) {
            status = 'pending';
        }
    }
  }


  const postData: Omit<Post, 'id'> = {
    authorId: user.uid,
    author: input.author,
    content: input.content,
    createdAt: serverTimestamp() as Timestamp,
    likeIds: [],
    privacy: input.privacy,
    commenting: input.commenting,
    background: input.background || 'default',
    groupId: input.groupId,
    status: status,
  };

  const postCollectionRef = collection(firestore, 'posts');
  const postDocRef = await addDoc(postCollectionRef, postData);
  
  await updateDoc(postDocRef, { id: postDocRef.id });

  return postDocRef.id;
};


export const deletePost = async (postId: string, asAdmin = false): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const postRef = doc(firestore, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
        throw new Error("Post not found.");
    }
    
    const postData = postSnap.data() as Post;
    const postAuthorId = postData.authorId;

    let canDelete = asAdmin || postAuthorId === user.uid;

    if (!canDelete && postData.groupId) {
        const groupRef = doc(firestore, 'groups', postData.groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists() && groupSnap.data().creatorId === user.uid) {
            canDelete = true; // Group admin can delete posts in their group
        }
    }

    if (!canDelete) {
        throw new Error("User not authorized to delete this post.");
    }
    
    const batch = writeBatch(firestore);
    
    const commentsRef = collection(firestore, 'posts', postId, 'comments');
    const commentsSnap = await getDocs(commentsRef);
    commentsSnap.forEach(commentDoc => batch.delete(commentDoc.ref));

    batch.delete(postRef);

    await batch.commit();
}


export const getPostsForUser = async (profileUserId: string, currentUserId?: string): Promise<Post[]> => {
    const postsCollection = collection(firestore, 'posts');
    
    // RADICAL FIX v4: Simplest possible query. Only fetch by author.
    // All filtering and sorting will be done client-side.
    const q = query(
        postsCollection,
        where('authorId', '==', profileUserId)
    );

    try {
        const snapshot = await getDocs(q);
        const allUserPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // Manual filter for non-group posts
        let posts = allUserPosts.filter(p => !p.groupId);

        // Manual sort after fetching
        posts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        const isAdmin = auth.currentUser?.email === 'admin@app.com';
        
        // If the viewer is the owner or an admin, show all posts (that are not in a group)
        if (isAdmin || currentUserId === profileUserId) {
            return posts;
        }

        // For other viewers, filter based on privacy settings
        const { getUserById } = await import('./user-service');
        const profileUser = await getUserById(profileUserId);
        const isFollowing = currentUserId ? (profileUser?.followers || []).includes(currentUserId) : false;

        return posts.filter(post => {
            if (post.privacy === 'followers') {
                return isFollowing;
            }
            if (post.privacy === 'only_me') {
                return false; 
            }
            return false;
        });

    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (userProfile: User | null, pageSize = 10, lastVisible: DocumentSnapshot | null = null) => {
    if (!userProfile) return { posts: [], lastVisible: null, hasMore: false };

    const followingIds = userProfile.following || [];
    const userIdsToQuery = [userProfile.id, ...followingIds];

    if (userIdsToQuery.length === 0) {
        return { posts: [], lastVisible: null, hasMore: false };
    }
    
    const postsRef = collection(firestore, 'posts');
    
    // Filter posts for the feed: from followed users or self, and not in a group.
    const feedQueryConstraints: any[] = [
        where('authorId', 'in', userIdsToQuery),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    ];

    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    const q = query(postsRef, ...feedQueryConstraints);

    const querySnapshot = await getDocs(q);
    
    const allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

    // Client-side filtering for privacy and group posts
    const posts = allPosts.filter(post => {
        if (post.groupId) {
            return false; // Exclude all group posts
        }
        if (post.authorId === userProfile.id) {
            return true; // Always show own posts
        }
        // The query already ensures we are following the author, so 'followers' posts are implicitly allowed.
        // We just need to exclude 'only_me' posts from other users.
        return post.privacy !== 'only_me';
    });


    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageSize;

    return { posts, lastVisible: newLastVisible, hasMore };
}


export const approvePost = async (postId: string) => {
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, { status: 'approved' });
}

export const rejectPost = async (postId: string) => {
    // This is essentially deleting the post
    await deletePost(postId, true); // Use asAdmin to allow group owners to delete
}
