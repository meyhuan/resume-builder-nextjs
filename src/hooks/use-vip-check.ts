'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

/**
 * Hook that syncs VIP status from Java backend on mount.
 * Returns { isVip, isLoading, refreshVip, showUpgrade, setShowUpgrade }.
 */
export const useVipCheck = () => {
  const { token, userInfo, updateVipStatus } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);

  const refreshVip = useCallback(async (): Promise<void> => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/next-api/vip/poll');
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data;
      if (data) {
        updateVipStatus({
          vipStatus: data.vipStatus,
          vipType: data.vipType,
          vipExpireTime: data.vipExpireTime,
          isVip: data.isVip,
        });
      }
    } catch {
      // silent fail — VIP check is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [token, updateVipStatus]);

  useEffect(() => {
    refreshVip();
  }, [refreshVip]);

  const isVip = userInfo?.vip?.isVip ?? false;

  /**
   * Call this before a VIP-gated action.
   * Returns true if user is VIP (action can proceed).
   * Returns false and opens upgrade dialog if not VIP.
   */
  const requireVip = useCallback((): boolean => {
    if (isVip) return true;
    setShowUpgrade(true);
    return false;
  }, [isVip]);

  return { isVip, isLoading, refreshVip, requireVip, showUpgrade, setShowUpgrade };
};
