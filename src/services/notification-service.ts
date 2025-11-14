
'use client';

import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type AppNotification } from '@/lib/types';

const { firestore } = initializeFirebase();

type CreateNotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>;

export const createNotification = async (input: CreateNotificationInput): Promise<string | null> => {
  // Prevent self-notification
  if (input.userId === input.fromUser.id) {
    return null;
  }
  
  try {
    const notificationsCollection = collection(firestore, `users/${input.userId}/notifications`);
    
    const notificationData = {
      ...input,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(notificationsCollection, notificationData);
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    // You might want to throw the error or handle it as needed
    // For now, returning null to indicate failure.
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


export const deleteNotification = async (userId: string, notificationId: string): Promise<void> => {
  if (!userId || !notificationId) {
    throw new Error("User ID and Notification ID are required.");
  }

  try {
    const notificationRef = doc(firestore, `users/${userId}/notifications`, notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
