
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
import { type Post, type PrivacySetting } from '@/lib/types';
import { uploadFile } from './storage-service';
import { createNotification } from './notification-service';

const { auth, firestore, storage } = initializeFirebase();

type CreatePostInput = {
  content: string;
  images: File[];
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
  };
  privacy: PrivacySetting;
  commenting: PrivacySetting;
  background?: string;
  onProgress?: (fileName: string, progress: number, status: 'uploading' | 'completed' | 'error') => void;
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  let imageUrls: string[] = [];

  // 1. Upload all images first and collect their URLs.
  // Using Promise.all ensures that we wait for all uploads to complete before proceeding.
  // If any upload fails, Promise.all will reject, and the post won't be created.
  if (input.images && input.images.length > 0) {
    try {
      const uploadPromises = input.images.map((imageFile) => {
        // Generate a unique path for each file.
        const path = `posts/${user.uid}/${Date.now()}_${imageFile.name}`;
        return uploadFile(imageFile, path, (progress, status) => {
          input.onProgress?.(imageFile.name, progress, status);
        });
      });
      imageUrls = await Promise.all(uploadPromises);
    } catch (error) {
      // If any upload fails, we stop the entire process and re-throw the error.
      console.error("Image upload failed, post creation stopped.", error);
      throw new Error("One or more images failed to upload. Please try again.");
    }
  }

  // 2. Only if all images are uploaded successfully, create the post document.
  const postData: Omit<Post, 'id'> = {
    authorId: user.uid,
    author: input.author,
    content: input.content,
    createdAt: serverTimestamp() as Timestamp,
    likeIds: [],
    imageUrls: imageUrls, // Use the URLs from the successful uploads
    privacy: input.privacy,
    commenting: input.commenting,
    background: input.background || 'default',
  };

  const postCollectionRef = collection(firestore, 'posts');
  const postDocRef = await addDoc(postCollectionRef, postData);
  
  // Update the post with its own ID for easier reference
  await updateDoc(postDocRef, { id: postDocRef.id });

  return postDocRef.id;
};


export const deletePost = async (postId: string, imageUrls: string[], asAdmin = false): Promise<void> => {
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

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
          try {
              const imageRef = ref(storage, url);
              await deleteObject(imageRef);
          } catch (error: any) {
              if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete image ${url}:`, error);
              }
          }
      }
    }
}


export const getPostsForUser = async (profileUserId: string, currentUserId?: string): Promise<Post[]> => {
    const postsCollection = collection(firestore, 'posts');
    
    let privacyFilters: PrivacySetting[] = ['everyone'];

    const currentUser = auth.currentUser;
    const isAdmin = currentUser?.email === 'admin@app.com';

    if (currentUserId) {
        if (currentUserId === profileUserId || isAdmin) {
            privacyFilters = ['everyone', 'followers', 'only_me'];
        } else {
            const { getCurrentUserProfile } = await import('./user-service');
            const profileUser = await getCurrentUserProfile({ userId: profileUserId });
            if (profileUser?.followers?.includes(currentUserId)) {
                privacyFilters.push('followers');
            }
        }
    }
    
    const q = query(
        postsCollection,
        where('authorId', '==', profileUserId),
        where('privacy', 'in', privacyFilters)
    );

    try {
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        posts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
        });

        return posts;
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};
