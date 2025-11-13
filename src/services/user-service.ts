
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
  startAfter
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';
import { type User } from '@/lib/types';

// Initialize firebase services
const { auth, firestore } = initializeFirebase();

// ✅ إنشاء ملف تعريف مستخدم جديد
const createUserProfile = async (user, username, fullName, avatarUrl) => {
  try {
    const userDocRef = doc(firestore, "users", user.uid);
    await setDoc(userDocRef, {
      id: user.uid,
      username: username.toLowerCase(),
      name: fullName,
      email: user.email, // This should be the unique one with timestamp
      avatarUrl: avatarUrl || `https://i.pravatar.cc/150?u=${user.uid}`,
      coverUrl: `https://picsum.photos/seed/${user.uid}/1080/400`,
      bio: "",
      createdAt: serverTimestamp(),
      followers: [],
      following: []
    });
    console.log("User profile created successfully!");
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
};

// ✅ جلب بيانات المستخدم الحالي
const getCurrentUserProfile = async (): Promise<User | null> => {
  const user = auth.currentUser;
  if (!user) {
    console.log("No user logged in");
    return null;
  }

  try {
    const docRef = doc(firestore, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      console.log("User profile not found!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
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
const followUser = async (targetUserId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in");
    return;
  }

  try {
    const batch = writeBatch(firestore);
    
    // Add to current user's following list
    const currentUserRef = doc(firestore, "users", currentUser.uid);
    batch.update(currentUserRef, {
        following: arrayUnion(targetUserId)
    });
    
    // Add to target user's followers list
    const targetUserRef = doc(firestore, "users", targetUserId);
    batch.update(targetUserRef, {
        followers: arrayUnion(currentUser.uid)
    });
    
    await batch.commit();
    console.log("Followed user successfully!");
  } catch (error) {
    console.error("Error following user:", error);
  }
};

// ✅ إلغاء المتابعة
const unfollowUser = async (targetUserId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in");
    return;
  }

  try {
    const batch = writeBatch(firestore);

    // Remove from current user's following list
    const currentUserRef = doc(firestore, "users", currentUser.uid);
    batch.update(currentUserRef, {
        following: arrayRemove(targetUserId)
    });

    // Remove from target user's followers list
    const targetUserRef = doc(firestore, "users", targetUserId);
     batch.update(targetUserRef, {
        followers: arrayRemove(currentUser.uid)
    });
    
    await batch.commit();
    console.log("Unfollowed user successfully!");
  } catch (error) {
    console.error("Error unfollowing user:", error);
  }
};

// ✅ التحقق إذا كان يتابع مستخدم
const checkIfFollowing = async (targetUserId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const userDoc = await getCurrentUserProfile();
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
  } catch (error) {
    console.error("Error updating profile:", error);
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
