import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Hook for progressive authentication — delays login until the user
 * actually needs to persist data.  Call `requireAuth(action)` before
 * any save / API call.  If the user is already logged in the action
 * runs immediately; otherwise a login dialog is shown and the action
 * is replayed on success.
 */
export function useRequireAuth() {
  const { isSignedIn } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const requireAuth = useCallback((action: () => void): void => {
    if (isSignedIn) {
      action();
    } else {
      pendingAction.current = action;
      setIsLoginOpen(true);
    }
  }, [isSignedIn]);

  const handleLoginSuccess = useCallback((): void => {
    setIsLoginOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action();
  }, []);

  const handleLoginClose = useCallback((): void => {
    setIsLoginOpen(false);
  }, []);

  const isLoggedIn = useCallback((): boolean => {
    return Boolean(isSignedIn);
  }, [isSignedIn]);

  return { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose, isLoggedIn };
}
