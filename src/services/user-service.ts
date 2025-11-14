
'use client';

import { 
  getAuth
} from 'firebase/auth';
import { 
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  writeBatch, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
  startAfter,
  deleteDoc,
  collectionGroup
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';
import { type User } from '@/lib/types';
import { deletePost } from './post-service';

const { auth, firestore } = initializeFirebase();


let currentUserProfileCache: User | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

type GetProfileOptions = {
  forceRefresh?: boolean;
  userId?: string;
  email?: string;
};

const getCurrentUserProfile = async (options: GetProfileOptions = {}): Promise<User | null> => {
  if (options.email) {
    const userByEmail = await getUserByEmail(options.email);
    if (userByEmail) return userByEmail;
  }
  
  const targetUserId = options.userId || auth.currentUser?.uid;
  if (!targetUserId) {
    console.log("No user ID provided or user not logged in");
    if (!options.userId) {
        currentUserProfileCache = null;
    }
    return null;
  }

  if (targetUserId === auth.currentUser?.uid) {
    const now = Date.now();
    if (!options.forceRefresh && currentUserProfileCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      return currentUserProfileCache;
    }
  }

  try {
    const docRef = doc(firestore, "users", targetUserId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userProfile = { id: docSnap.id, ...docSnap.data() } as User;
      if (targetUserId === auth.currentUser?.uid) {
        currentUserProfileCache = userProfile;
        cacheTimestamp = Date.now();
      }
      return userProfile;
    } else {
      console.log("User profile not found!");
      if (targetUserId === auth.currentUser?.uid) {
        currentUserProfileCache = null;
      }
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    if (targetUserId === auth.currentUser?.uid) {
        currentUserProfileCache = null; 
    }
    return null;
  }
};


const createUserProfile = async (user: any, username: string, fullName: string, avatarUrl: string | null) => {
  try {
    const userDocRef = doc(firestore, "users", user.uid);
    await setDoc(userDocRef, {
      id: user.uid,
      username: username.toLowerCase(),
      name: fullName,
      email: user.email, 
      avatarUrl: avatarUrl || "",
      coverUrl: "",
      bio: "",
      createdAt: serverTimestamp(),
      followers: [],
      following: [],
      isPrivate: false,
      emailVerified: false
    });
    console.log("User profile created successfully!");
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
};


const getUserByUsername = async (username: string): Promise<User | null> => {
  if (!username) return null;
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } else {
      console.log("User not found!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
};

const getUserByEmail = async (email: string): Promise<User | null> => {
  if (!email) return null;
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } else {
      console.log("User not found by email!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
};


const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const docRef = doc(firestore, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      console.log("User not found by ID!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};


const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (userIds.length === 0) {
    return [];
  }
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('id', 'in', userIds));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error getting users by IDs:", error);
    return [];
  }
};


const followUser = async (targetUserId: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No user is logged in.");
    }
    if (currentUser.uid === targetUserId) {
        throw new Error("User cannot follow themselves.");
    }

    const db = getFirestore();
    const batch = writeBatch(db);

    const currentUserRef = doc(db, "users", currentUser.uid);
    const targetUserRef = doc(db, "users", targetUserId);

    batch.update(currentUserRef, {
      following: arrayUnion(targetUserId)
    });

    batch.update(targetUserRef, {
      followers: arrayUnion(currentUser.uid)
    });

    await batch.commit();
    await getCurrentUserProfile({ forceRefresh: true });
};


const unfollowUser = async (targetUserId: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("No user is logged in.");
    }

    const db = getFirestore();
    const batch = writeBatch(db);

    const currentUserRef = doc(db, "users", currentUser.uid);
    const targetUserRef = doc(db, "users", targetUserId);

    batch.update(currentUserRef, {
        following: arrayRemove(targetUserId)
    });

    batch.update(targetUserRef, {
        followers: arrayRemove(currentUser.uid)
    });

    await batch.commit();
    await getCurrentUserProfile({ forceRefresh: true });
};


const checkIfFollowing = async (targetUserId: string, options: GetProfileOptions = {}): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const userDoc = await getCurrentUserProfile(options); 
    return (userDoc?.following || []).includes(targetUserId);
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

const updateProfile = async (updates: Partial<User>) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(firestore, "users", user.uid);
    await updateDoc(userRef, updates);
    console.log("Profile updated successfully!");
    await getCurrentUserProfile({ forceRefresh: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

const getUsers = async (pageSize = 20, lastVisible: any = null) => {
  try {
    const usersRef = collection(firestore, "users");
    let q;
    if (lastVisible) {
      q = query(usersRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(pageSize));
    } else {
      q = query(usersRef, orderBy("createdAt", "desc"), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageSize;

    return { users, lastVisible: newLastVisible, hasMore };
  } catch (error) {
    console.error("Error getting users:", error);
    return { users: [], lastVisible: null, hasMore: false };
  }
};

const deleteUserAndContent = async (userId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.email !== 'admin@app.com') {
      throw new Error("Only admins can delete users.");
    }
    if (currentUser.uid === userId) {
      throw new Error("Admin cannot delete their own account.");
    }
    
    const db = getFirestore();
    const batch = writeBatch(db);

    // 1. Delete all posts by the user
    const postsQuery = query(collection(db, 'posts'), where('authorId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);
    for (const postDoc of postsSnapshot.docs) {
      // Must use the deletePost service to also delete images from storage
      await deletePost(postDoc.id, postDoc.data().imageUrls || [], true);
    }
    
    // 2. Delete all comments by the user (using collectionGroup query)
    const commentsQuery = query(collectionGroup(db, 'comments'), where('authorId', '==', userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));

    // 3. Remove user from other users' followers/following lists
    const allUsersRef = collection(db, "users");
    const allUsersSnap = await getDocs(allUsersRef);
    allUsersSnap.forEach(userDoc => {
        const data = userDoc.data();
        if (data.followers?.includes(userId)) {
            batch.update(userDoc.ref, { followers: arrayRemove(userId) });
        }
        if (data.following?.includes(userId)) {
            batch.update(userDoc.ref, { following: arrayRemove(userId) });
        }
    });

    // 4. Delete the user document itself
    const userRef = doc(db, "users", userId);
    batch.delete(userRef);

    // 5. Commit all batched writes
    await batch.commit();

    // Note: Deleting the Firebase Auth user record requires the Admin SDK
    // and cannot be done from the client-side. This function only deletes Firestore data.
    console.log(`Successfully deleted all Firestore data for user ${userId}. Auth record must be deleted manually.`);
};


const getFollowers = async (userId: string) => {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc || !userDoc.followers) return [];

    const followerPromises = userDoc.followers.map(id => getUserById(id));
    const followers = await Promise.all(followerPromises);
    
    return followers.filter(Boolean);
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
};

const getFollowing = async (userId: string) => {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc || !userDoc.following) return [];

    const followingPromises = userDoc.following.map(id => getUserById(id));
    const following = await Promise.all(followingPromises);

    return following.filter(Boolean);
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
};

const markEmailAsVerified = async (email: string) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('User not found.');
  }

  const userRef = doc(firestore, 'users', user.id);
  await updateDoc(userRef, { emailVerified: true });
  await getCurrentUserProfile({ forceRefresh: true, userId: user.id });
  return true;
}


export {
  createUserProfile,
  getCurrentUserProfile,
  getUserByUsername,
  getUserById,
  getUsersByIds,
  followUser,
  unfollowUser,
  checkIfFollowing,
  updateProfile,
  getUsers,
  getFollowers,
  getFollowing,
  deleteUserAndContent,
  markEmailAsVerified,
  getUserByEmail
};

    