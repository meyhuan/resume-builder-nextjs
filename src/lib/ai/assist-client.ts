'use client';

import { getCookie } from 'cookies-next';
import { track } from '@/lib/analytics';
import { useAuthStore } from '@/store/use-auth-store';
import { useVipStore } from '@/store/use-vip-store';

export type AiAssistFeature =
  | 'chat'
  | 'jd-analysis'
  | 'translate'
  | 'cover-letter'
  | 'interview-prep'
  | 'grammar-check';

export function trackAssistStart(feature: AiAssistFeature): void {
  track('ai_assist_start', { feature });
}

export function trackAssistSuccess(feature: AiAssistFeature): void {
  track('ai_assist_success', { feature });
}

export function trackAssistFailed(feature: AiAssistFeature, error?: string): void {
  track('ai_assist_failed', { feature, error: error || '' });
}

export function trackAssistBlocked(feature: AiAssistFeature): void {
  track('ai_assist_blocked_by_quota', { feature });
}

export function refreshEditorAssistQuota(): void {
  const storeToken = useAuthStore.getState().token;
  const cookieToken = typeof window === 'undefined' ? undefined : getCookie('auth_uid');
  const token = storeToken || (typeof cookieToken === 'string' ? cookieToken : null);
  void useVipStore.getState().refreshQuota(token);
}

export function parseAssistErrorPayload(data: unknown): {
  quotaExceeded: boolean;
  error?: string;
} {
  if (!data || typeof data !== 'object') return { quotaExceeded: false };
  const record = data as Record<string, unknown>;
  return {
    quotaExceeded: record.quotaExceeded === true,
    error: typeof record.error === 'string' ? record.error : undefined,
  };
}

/** Opens the VIP dialog for depleted quota. Returns true if this was a quota block. */
export function handleAssistQuotaError(
  feature: AiAssistFeature,
  payload: { quotaExceeded?: boolean; error?: string },
): boolean {
  if (!payload.quotaExceeded || payload.error === '请先登录') return false;
  useVipStore.getState().setShowUpgrade(true, 'ai');
  trackAssistBlocked(feature);
  return true;
}
