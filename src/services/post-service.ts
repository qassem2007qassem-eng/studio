
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

    const isOwner = profileUserId === currentUserId;

    // Build the query constraints
    const queryConstraints: any[] = [
        where('authorId', '==', profileUserId),
        where('groupId', '==', null), // Ensure we only get profile posts, not group posts
        orderBy('createdAt', 'desc')
    ];

    // If the viewer is not the owner and not an admin, filter out 'only_me' posts at the query level
    if (!isOwner && !isAdmin) {
        queryConstraints.push(where('privacy', '==', 'followers'));
    }

    const q = query(postsCollection, ...queryConstraints);

    try {
        const snapshot = await getDocs(q);
        // If owner or admin, we need to fetch all and then filter in client if needed,
        // because we can't do a query with ('in', ['followers', 'only_me']) and a range operator (orderBy) on another field.
        // But since we moved the privacy filter into the query for non-owners, this is more efficient.
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // For owners/admins, if we queried everything, we'd need to filter now.
        // But the current logic is to query only what's necessary based on role.
        if (isOwner || isAdmin) {
             // This re-query is to include 'only_me' posts for the owner, as Firestore doesn't support 'OR' on different fields with range operators.
             // A more performant approach would be two separate queries and merging, but this is simpler for now.
             const allPostsQuery = query(
                collection(firestore, 'posts'),
                where('authorId', '==', profileUserId),
                where('groupId', '==', null),
                orderBy('createdAt', 'desc')
             );
             const allSnapshot = await getDocs(allPostsQuery);
             posts = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        }

        return posts;
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (pageSize = 10, lastVisible: DocumentSnapshot | null = null) => {
    const postsRef = collection(firestore, 'posts');
    
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
