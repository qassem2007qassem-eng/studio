

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
  setDoc,
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
import { getCurrentUserProfile } from './user-service';

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
  background?: string;
};

export const createPost = async (input: CreatePostInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { firestore, storage } = initializeFirebase();
  
  let imageUrls: string[] = [];
  if (input.imageBlobs && input.imageBlobs.length > 0) {
      imageUrls = await Promise.all(
        input.imageBlobs.map(async (blob) => {
          const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${Math.random()}`);
          await uploadString(imageRef, blob, 'data_url');
          return getDownloadURL(imageRef);
        })
      );
  }
  
  const postsCollection = collection(firestore, 'posts');
  
  const postData: Omit<Post, 'id'> = {
    authorId: user.uid,
    author: input.author,
    content: input.content,
    imageUrls: imageUrls,
    createdAt: serverTimestamp() as Timestamp,
    likeIds: [],
    privacy: input.privacy,
    commenting: input.commenting,
    background: input.background || 'default'
  };

  const postDocRef = doc(postsCollection); // Create a reference with a new ID

  await setDoc(postDocRef, {
      ...postData,
      id: postDocRef.id, // Explicitly set the ID
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
  });

  return postDocRef.id;
};


export const deletePost = async (postId: string, imageUrls: string[], asAdmin = false): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { firestore, storage } = initializeFirebase();

    const postRef = doc(firestore, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
        throw new Error("Post not found.");
    }
    
    // Admin can delete any post, otherwise check ownership
    if (!asAdmin && postSnap.data().authorId !== user.uid) {
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
    const { firestore } = initializeFirebase();
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

