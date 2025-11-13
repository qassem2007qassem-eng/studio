
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
  getDocFromCache,
  getDocFromServer
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';
import { type User } from '@/lib/types';

// Initialize firebase services
const { auth, firestore } = initializeFirebase();


let currentUserProfileCache: User | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

type GetProfileOptions = {
  forceRefresh?: boolean;
};

// ✅ جلب بيانات المستخدم الحالي
const getCurrentUserProfile = async (options: GetProfileOptions = {}): Promise<User | null> => {
  const user = auth.currentUser;
  if (!user) {
    console.log("No user logged in");
    currentUserProfileCache = null;
    return null;
  }

  const now = Date.now();
  if (!options.forceRefresh && currentUserProfileCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return currentUserProfileCache;
  }

  try {
    const docRef = doc(firestore, "users", user.uid);
    // Use getDoc which prioritizes cache but falls back to server
    const docSnap = options.forceRefresh ? await getDocFromServer(docRef) : await getDoc(docRef);
    
    if (docSnap.exists()) {
      currentUserProfileCache = { id: docSnap.id, ...docSnap.data() } as User;
      cacheTimestamp = now;
      return currentUserProfileCache;
    } else {
      console.log("User profile not found!");
      currentUserProfileCache = null;
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    // On error, clear cache to force a retry next time
    currentUserProfileCache = null; 
    return null;
  }
};


// ✅ إنشاء ملف تعريف مستخدم جديد
const createUserProfile = async (user, username, fullName, avatarUrl) => {
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
    });
    console.log("User profile created successfully!");
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
};


// ✅ جلب بيانات مستخدم آخر بالاسم
const getUserByUsername = async (username) => {
  if (!username) return null;
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      console.log("User not found!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
};

// ✅ جلب بيانات مستخدم آخر بالـ UID
const getUserById = async (userId) => {
  try {
    const docRef = doc(firestore, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("User not found by ID!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// ✅ متابعة مستخدم
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

    // Add target to current user's following list
    batch.update(currentUserRef, {
      following: arrayUnion(targetUserId)
    });

    // Add current user to target's followers list
    batch.update(targetUserRef, {
      followers: arrayUnion(currentUser.uid)
    });

    await batch.commit();
    // Invalidate local cache after following
    await getCurrentUserProfile({ forceRefresh: true });
};


// ✅ إلغاء المتابعة
const unfollowUser = async (targetUserId: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("No user is logged in.");
    }

    const db = getFirestore();
    const batch = writeBatch(db);

    const currentUserRef = doc(db, "users", currentUser.uid);
    const targetUserRef = doc(db, "users", targetUserId);

    // Remove target from current user's following list
    batch.update(currentUserRef, {
        following: arrayRemove(targetUserId)
    });

    // Remove current user from target's followers list
    batch.update(targetUserRef, {
        followers: arrayRemove(currentUser.uid)
    });

    await batch.commit();
    // Invalidate local cache after unfollowing
    await getCurrentUserProfile({ forceRefresh: true });
};


// ✅ التحقق إذا كان يتابع مستخدم
const checkIfFollowing = async (targetUserId: string, options: GetProfileOptions = {}): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const userDoc = await getCurrentUserProfile(options); // Pass options to force refresh if needed
    return (userDoc?.following || []).includes(targetUserId);
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

// ✅ تحديث الملف الشخصي
const updateProfile = async (updates) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(firestore, "users", user.uid);
    await updateDoc(userRef, updates);
    console.log("Profile updated successfully!");
    // Invalidate cache after profile update
    await getCurrentUserProfile({ forceRefresh: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

// ✅ جلب دفعة من المستخدمين مع الترقيم
const getUsers = async (pageSize = 20, lastVisible = null) => {
  try {
    const usersRef = collection(firestore, "users");
    let q;
    if (lastVisible) {
      q = query(usersRef, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(pageSize));
    } else {
      q = query(usersRef, orderBy("createdAt", "desc"), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageSize;

    return { users, lastVisible: newLastVisible, hasMore };
  } catch (error) {
    console.error("Error getting users:", error);
    return { users: [], lastVisible: null, hasMore: false };
  }
};


// ✅ جلب المتابِعين
const getFollowers = async (userId) => {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc || !userDoc.followers) return [];

    const followerPromises = userDoc.followers.map(id => getUserById(id));
    const followers = await Promise.all(followerPromises);
    
    return followers.filter(Boolean); // Filter out any nulls
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
};

// ✅ جلب المتابَعين
const getFollowing = async (userId) => {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc || !userDoc.following) return [];

    const followingPromises = userDoc.following.map(id => getUserById(id));
    const following = await Promise.all(followingPromises);

    return following.filter(Boolean); // Filter out any nulls
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
};

// 🔥 تصدير جميع الدوال
export {
  createUserProfile,
  getCurrentUserProfile,
  getUserByUsername,
  getUserById,
  followUser,
  unfollowUser,
  checkIfFollowing,
  updateProfile,
  getUsers,
  getFollowers,
  getFollowing
};
