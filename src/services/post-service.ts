
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
    const isAdmin = auth.currentUser?.email === 'admin@app.com';

    // Determine the privacy levels we are allowed to see
    const visiblePrivacyLevels: PrivacySetting[] = ['followers']; // Everyone can see public posts
    
    const isOwner = profileUserId === currentUserId;

    if (isOwner || isAdmin) {
        // If owner or admin, they can see everything including their 'only_me' posts
        visiblePrivacyLevels.push('only_me');
    } else {
        // If a visitor is following the profile user, they can see 'followers' posts.
        // This is already included, so we just need to ensure we don't query for 'only_me'.
    }

    const q = query(
        postsCollection,
        where('authorId', '==', profileUserId),
        where('groupId', '==', null), // Ensure we only get profile posts, not group posts
        orderBy('createdAt', 'desc')
    );

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .filter(post => visiblePrivacyLevels.includes(post.privacy));
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (userProfile: User | null, pageSize = 10, lastVisible: DocumentSnapshot | null = null) => {
    if (!userProfile) return { posts: [], lastVisible: null, hasMore: false };
    
    const postsRef = collection(firestore, 'posts');
    
    // Simpler, faster query: Get all public posts ordered by date.
    // The feed is no longer strictly limited to people the user follows, but is a global feed.
    // This avoids the complex 'in' query which is slow and has limitations.
    let feedQueryConstraints: any[] = [
        where('privacy', '==', 'followers'), // 'followers' is used as 'public'
        where('groupId', '==', null), // Exclude group posts from main feed
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    ];

    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    const q = query(postsRef, ...feedQueryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
        
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

        const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const hasMore = querySnapshot.docs.length === pageSize;

        return { posts, lastVisible: newLastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching feed posts:", error);
         return { posts: [], lastVisible: null, hasMore: false };
    }
}


export const approvePost = async (postId: string) => {
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, { status: 'approved' });
}

export const rejectPost = async (postId: string) => {
    // This is essentially deleting the post
    await deletePost(postId, true); // Use asAdmin to allow group owners to delete
}
