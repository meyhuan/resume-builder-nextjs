/**
 * Quota tracking for VIP-gated features (AI and PDF export).
 *
 * - VIP users: unlimited access
 * - Non-VIP users: limited by daily/total quotas
 *
 * This works alongside the existing rate limiter but adds VIP awareness.
 */

import { cookies } from 'next/headers';
import {
  getQuotaLimit,
  getFeatureDisplayName,
  QUOTA_CLEANUP_INTERVAL_MS,
  type QuotaFeatureKey,
} from './membership-benefits';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

interface QuotaEntry {
  dateKey: string;
  used: number;
}

/** In-memory quota store keyed by userId_feature. */
const quotaStore = new Map<string, QuotaEntry>();

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Clean up expired entries periodically. */
function cleanupQuotas(): void {
  const todayKey = getDateKey(Date.now());
  for (const [key, entry] of quotaStore.entries()) {
    if (entry.dateKey !== todayKey) {
      quotaStore.delete(key);
    }
  }
}

setInterval(cleanupQuotas, QUOTA_CLEANUP_INTERVAL_MS);

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
  readonly remaining: number | 'unlimited';
  /** Human-readable quota message. */
  readonly message: string;
  /** Feature key that was checked. */
  readonly feature: QuotaFeatureKey;
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
 * @param feature - Quota feature key (e.g., 'ai:generate-resume', 'pdf:export')
 * @param skipConsume - if true, only peek at quota without consuming
 */
export async function checkQuota(
  feature: QuotaFeatureKey,
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
      remaining: 'unlimited',
      message: 'VIP用户 unlimited',
      feature,
    };
  }

  // Non-VIP users check quota
  const limit = getQuotaLimit(feature);
  const featureName = getFeatureDisplayName(feature);

  // Use IP-based fallback if no userId
  const identifier = userId || 'anonymous';
  const key = `${identifier}_${feature}`;
  const now = Date.now();
  const todayKey = getDateKey(now);

  let entry = quotaStore.get(key);
  if (!entry || entry.dateKey !== todayKey) {
    entry = { dateKey: todayKey, used: 0 };
    quotaStore.set(key, entry);
  }

  const used = entry.used;

  if (used >= limit) {
    return {
      allowed: false,
      isVip: false,
      used,
      limit,
      remaining: 0,
      message: `今日${featureName}次数已达上限（${limit}次/天），升级VIP可无限使用`,
      feature,
    };
  }

  // Consume one quota if not peeking
  if (!skipConsume) {
    entry.used += 1;
  }

  const remaining = limit - used - (skipConsume ? 0 : 1);

  return {
    allowed: true,
    isVip: false,
    used: used + (skipConsume ? 0 : 1),
    limit,
    remaining: Math.max(0, remaining),
    message: `今日剩余${remaining}次${featureName}（非VIP用户每日${limit}次）`,
    feature,
  };
}

/**
 * Peek at current quota without consuming.
 */
export async function peekQuota(feature: QuotaFeatureKey): Promise<QuotaCheckResult> {
  return checkQuota(feature, true);
}

/**
 * Get all quota statuses for the current user.
 * Useful for displaying usage dashboard.
 */
export async function getAllQuotas(): Promise<QuotaCheckResult[]> {
  const features: QuotaFeatureKey[] = [
    'ai:generate-resume',
    'ai:import-section',
    'ai:generate-section',
    'ai:polish-section',
    'ai:optimize-resume',
    'pdf:export',
  ];

  return Promise.all(features.map((f) => peekQuota(f)));
}
