
'use client';

import {
  ref,
  uploadString,
  getDownloadURL,
  type UploadTask,
  type StringFormat,
} from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

const { storage } = initializeFirebase();

type ProgressCallback = (progress: number, status: 'uploading' | 'completed' | 'error') => void;

/**
 * A centralized and robust function for uploading files to Firebase Storage using Base64 data URIs.
 * @param base64String The Base64 data URI of the file to upload.
 * @param path The desired path in Firebase Storage (e.g., 'avatars/user-id.jpg').
 * @param onProgress Optional callback to track upload progress (note: not directly supported by uploadString, so we simulate).
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = (
  base64String: string,
  path: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    if (!base64String) {
      return reject(new Error('No Base64 string provided for upload.'));
    }

    try {
      const fileRef = ref(storage, path);
      onProgress?.(50, 'uploading'); // Simulate progress since uploadString doesn't provide it

      // uploadString is used for data URIs
      const snapshot = await uploadString(fileRef, base64String, 'data_url');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      onProgress?.(100, 'completed');
      resolve(downloadURL);
    } catch (error: any) {
      console.error(`Upload failed for path ${path}:`, error);
      onProgress?.(0, 'error');
      reject(new Error(`Failed to upload file. Code: ${error.code}`));
    }
  });
};
