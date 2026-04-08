/**
 * Quota tracking for VIP-gated features (AI and PDF export).
 *
 * - VIP users: unlimited access
 * - Non-VIP users: limited by daily/total quotas
 *
 * This works alongside the existing rate limiter but adds VIP awareness.
 */

import { cookies } from 'next/headers';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

/** Daily quota limits for non-VIP users. */
const QUOTA_AI_NON_VIP_DAILY = 3;
const QUOTA_PDF_NON_VIP_DAILY = 1;

/** Duration of quota window in milliseconds (24 hours). */
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface QuotaEntry {
  timestamps: number[];
}

/** In-memory quota store keyed by userId_feature. */
const quotaStore = new Map<string, QuotaEntry>();

/** Clean up expired entries periodically. */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

function cleanupQuotas(): void {
  const now = Date.now();
  for (const [key, entry] of quotaStore.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      quotaStore.delete(key);
    }
  }
}

setInterval(cleanupQuotas, CLEANUP_INTERVAL_MS);

export interface QuotaCheckResult {
  /** Whether the action is allowed. */
  readonly allowed: boolean;
  /** Whether user is VIP (unlimited). */
  readonly isVip: boolean;
  /** Number of uses in current window. */
  readonly used: number;
  /** Maximum allowed in window. */
  readonly limit: number;
  /** Remaining uses. */
  readonly remaining: number;
  /** Human-readable quota message. */
  readonly message: string;
}

/**
 * Check user's VIP status by calling the Java backend.
 */
async function checkVipStatus(): Promise<{ isVip: boolean; userId?: string }> {
  try {
    const cookieStore = await cookies();
    const cvUserId = cookieStore.get('auth_uid')?.value;
    if (!cvUserId) {
      return { isVip: false };
    }

    const response = await fetch(`${JAVA_API_BASE}/cvstore/user/${cvUserId}/vip-info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { isVip: false };
    }

    const data = await response.json();
    return {
      isVip: data.data?.isVip ?? false,
      userId: String(data.data?.userId),
    };
  } catch {
    return { isVip: false };
  }
}

/**
 * Check and consume quota for a feature.
 *
 * @param feature - 'ai' or 'pdf'
 * @param skipConsume - if true, only peek at quota without consuming
 */
export async function checkQuota(
  feature: 'ai' | 'pdf',
  skipConsume = false,
): Promise<QuotaCheckResult> {
  const { isVip, userId } = await checkVipStatus();

  // VIP users have unlimited access
  if (isVip) {
    return {
      allowed: true,
      isVip: true,
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      message: 'VIP用户 unlimited',
    };
  }

  // Non-VIP users check quota
  const limit = feature === 'ai' ? QUOTA_AI_NON_VIP_DAILY : QUOTA_PDF_NON_VIP_DAILY;
  const featureName = feature === 'ai' ? 'AI生成' : 'PDF导出';

  // Use IP-based fallback if no userId
  const identifier = userId || 'anonymous';
  const key = `${identifier}_${feature}`;
  const now = Date.now();

  let entry = quotaStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    quotaStore.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
  const used = entry.timestamps.length;

  if (used >= limit) {
    return {
      allowed: false,
      isVip: false,
      used,
      limit,
      remaining: 0,
      message: `今日${featureName}次数已达上限（${limit}次/天），升级VIP可无限使用`,
    };
  }

  // Consume one quota if not peeking
  if (!skipConsume) {
    entry.timestamps.push(now);
  }

  const remaining = limit - used - (skipConsume ? 0 : 1);

  return {
    allowed: true,
    isVip: false,
    used: used + (skipConsume ? 0 : 1),
    limit,
    remaining: Math.max(0, remaining),
    message: `今日剩余${remaining}次${featureName}（非VIP用户每日${limit}次）`,
  };
}

/**
 * Peek at current quota without consuming.
 */
export async function peekQuota(feature: 'ai' | 'pdf'): Promise<QuotaCheckResult> {
  return checkQuota(feature, true);
}
