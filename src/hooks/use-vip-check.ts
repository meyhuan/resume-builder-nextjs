'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

interface QuotaStatus {
  ai: { allowed: boolean; remaining: number | 'unlimited'; isVip: boolean };
  pdf: { allowed: boolean; remaining: number | 'unlimited'; isVip: boolean };
}

/**
 * Hook that syncs VIP status and quota from backend.
 * Returns { isVip, isLoading, refreshVip, refreshQuota, quota, requireVip, requireAi, requirePdf, showUpgrade, setShowUpgrade }.
 */
export const useVipCheck = () => {
  const { token, userInfo, updateVipStatus } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);
  const [quota, setQuota] = useState<QuotaStatus>({
    ai: { allowed: true, remaining: 3, isVip: false },
    pdf: { allowed: true, remaining: 1, isVip: false },
  });

  const refreshQuota = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const res = await fetch('/next-api/quota');
      if (!res.ok) return;
      const data = await res.json();
      setQuota({
        ai: {
          allowed: data.ai.allowed,
          remaining: data.ai.remaining,
          isVip: data.ai.isVip,
        },
        pdf: {
          allowed: data.pdf.allowed,
          remaining: data.pdf.remaining,
          isVip: data.pdf.isVip,
        },
      });
    } catch {
      // silent fail
    }
  }, [token]);

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
      // Also refresh quota after VIP update
      await refreshQuota();
    } catch {
      // silent fail — VIP check is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [token, updateVipStatus, refreshQuota]);

  useEffect(() => {
    refreshVip();
  }, [refreshVip]);

  const isVip = userInfo?.vip?.isVip ?? false;

  /**
   * Legacy: Check if user is VIP.
   * Returns true if VIP, false and opens upgrade dialog if not.
   */
  const requireVip = useCallback((): boolean => {
    if (isVip) return true;
    setShowUpgrade(true);
    return false;
  }, [isVip]);

  /**
   * Check AI quota.
   * Returns true if allowed (VIP or has quota), false and opens upgrade dialog if not.
   */
  const requireAi = useCallback((): boolean => {
    if (quota.ai.isVip || quota.ai.allowed) return true;
    setShowUpgrade(true);
    return false;
  }, [quota.ai]);

  /**
   * Check PDF quota.
   * Returns true if allowed (VIP or has quota), false and opens upgrade dialog if not.
   */
  const requirePdf = useCallback((): boolean => {
    if (quota.pdf.isVip || quota.pdf.allowed) return true;
    setShowUpgrade(true);
    return false;
  }, [quota.pdf]);

  return {
    isVip,
    isLoading,
    refreshVip,
    refreshQuota,
    quota,
    requireVip,
    requireAi,
    requirePdf,
    showUpgrade,
    setShowUpgrade,
  };
};
