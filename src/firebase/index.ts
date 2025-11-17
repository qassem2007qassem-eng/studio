import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// This structure holds the singleton instances of the Firebase services.
let firebaseServices: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
} | null = null;

// IMPORTANT: This function now implements a singleton pattern.
export function initializeFirebase() {
  // If the services have already been initialized, return the existing instances.
  if (firebaseServices) {
    return firebaseServices;
  }

  // If no app has been initialized, initialize a new one.
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    firebaseServices = getSdks(firebaseApp);
  } else {
    // If an app is already initialized (e.g., on the client), get it and create the services.
    const firebaseApp = getApp();
    firebaseServices = getSdks(firebaseApp);
  }
  
  return firebaseServices;
}

// This helper function remains the same.
export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);
  
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';