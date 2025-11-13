
'use client';

import { 
  getAuth,
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile 
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
  deleteDoc
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';

const { auth, firestore } = initializeFirebase();

// ✅ إنشاء ملف تعريف مستخدم جديد
const createUserProfile = async (user, username, fullName, avatarUrl) => {
  try {
    await setDoc(doc(firestore, "users", user.uid), {
      id: user.uid,
      username: username,
      name: fullName,
      email: user.email,
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
const getCurrentUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log("No user logged in");
    return null;
  }

  try {
    const docRef = doc(firestore, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
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
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("username", "==", username));
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
      console.log("User not found!");
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
    const targetUserDoc = await getUserById(targetUserId);
    const currentUserDoc = await getUserById(currentUser.uid);
    
    // Add to current user's following list
    const currentUserRef = doc(firestore, "users", currentUser.uid);
    batch.update(currentUserRef, {
        following: [...(currentUserDoc.following || []), targetUserId]
    });
    
    // Add to target user's followers list
    const targetUserRef = doc(firestore, "users", targetUserId);
    batch.update(targetUserRef, {
        followers: [...(targetUserDoc.followers || []), currentUser.uid]
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
    const targetUserDoc = await getUserById(targetUserId);
    const currentUserDoc = await getUserById(currentUser.uid);

    // Remove from current user's following list
    const currentUserRef = doc(firestore, "users", currentUser.uid);
    batch.update(currentUserRef, {
        following: (currentUserDoc.following || []).filter(id => id !== targetUserId)
    });

    // Remove from target user's followers list
    const targetUserRef = doc(firestore, "users", targetUserId);
     batch.update(targetUserRef, {
        followers: (targetUserDoc.followers || []).filter(id => id !== currentUser.uid)
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
    const userDoc = await getUserById(currentUser.uid);
    return (userDoc.following || []).includes(targetUserId);
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

// ✅ جلب جميع المستخدمين
const getAllUsers = async () => {
  try {
    const usersRef = collection(firestore, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// ✅ جلب المتابِعين
const getFollowers = async (userId) => {
  try {
    const userDoc = await getUserById(userId);
    const followerIds = userDoc.followers || [];
    const followers = [];
    for (const id of followerIds) {
        const followerData = await getUserById(id);
        if(followerData) followers.push(followerData);
    }
    return followers;
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
};

// ✅ جلب المتابَعين
const getFollowing = async (userId) => {
  try {
    const userDoc = await getUserById(userId);
    const followingIds = userDoc.following || [];
    const following = [];
    for (const id of followingIds) {
        const followingData = await getUserById(id);
        if(followingData) following.push(followingData);
    }
    return following;
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
  getAllUsers,
  getFollowers,
  getFollowing
};
