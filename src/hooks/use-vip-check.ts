'use client';

import { useEffect, useCallback } from 'react';
import { getCookie } from 'cookies-next';
import type { VipQuotaStatus } from '@/lib/quota/vip-types';
import { useAuthStore } from '@/store/use-auth-store';
import { useVipStore } from '@/store/use-vip-store';
import { createLogger } from '@/lib/logger';

/** Complete quota status for all features */
type QuotaStatus = VipQuotaStatus;

const log = createLogger('use-vip-check');

/**
 * Hook that syncs VIP status and quota from backend.
 * Returns { isVip, isLoading, quotaLoaded, refreshVip, refreshQuota, quota, requireVip, requireAi, requirePdf, showUpgrade, setShowUpgrade }.
 */
export const useVipCheck = () => {
  const { token, userInfo } = useAuthStore();
  const cookieToken = typeof window === 'undefined' ? undefined : getCookie('auth_uid');
  const effectiveToken = token || (typeof cookieToken === 'string' ? cookieToken : null);
  const isLoading = useVipStore((state) => state.isLoading);
  const quotaLoaded = useVipStore((state) => state.quotaLoaded);
  const quota = useVipStore((state) => state.quota);
  const showUpgrade = useVipStore((state) => state.showUpgrade);
  const setShowUpgrade = useVipStore((state) => state.setShowUpgrade);
  const initialize = useVipStore((state) => state.initialize);
  const refreshVipStore = useVipStore((state) => state.refreshVip);
  const refreshQuotaStore = useVipStore((state) => state.refreshQuota);
  const reset = useVipStore((state) => state.reset);

  const refreshVip = useCallback(async (): Promise<void> => {
    log.info('refresh VIP requested', { hasStoreToken: Boolean(token), hasCookieToken: Boolean(cookieToken) });
    await refreshVipStore(effectiveToken);
  }, [refreshVipStore, effectiveToken, token, cookieToken]);

  const refreshQuota = useCallback(async (): Promise<void> => {
    log.info('refresh quota requested', { hasStoreToken: Boolean(token), hasCookieToken: Boolean(cookieToken) });
    await refreshQuotaStore(effectiveToken);
  }, [refreshQuotaStore, effectiveToken, token, cookieToken]);

  useEffect(() => {
    log.info('initialize check', { hasStoreToken: Boolean(token), hasCookieToken: Boolean(cookieToken), hasEffectiveToken: Boolean(effectiveToken) });
    if (!effectiveToken) {
      reset();
      return;
    }
    initialize(effectiveToken);
  }, [initialize, reset, effectiveToken, token, cookieToken]);

  const isVip = userInfo?.vip?.isVip ?? false;

  /**
   * Legacy: Check if user is VIP.
   * Returns true if VIP, false and opens upgrade dialog if not.
   */
  const requireVip = useCallback((): boolean => {
    if (isVip) return true;
    setShowUpgrade(true);
    return false;
  }, [isVip, setShowUpgrade]);

  /**
   * Check specific AI feature quota.
   * Returns true if allowed (VIP or has quota), false and opens upgrade dialog if not.
   */
  const requireAiFeature = useCallback((feature: keyof QuotaStatus): boolean => {
    const featureQuota = quota[feature];
    if (featureQuota.isVip || featureQuota.allowed) return true;
    setShowUpgrade(true);
    return false;
  }, [quota, setShowUpgrade]);

  /**
   * Check if any AI feature has quota remaining (legacy support).
   * Returns true if user is VIP or has any AI quota.
   */
  const requireAi = useCallback((): boolean => {
    if (isVip) return true;
    const hasAnyQuota = Object.values(quota).some((q) => q.allowed);
    if (hasAnyQuota) return true;
    setShowUpgrade(true);
    return false;
  }, [quota, isVip, setShowUpgrade]);

  /**
   * Check PDF export quota.
   * Returns true if allowed (VIP or has quota), false and opens upgrade dialog if not.
   */
  const requirePdf = useCallback((): boolean => {
    log.info('require PDF check', { quotaLoaded, isLoading, pdfExport: quota.pdfExport });
    if (quota.pdfExport.isVip || quota.pdfExport.allowed) return true;
    setShowUpgrade(true);
    return false;
  }, [quotaLoaded, isLoading, quota.pdfExport, setShowUpgrade]);

  return {
    isVip,
    isLoading,
    quotaLoaded,
    refreshVip,
    refreshQuota,
    quota,
    requireVip,
    requireAi,
    requireAiFeature,
    requirePdf,
    showUpgrade,
    setShowUpgrade,
  };
};
