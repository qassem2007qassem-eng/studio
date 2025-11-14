
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
    
    // Simplified query: get all non-group posts for the user, regardless of privacy.
    // Privacy filtering will happen on the client-side.
    const q = query(
        postsCollection,
        where('authorId', '==', profileUserId),
        where('groupId', '==', null)
    );

    try {
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // Always sort by date first.
        posts.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        });

        // If the viewer is the owner or an admin, they see everything.
        const isAdmin = auth.currentUser?.email === 'admin@app.com';
        if (isAdmin || currentUserId === profileUserId) {
            return posts;
        }
        
        // For other viewers, filter based on privacy rules.
        const { getUserById } = await import('./user-service');
        const profileUser = await getUserById(profileUserId);
        const isFollowing = currentUserId ? (profileUser?.followers || []).includes(currentUserId) : false;

        const filteredPosts = posts.filter(post => {
            if (post.privacy === 'followers') {
                return isFollowing;
            }
             if (post.privacy === 'only_me') {
                return false; // Only the owner can see this, handled above.
            }
            // If privacy is not explicitly 'followers' or 'only_me', assume it's viewable by others.
            // This is safer than assuming a default 'everyone' which we removed.
            return post.privacy !== 'only_me';
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
    const userIdsToQuery = [userProfile.id, ...followingIds];

    if (userIdsToQuery.length === 0) {
        userIdsToQuery.push(userProfile.id); // Should not happen if user can see their own posts, but as a fallback.
    }
    
    const postsRef = collection(firestore, 'posts');
    
    const feedQueryConstraints = [
        where('authorId', 'in', userIdsToQuery),
        where('groupId', '==', null), // Explicitly exclude group posts from the main feed
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    ];

    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    const q = query(postsRef, ...feedQueryConstraints);

    const querySnapshot = await getDocs(q);

    // Filter for privacy on the client side
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))
        .filter(post => {
            if (post.authorId === userProfile.id) {
                return true; // User can always see their own posts
            }
            if (post.privacy === 'followers') {
                return followingIds.includes(post.authorId);
            }
            if (post.privacy === 'only_me') {
                return false; // This post should not be in another user's feed
            }
            // If we removed 'everyone', then 'followers' is the only public-like state.
            return post.privacy === 'followers'; 
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
