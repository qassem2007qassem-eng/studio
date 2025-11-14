
'use client';

import {
  getFirestore,
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
  limit,
  Timestamp,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { type Post, type PrivacySetting } from '@/lib/types';
import { getCurrentUserProfile } from './user-service';

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

  const postData: Omit<Post, 'id' | 'imageUrls'> = {
    authorId: user.uid,
    author: input.author,
    content: input.content,
    createdAt: serverTimestamp() as Timestamp,
    likeIds: [],
    privacy: input.privacy,
    commenting: input.commenting,
    background: input.background || 'default',
  };

  const postDocRef = await addDoc(collection(firestore, 'posts'), postData);

  let imageUrls: string[] = [];
  if (input.images && input.images.length > 0) {
    const uploadPromises = input.images.map(async (imageFile, index) => {
      const fileName = `image-${index}`;
      const imageRef = ref(storage, `posts/${user.uid}/${postDocRef.id}/${fileName}`);
      const uploadTask = uploadBytesResumable(imageRef, imageFile);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            input.onProgress?.(imageFile.name, progress, 'uploading');
          },
          (error) => {
            console.error(`Upload failed for ${imageFile.name}:`, error);
            input.onProgress?.(imageFile.name, 0, 'error');
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            input.onProgress?.(imageFile.name, 100, 'completed');
            resolve(downloadURL);
          }
        );
      });
    });
    imageUrls = await Promise.all(uploadPromises);
  }

  await updateDoc(postDocRef, {
    id: postDocRef.id,
    imageUrls: imageUrls,
  });

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
    
    // Also delete comments subcollection
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

/**
 * Gets posts for a specific user, handling privacy rules.
 * @param profileUserId The ID of the user whose posts are being requested.
 * @param currentUserId The ID of the currently logged-in user (optional).
 * @returns A promise that resolves to an array of posts.
 */
export const getPostsForUser = async (profileUserId: string, currentUserId?: string): Promise<Post[]> => {
    const postsCollection = collection(firestore, 'posts');
    
    let privacyFilters: PrivacySetting[] = ['everyone'];

    const currentUser = auth.currentUser;
    const isAdmin = currentUser?.email === 'admin@app.com';

    // If a user is logged in, check if they are viewing their own profile or if they follow the user.
    if (currentUserId) {
        if (currentUserId === profileUserId || isAdmin) {
            privacyFilters = ['everyone', 'followers', 'only_me'];
        } else {
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
