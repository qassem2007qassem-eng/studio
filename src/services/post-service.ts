
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
  DocumentData,
} from 'firebase/firestore';
import {
  ref,
  deleteObject,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { type Post, type PrivacySetting, type User, type Group } from '@/lib/types';
import { createNotification } from './notification-service';
import { getCurrentUserProfile } from './user-service';


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
    ];
    
    if (!isOwner && !isAdmin) {
        // If not the owner or an admin, only fetch public posts.
        queryConstraints.push(where('privacy', '==', 'followers'));
    }

    const q = query(postsCollection, ...queryConstraints, orderBy('createdAt', 'desc'));

    try {
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // This is a simplified approach. A more complex app might need to merge queries.
        if (isOwner) {
            const onlyMeQuery = query(collection(firestore, 'posts'), where('authorId', '==', profileUserId), where('privacy', '==', 'only_me'), orderBy('createdAt', 'desc'));
            const onlyMeSnapshot = await getDocs(onlyMeQuery);
            const onlyMePosts = onlyMeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
             // Combine and re-sort
            posts = [...posts.filter(p => p.privacy !== 'only_me'), ...onlyMePosts]
                  .sort((a,b) => (b.createdAt.seconds - a.createdAt.seconds));
        }

        return posts;
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const getFeedPosts = async (
    pageSize = 10, 
    lastVisible?: DocumentSnapshot<DocumentData> | null, 
    userId?: string
): Promise<{ posts: Post[], lastVisible: DocumentSnapshot<DocumentData> | null, hasMore: boolean }> => {
    const { firestore } = initializeFirebase();
    const postsRef = collection(firestore, 'posts');

    if (!userId) {
        // For non-logged-in users, show some public posts
        const q = query(postsRef, where('privacy', '==', 'followers'), where('groupId', '==', null), orderBy('createdAt', 'desc'), limit(pageSize));
         const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        return { posts, lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] ?? null, hasMore: posts.length === pageSize };
    }

    const userProfile = await getCurrentUserProfile({ userId, forceRefresh: false });
    
    // User's feed should contain posts from people they follow AND their own posts.
    const followingIds = [...(userProfile?.following || []), userId];

    if (followingIds.length === 0) {
        return { posts: [], lastVisible: null, hasMore: false };
    }

    // Firestore 'in' queries are limited to 30 items. Handle pagination if needed in a real app.
    const queryableFollowingIds = followingIds.slice(0, 30);

    let feedQueryConstraints: any[] = [
        where('authorId', 'in', queryableFollowingIds),
        where('status', '==', 'approved'), // only show approved posts
        where('privacy', 'in', ['followers', 'everyone']), // show public posts from followed users
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    ];
    
    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    const q = query(postsRef, ...feedQueryConstraints);
    
    try {
        const querySnapshot = await getDocs(q);
        
        const posts = querySnapshot.docs.map(doc => {
            const data = doc.data() as Post;
            return { 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt ? data.updatedAt : undefined,
            };
        });

        const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
        const hasMore = querySnapshot.docs.length === pageSize;

        return { posts, lastVisible: newLastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching feed posts:", error);
         if (error instanceof Error && error.message.includes('requires an index')) {
             console.error("COMPOSITE INDEX REQUIRED! Please create it in the Firebase console. Falling back to a simpler query.");
             // Fallback query without the status filter to avoid crashing.
             let fallbackConstraints = [
                where('authorId', 'in', queryableFollowingIds),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
             ];
              if (lastVisible) {
                fallbackConstraints.push(startAfter(lastVisible));
              }
             const fallbackQuery = query(postsRef, ...fallbackConstraints);
             const snapshot = await getDocs(fallbackQuery);
              const posts = snapshot.docs.map(doc => doc.data() as Post);
              return { posts, lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null, hasMore: posts.length === pageSize };
        }
        throw error;
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
