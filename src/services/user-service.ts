

'use client';

import { 
  type User as AuthUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser as deleteAuthUser,
} from 'firebase/auth';
import { 
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
  collectionGroup,
  Timestamp
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type User, type Teacher } from '@/lib/types';
import { deletePost } from './post-service';
import { createNotification } from './notification-service';

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
  const { auth, firestore } = initializeFirebase();
  if (options.email) {
    const userByEmail = getUserByEmail(options.email);
    if (userByEmail) return userByEmail;
  }
  
  const targetUserId = options.userId || auth.currentUser?.uid;
  if (!targetUserId) {
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

const createUserProfile = async (
  user: AuthUser, 
  details: Pick<User, 'username' | 'name' | 'email' | 'emailVerified' | 'accountType'>
): Promise<void> => {
  const { firestore } = initializeFirebase();
  try {
    const userDocRef = doc(firestore, "users", user.uid);
    const userData: Omit<User, 'id'> & { createdAt: any } = {
      username: details.username.toLowerCase(),
      name: details.name,
      email: details.email,
      emailVerified: details.emailVerified,
      accountType: details.accountType,
      bio: "",
      createdAt: serverTimestamp(),
      followers: [],
      following: [],
      isPrivate: false,
      isVerified: false,
    };
    
    await setDoc(userDocRef, userData);
    
    await updateDoc(userDocRef, { id: user.uid });

  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};


const getUserByUsername = async (username: string): Promise<User | null> => {
  const { firestore } = initializeFirebase();
  if (!username) return null;
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user by username:", error);
    return null;
  }
};

const getUserByEmail = async (email: string): Promise<User | null> => {
  const { firestore } = initializeFirebase();
  if (!email) return null;
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
};


const getUserById = async (userId: string): Promise<User | null> => {
  const { firestore } = initializeFirebase();
  try {
    const docRef = doc(firestore, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

const getTeacherById = async (teacherId: string): Promise<User | null> => {
  try {
    const userDoc = await getUserById(teacherId);
    if (userDoc && userDoc.accountType === 'teacher') {
       return userDoc;
    }
    return null;
  } catch (error) {
    console.error("Error getting teacher:", error);
    return null;
  }
};


const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  const { firestore } = initializeFirebase();
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

const getTeachersByIds = async (teacherIds: string[]): Promise<User[]> => {
  if (teacherIds.length === 0) {
    return [];
  }
  try {
    const usersData = await getUsersByIds(teacherIds);
    return usersData.filter(user => user.accountType === 'teacher');
  } catch (error) {
    console.error("Error getting teachers by IDs:", error);
    return [];
  }
};


const followUser = async (targetUserId: string): Promise<void> => {
    const { auth, firestore } = initializeFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No user is logged in.");
    }
    if (currentUser.uid === targetUserId) {
        throw new Error("User cannot follow themselves.");
    }

    const [profile, targetUser] = await Promise.all([
      getCurrentUserProfile(),
      getUserById(targetUserId),
    ]);

    if (!profile || !targetUser) {
        throw new Error("Could not find user profiles.");
    }

    if (targetUser.isPrivate) {
      // It's a private account, send a follow request instead
      await createNotification({
        userId: targetUserId,
        type: 'follow_request',
        relatedEntityId: currentUser.uid,
        fromUser: {
            id: currentUser.uid,
            name: profile.name,
            username: profile.username,
        },
        content: `طلب متابعتك.`,
      });
      return; // End execution here
    }

    const batch = writeBatch(firestore);

    const currentUserRef = doc(firestore, "users", currentUser.uid);
    const targetUserRef = doc(firestore, "users", targetUserId);

    batch.update(currentUserRef, {
      following: arrayUnion(targetUserId)
    });

    batch.update(targetUserRef, {
      followers: arrayUnion(currentUser.uid)
    });

    await batch.commit();

    await createNotification({
        userId: targetUserId,
        type: 'follow',
        relatedEntityId: currentUser.uid,
        fromUser: {
            id: currentUser.uid,
            name: profile.name,
            username: profile.username,
        },
        content: `بدأ بمتابعتك.`,
    });

    await getCurrentUserProfile({ forceRefresh: true });
};


const unfollowUser = async (targetUserId: string): Promise<void> => {
    const { auth, firestore } = initializeFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("No user is logged in.");
    }

    const batch = writeBatch(firestore);

    const currentUserRef = doc(firestore, "users", currentUser.uid);
    const targetUserRef = doc(firestore, "users", targetUserId);

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

const updateProfile = async (
    userId: string,
    updates: Partial<User>
): Promise<void> => {
  const { firestore } = initializeFirebase();
  if (!userId) {
    throw new Error('User not authenticated for profile update.');
  }

  try {
    if (Object.keys(updates).length > 0) {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, updates);
    }
    
    await getCurrentUserProfile({ forceRefresh: true, userId: userId });

  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

const getUsers = async (pageSize = 20, lastVisible: any = null, includeIds: string[] = [], excludeIds: string[] = [], teachersOnly = false) => {
  const { firestore } = initializeFirebase();
  try {
    const usersRef = collection(firestore, "users");
    let queryConstraints: any[] = [];

    if (includeIds.length > 0) {
      queryConstraints.push(where('id', 'in', includeIds));
    }
    
    if (teachersOnly) {
       queryConstraints.push(where('accountType', '==', 'teacher'));
    }

    if (!includeIds.length) {
       queryConstraints.push(orderBy("createdAt", "desc"));
       if (lastVisible) {
          queryConstraints.push(startAfter(lastVisible));
       }
    }
    
    queryConstraints.push(limit(pageSize));
    
    const q = query(usersRef, ...queryConstraints);


    const querySnapshot = await getDocs(q);
    let users: User[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
    });

    if (excludeIds.length > 0) {
      const excludeSet = new Set(excludeIds);
      users = users.filter(u => !excludeSet.has(u.id));
    }

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageSize;

    return { users, lastVisible: newLastVisible, hasMore };
  } catch (error) {
    console.error("Error getting users:", error);
    return { users: [], lastVisible: null, hasMore: false };
  }
};

const deleteUserAndContent = async (userId: string) => {
    const { firestore } = initializeFirebase();
    
    const batch = writeBatch(firestore);

    // 1. Delete all posts by the user
    const postsQuery = query(collection(firestore, 'posts'), where('authorId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);
    for (const postDoc of postsSnapshot.docs) {
      await deletePost(postDoc.id, true);
    }
    
    // 2. Delete all comments by the user (using collectionGroup query)
    const commentsQuery = query(collectionGroup(firestore, 'comments'), where('authorId', '==', userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    commentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));
    
    // 2.5 Delete all lesson comments by the user
    const lessonCommentsQuery = query(collectionGroup(firestore, 'comments'), where('authorId', '==', userId));
    const lessonCommentsSnapshot = await getDocs(lessonCommentsQuery);
    lessonCommentsSnapshot.forEach(commentDoc => batch.delete(commentDoc.ref));


    // 3. Remove user from other users' followers/following lists
    const allUsersRef = collection(firestore, "users");
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
    const userRef = doc(firestore, "users", userId);
    batch.delete(userRef);

    // 5. Commit all batched writes
    await batch.commit();

    console.log(`Successfully deleted all Firestore data for user ${userId}.`);
};


const getFollowers = async (userId: string) => {
  try {
    const userDoc = await getUserById(userId);
    if (!userDoc || !userDoc.followers) return [];

    const followerPromises = userDoc.followers.map(id => getUserById(id));
    const followers = await Promise.all(followerPromises);
    
    return followers.filter(Boolean) as User[];
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

    return following.filter(Boolean) as User[];
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
};

const respondToFollowRequest = async (notificationId: string, requesterId: string, action: 'accept' | 'decline') => {
  const { auth, firestore } = initializeFirebase();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const batch = writeBatch(firestore);

  // Delete the notification regardless of action
  const notificationRef = doc(firestore, `users/${currentUser.uid}/notifications`, notificationId);
  batch.delete(notificationRef);

  if (action === 'accept') {
    const currentUserRef = doc(firestore, "users", currentUser.uid);
    const requesterUserRef = doc(firestore, "users", requesterId);

    // Add requester to current user's followers
    batch.update(currentUserRef, {
      followers: arrayUnion(requesterId)
    });

    // Add current user to requester's following
    batch.update(requesterUserRef, {
      following: arrayUnion(currentUser.uid)
    });
  }
  
  await batch.commit();
  await getCurrentUserProfile({ forceRefresh: true });
};

const approveVerificationRequest = async (userId: string, reportId: string) => {
  const { auth, firestore } = initializeFirebase();
  const adminUser = auth.currentUser;
  if (!adminUser || adminUser.email !== 'admin@app.com') {
      throw new Error("Only admins can approve verification requests.");
  }

  const batch = writeBatch(firestore);

  // Mark the user as verified
  const userRef = doc(firestore, "users", userId);
  batch.update(userRef, { isVerified: true });

  // Mark the report as resolved
  const reportRef = doc(firestore, "reports", reportId);
  batch.update(reportRef, { status: 'resolved' });

  await batch.commit();
};

const deleteCurrentUserAccount = async (password: string): Promise<void> => {
    const { auth } = initializeFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("User not authenticated or email is missing.");
    }
    
    // 1. Re-authenticate the user
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    
    // 2. Delete all user content from Firestore
    await deleteUserAndContent(currentUser.uid);

    // 3. Delete the user from Firebase Authentication
    await deleteAuthUser(currentUser);
    
    // 4. Clear local cache
    currentUserProfileCache = null;
    cacheTimestamp = null;
};


export {
  createUserProfile,
  getCurrentUserProfile,
  getUserByUsername,
  getUserById,
  getUsersByIds,
  getTeachersByIds,
  followUser,
  unfollowUser,
  checkIfFollowing,
  updateProfile,
  getUsers,
  getFollowers,
  getFollowing,
  deleteUserAndContent,
  deleteCurrentUserAccount,
  getUserByEmail,
  respondToFollowRequest,
  approveVerificationRequest,
  getTeacherById,
};
