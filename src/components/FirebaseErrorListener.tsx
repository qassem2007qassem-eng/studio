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
  const { user, isUserLoading } = useUser(); // Get the current user

  // This check is crucial. We wait until we know who the user is.
  if (isUserLoading) {
    return null;
  }

  // Early exit for non-admins or logged-out users.
  // This ensures the rest of the component (including useEffect) doesn't run for them.
  const isAdmin = user?.email === 'admin@app.com';
  if (!isAdmin) {
    return null;
  }

  useEffect(() => {
    // Because of the check above, this effect only runs for admins.
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []); // No dependency on isAdmin needed due to the early exit.

  // On re-render, if an error exists in state, throw it.
  // This will only happen if the user is an admin.
  if (error) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
