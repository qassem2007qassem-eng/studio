
'use client';

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { type Post, type PrivacySetting } from '@/lib/types';

const { auth } = initializeFirebase();

type CreatePostInput = {
  content: string;
  imageBlobs: string[];
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  privacy: PrivacySetting;
  commenting: PrivacySetting;
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { firestore, storage } = initializeFirebase();
  
  // 1. Upload images to Firebase Storage in parallel
  const imageUrls = await Promise.all(
    input.imageBlobs.map(async (blob) => {
      const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${Math.random()}`);
      await uploadString(imageRef, blob, 'data_url');
      return getDownloadURL(imageRef);
    })
  );
  
  // 2. Create post document in Firestore
  const postsCollection = collection(firestore, 'posts');
  
  const postData: Omit<Post, 'id'> = {
    authorId: user.uid,
    author: input.author,
    content: input.content,
    imageUrls,
    createdAt: serverTimestamp() as any, // Cast because serverTimestamp is a sentinel
    updatedAt: serverTimestamp() as any,
    likeIds: [],
    privacy: input.privacy,
    commenting: input.commenting,
  };

  const docRef = await addDoc(postsCollection, postData);
  return docRef.id;
};


export const deletePost = async (postId: string, imageUrls: string[]): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { firestore, storage } = initializeFirebase();

    const postRef = doc(firestore, 'posts', postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists() || postSnap.data().authorId !== user.uid) {
        throw new Error("Post not found or user not authorized to delete it.");
    }
    
    const batch = writeBatch(firestore);

    // 1. Delete the post document from Firestore
    batch.delete(postRef);

    // TODO: Need to delete comments and likes subcollections. This requires a Cloud Function for full cleanup.
    // For now, we'll just delete the post document.

    await batch.commit();

    // 2. Delete images from Storage after the database operation
    for (const url of imageUrls) {
        try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
        } catch (error: any) {
            // Log error if an image fails to delete, but don't block the process
            console.error(`Failed to delete image ${url}:`, error);
        }
    }
}
