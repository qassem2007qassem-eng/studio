'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useUser } from '@/firebase/provider';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx,
 * but only if the current user is an admin.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const { user } = useUser(); // Get the current user

  const isAdmin = user?.email === 'admin@app.com';

  useEffect(() => {
    // Only admins should listen for these specific errors
    if (!isAdmin) {
      return;
    }

    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [isAdmin]); // Rerun the effect if the user's admin status changes

  // On re-render, if an error exists in state AND the user is an admin, throw it.
  if (error && isAdmin) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
