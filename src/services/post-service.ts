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

// Removed 'use client' to allow server-side usage

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
  const { auth, firestore } = initializeFirebase();
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
    const { auth, firestore } = initializeFirebase();
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
    const { auth, firestore } = initializeFirebase();
    const postsCollection = collection(firestore, 'posts');
    const isAdmin = auth.currentUser?.email === 'admin@app.com';

    const isOwner = profileUserId === currentUserId;

    // Build the query constraints
    const queryConstraints: any[] = [
        where('authorId', '==', profileUserId),
        where('groupId', '==', null), // Ensure we only get profile posts, not group posts
    ];
    
    if (!isOwner && !isAdmin) {
        // If not the owner or an admin, only fetch public posts.
        queryConstraints.push(where('privacy', '==', 'followers'));
    }

    const q = query(postsCollection, ...queryConstraints);

    try {
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // This is a simplified approach. A more complex app might need to merge queries.
        if (isOwner) {
            const onlyMeQuery = query(collection(firestore, 'posts'), where('authorId', '==', profileUserId), where('privacy', '==', 'only_me'));
            const onlyMeSnapshot = await getDocs(onlyMeQuery);
            const onlyMePosts = onlyMeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            posts = [...posts, ...onlyMePosts];
        }

        posts.sort((a,b) => (b.createdAt.seconds - a.createdAt.seconds));

        return posts;
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (pageSize = 10, lastVisible: DocumentSnapshot | null = null, currentUserId?: string) => {
    const { firestore } = initializeFirebase();
    const postsRef = collection(firestore, 'posts');

    // Base query for public, non-group posts
    let feedQueryConstraints: any[] = [
        where('groupId', '==', null),
        where('status', '==', 'approved'),
        where('privacy', '==', 'followers'),
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

        const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
        const hasMore = querySnapshot.docs.length === pageSize;

        return { posts, lastVisible: newLastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching feed posts:", error);
         return { posts: [], lastVisible: null, hasMore: false };
    }
}


export const approvePost = async (postId: string) => {
    const { firestore } = initializeFirebase();
    const postRef = doc(firestore, 'posts', postId);
    await updateDoc(postRef, { status: 'approved' });
}

export const rejectPost = async (postId: string) => {
    // This is essentially deleting the post
    await deletePost(postId, true); // Use asAdmin to allow group owners to delete
}
