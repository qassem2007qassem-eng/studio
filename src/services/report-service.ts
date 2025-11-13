
'use client';

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { type Report } from '@/lib/types';

const { auth } = initializeFirebase();

type CreateReportInput = {
  reportedEntityId: string;
  reportedEntityType: 'post' | 'comment' | 'user';
  reason: string;
};

export const createReport = async (input: CreateReportInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { firestore } = initializeFirebase();
  
  const reportsCollection = collection(firestore, 'reports');
  
  const reportData: Omit<Report, 'id'> = {
    reporterId: user.uid,
    reportedEntityId: input.reportedEntityId,
    reportedEntityType: input.reportedEntityType,
    reason: input.reason,
    createdAt: serverTimestamp() as any,
    status: 'pending',
  };

  const docRef = await addDoc(reportsCollection, reportData);
  return docRef.id;
};
