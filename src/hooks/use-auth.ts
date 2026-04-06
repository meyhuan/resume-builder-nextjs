'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';
import { useAuthStore } from '@/store/use-auth-store';

export function useAuth() {
  const { token, userInfo, setToken, setUserInfo, logout } = useAuthStore();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkIsLoggedIn = useCallback(() => {
    const authUid = getCookie('auth_uid');
    return !!(token && authUid);
  }, [token]);

  useEffect(() => {
    setIsLoggedIn(checkIsLoggedIn());
  }, [checkIsLoggedIn]);

  const getAuthUid = useCallback(() => {
    return getCookie('auth_uid');
  }, []);

  return {
    isLoggedIn,
    token,
    userInfo,
    getAuthUid,
    setToken,
    setUserInfo,
    logout,
  };
}
