'use client';

import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query, 
  where,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { initializeFirebase, useUser } from '@/firebase';
import { type Lesson, type LessonComment } from '@/lib/types';
import { getCurrentUserProfile } from './user-service';
import { safeToDate } from '@/lib/utils';

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const { firestore } = initializeFirebase();
  try {
    const lessonRef = doc(firestore, 'lessons', lessonId);
    const lessonSnap = await getDoc(lessonRef);

    if (lessonSnap.exists()) {
      // Increment view count
      await updateDoc(lessonRef, { views: increment(1) });
      return { id: lessonSnap.id, ...lessonSnap.data() } as Lesson;
    }
    return null;
  } catch (error) {
    console.error("Error getting lesson by ID:", error);
    return null;
  }
}

export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const { firestore } = initializeFirebase();
  try {
    const lessonsQuery = query(collection(firestore, 'lessons'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(lessonsQuery);
    
    const lessons = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
    
    // Client-side sorting to avoid composite index
    lessons.sort((a, b) => {
        const dateA = safeToDate(a.createdAt)?.getTime() || 0;
        const dateB = safeToDate(b.createdAt)?.getTime() || 0;
        return dateA - dateB; // Ascending order for lessons in a course
    });
    
    return lessons;
  } catch (error) {
    console.error("Error getting lessons by course ID:", error);
    return [];
  }
}

export async function toggleLikeLesson(lessonId: string, isLiked: boolean): Promise<void> {
    const { auth, firestore } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    const lessonRef = doc(firestore, 'lessons', lessonId);
    
    try {
        if (isLiked) {
             await updateDoc(lessonRef, {
                likes: arrayUnion(user.uid)
            });
        } else {
             await updateDoc(lessonRef, {
                likes: arrayRemove(user.uid)
            });
        }
    } catch(error) {
        console.error("Error toggling like on lesson:", error);
        throw error;
    }
}

export async function addCommentToLesson(lessonId: string, content: string): Promise<string> {
    const { auth, firestore } = initializeFirebase();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");

    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("User profile not found.");

    const commentsCollectionRef = collection(firestore, `lessons/${lessonId}/comments`);

    const commentData: Omit<LessonComment, 'id' | 'createdAt'> & { createdAt: any } = {
        lessonId,
        authorId: user.uid,
        content,
        author: {
            name: profile.name,
            username: profile.username,
        },
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(commentsCollectionRef, commentData);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
}
