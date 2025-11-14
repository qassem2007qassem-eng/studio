'use client';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

const { storage } = initializeFirebase();

export type ProgressCallback = (progress: number, status: 'uploading' | 'completed' | 'error') => void;

/**
 * A centralized and robust function for uploading files to Firebase Storage.
 * It uses 'uploadBytesResumable' to provide progress feedback.
 * @param file The File object to upload.
 * @param path The desired path in Firebase Storage (e.g., 'avatars/user-id.jpg').
 * @param onProgress Optional callback to track upload progress.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = (
  file: File,
  path: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for upload.'));
    }

    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        // Calculate progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress, 'uploading');
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error(`Upload failed for path ${path}:`, error);
        onProgress?.(0, 'error');
        reject(new Error(`Failed to upload file. Code: ${error.code}`));
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.(100, 'completed');
          resolve(downloadURL);
        } catch (error: any) {
            console.error(`Failed to get download URL for ${path}:`, error);
            onProgress?.(0, 'error');
            reject(new Error(`Upload succeeded, but failed to get download URL. Code: ${error.code}`));
        }
      }
    );
  });
};
