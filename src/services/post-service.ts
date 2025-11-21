
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
import { safeToDate } from '@/lib/utils';


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
    const { firestore } = initializeFirebase();
    const postsCollection = collection(firestore, 'posts');
    const isOwner = profileUserId === currentUserId;

    // Build the query constraints
    const queryConstraints: any[] = [
        where('authorId', '==', profileUserId),
        orderBy('createdAt', 'desc'),
    ];
    
    const q = query(postsCollection, ...queryConstraints);

    try {
        const snapshot = await getDocs(q);
        let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        
        // Filter client-side for privacy
        if (!isOwner) {
           posts = posts.filter(post => post.privacy !== 'only_me');
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

    // For non-logged-in users, show public posts from non-group contexts
    if (!userId) {
        let q;
        if (lastVisible) {
            q = query(postsRef, where('privacy', '==', 'followers'), where('status', '==', 'approved'), where('groupId', '==', null), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(pageSize));
        } else {
            q = query(postsRef, where('privacy', '==', 'followers'), where('status', '==', 'approved'), where('groupId', '==', null), orderBy('createdAt', 'desc'), limit(pageSize));
        }
        
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
        return { posts, lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] ?? null, hasMore: posts.length === pageSize };
    }

    const userProfile = await getCurrentUserProfile({ userId });

    // Feed should contain posts from people user is following AND their own posts.
    const followingIds = [...(userProfile?.following || []), userId];

    if (followingIds.length === 0) {
        return { posts: [], lastVisible: null, hasMore: false };
    }
    
    // Firestore 'in' queries are limited to 30 items. 
    // This is a simplification. For >29 followings, a more complex solution is needed.
    const queryableFollowingIds = followingIds.slice(0, 30);

    let feedQueryConstraints: any[] = [
        where('authorId', 'in', queryableFollowingIds),
        orderBy('createdAt', 'desc'),
    ];

    if (lastVisible) {
        feedQueryConstraints.push(startAfter(lastVisible));
    }
    
    feedQueryConstraints.push(limit(pageSize));

    const q = query(postsRef, ...feedQueryConstraints);

    try {
        const querySnapshot = await getDocs(q);

        // Client-side filtering for status and privacy.
        let posts = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Post))
            .filter(post => 
                post.status === 'approved' && // Must be approved
                (post.privacy !== 'only_me' || post.authorId === userId) // Must not be 'only_me' unless it's user's own post
            );

        const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
        const hasMore = querySnapshot.docs.length === pageSize;

        return { posts, lastVisible: newLastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching feed posts:", error);
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
