
'use client';

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc
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


export const getReports = async (status: 'pending' | 'resolved' | 'dismissed' = 'pending'): Promise<Report[]> => {
    const { firestore } = initializeFirebase();
    const reportsCollection = collection(firestore, 'reports');
    const q = query(reportsCollection, where('status', '==', status));
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
    } catch (e) {
        console.error("Error fetching reports:", e);
        return [];
    }
};

export const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed' | 'deleted') => {
    const { firestore } = initializeFirebase();
    const reportRef = doc(firestore, 'reports', reportId);
    await updateDoc(reportRef, { status });
}
