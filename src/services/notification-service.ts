
'use client';

import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type AppNotification } from '@/lib/types';

const { firestore } = initializeFirebase();

type CreateNotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>;

export const createNotification = async (input: CreateNotificationInput): Promise<string | null> => {
  try {
    const notificationsCollection = collection(firestore, `users/${input.userId}/notifications`);
    
    const notificationData = {
      ...input,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsCollection, notificationData);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};


export const markNotificationsAsRead = async (userId: string, notificationIds: string[]): Promise<void> => {
  if (!userId || notificationIds.length === 0) return;

  const batch = writeBatch(firestore);
  
  notificationIds.forEach(id => {
    const notifRef = doc(firestore, `users/${userId}/notifications`, id);
    batch.update(notifRef, { isRead: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Error marking notifications as read:", error);
  }
};
