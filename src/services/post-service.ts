
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
    
    // Simplified query: just get all non-group posts for the user.
    // Filtering and sorting will happen on the client.
    const q = query(
        postsCollection,
        where('authorId', '==', profileUserId),
        where('groupId', '==', null)
    );

    try {
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        const currentUser = auth.currentUser;
        const isAdmin = currentUser?.email === 'admin@app.com';

        // Sort all posts by date first.
        posts.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        });

        if (isAdmin || currentUserId === profileUserId) {
            // Admins and profile owners can see all posts.
            return posts;
        }
        
        const { getUserById } = await import('./user-service');
        const profileUser = await getUserById(profileUserId);
        const isFollowing = currentUserId ? (profileUser?.followers || []).includes(currentUserId) : false;

        // Apply privacy filtering on the client.
        const filteredPosts = posts.filter(post => {
            if (post.privacy === 'everyone') {
                return true;
            }
            if (post.privacy === 'followers' && isFollowing) {
                return true;
            }
            // 'only_me' posts are filtered out because currentUserId !== profileUserId here.
            return false;
        });
        
        return filteredPosts;

    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (userProfile: User | null, pageSize = 10, lastVisible: DocumentSnapshot | null = null) => {
    if (!userProfile) return { posts: [], lastVisible: null, hasMore: false };

    const followingIds = userProfile.following || [];
    // User feed should contain posts from themselves and those they follow.
    const userIdsToQuery = [userProfile.id, ...followingIds];

    // If the user is not following anyone, the 'in' query with an empty array fails.
    // So we just query for their own posts in that case.
    if (userIdsToQuery.length === 0) {
        userIdsToQuery.push(userProfile.id);
    }
    
    const postsRef = collection(firestore, 'posts');
    
    const feedQueryConstraints = [
        where('authorId', 'in', userIdsToQuery),
        // CRITICAL: Filter out group posts from the main feed.
        where('groupId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    ];

    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    const q = query(postsRef, ...feedQueryConstraints);

    const querySnapshot = await getDocs(q);

    // After fetching, we still need to apply privacy rules.
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
        .filter(post => {
            // The author is either the user or someone they follow, so we check privacy
            if (post.authorId === userProfile.id) {
                // User can always see their own posts.
                return true;
            }
            if (post.privacy === 'everyone') {
                return true;
            }
            if (post.privacy === 'followers') {
                // This check is inherently true because of the `userIdsToQuery` but good to keep for clarity.
                return followingIds.includes(post.authorId);
            }
            // 'only_me' posts are filtered out by the authorId check above.
            return false;
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
