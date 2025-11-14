
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
} from 'firebase/firestore';
import {
  ref,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { type Post, type PrivacySetting, type User } from '@/lib/types';
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
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
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
    
    const postAuthorId = postSnap.data().authorId;
    if (!asAdmin && postAuthorId !== user.uid) {
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
    
    // Base query for the user's posts
    const baseQuery = query(
        postsCollection,
        where('authorId', '==', profileUserId),
    );

    try {
        const snapshot = await getDocs(baseQuery);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        const currentUser = auth.currentUser;
        const isAdmin = currentUser?.email === 'admin@app.com';

        if (isAdmin || currentUserId === profileUserId) {
            // Admin or the profile owner can see all posts
            return posts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        }

        const { getUserById } = await import('./user-service');
        const profileUser = await getUserById(profileUserId);
        const isFollowing = currentUserId ? (profileUser?.followers || []).includes(currentUserId) : false;

        const filteredPosts = posts.filter(post => {
            if (post.privacy === 'everyone') {
                return true;
            }
            if (post.privacy === 'followers' && isFollowing) {
                return true;
            }
            // 'only_me' posts are only visible to the owner, which is handled by the first `if` block.
            return false;
        });

        // Sort after filtering
        filteredPosts.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        return filteredPosts;

    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};
