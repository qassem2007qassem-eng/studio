'use client';

import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Course } from '@/lib/types';

export async function getCoursesByIds(courseIds: string[]): Promise<Course[]> {
  const { firestore } = initializeFirebase();
  if (courseIds.length === 0) {
    return [];
  }
  try {
    const coursesRef = collection(firestore, 'courses');
    const q = query(coursesRef, where('id', 'in', courseIds));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Course);
  } catch (error) {
    console.error("Error getting courses by IDs:", error);
    return [];
  }
}
