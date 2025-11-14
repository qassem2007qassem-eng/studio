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
  const { user, isUserLoading } = useUser();
  const [errorToThrow, setErrorToThrow] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    // Determine if the listener should be active.
    // We wait until the user loading is complete.
    if (isUserLoading) {
      return;
    }

    const isAdmin = user?.email === 'admin@app.com';

    // If the user is not an admin, we do nothing.
    if (!isAdmin) {
      return;
    }

    // If the user is an admin, we set up the listener.
    const handleError = (error: FirestorePermissionError) => {
      setErrorToThrow(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [user, isUserLoading]); // Rerun when user or loading state changes.

  // If there's an error to throw (and this component is active for an admin), throw it.
  if (errorToThrow) {
    throw errorToThrow;
  }

  // This component renders nothing.
  return null;
}
