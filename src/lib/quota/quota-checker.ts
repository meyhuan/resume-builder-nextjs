/**
 * Quota tracking for VIP-gated features (AI and PDF export).
 *
 * - VIP users: unlimited access
 * - Non-VIP users: limited by daily/total quotas
 *
 * Single-row design: one UserQuota record per user with JSON quotas field.
 */

import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getQuotaLimit,
  getFeatureDisplayName,
  type QuotaFeatureKey,
} from './membership-benefits';
import { LIFETIME_QUOTA_FEATURES } from './quota-config';

const JAVA_API_BASE = process.env.JAVA_API_BASE_URL || 'https://aijianli.cn/api';

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** JSON structure for per-feature quota tracking */
interface FeatureQuota {
  used: number;
  date: string; // '2025-01-15'
}

/** Quotas JSON structure: key is feature name */
interface QuotasData {
  [feature: string]: FeatureQuota;
}

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

  // Use IP-based fallback if no userId - still track via in-memory for anonymous
  if (!userId) {
    return handleAnonymousQuota(feature, limit, featureName, skipConsume);
  }

  const todayKey = getDateKey(Date.now());

  // Find or create user by wxId (Java user ID)
  let user = await prisma.user.findUnique({
    where: { wxId: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { wxId: userId },
    });
  }

  // Get or create single quota record for this user
  let quotaRecord = await prisma.userQuota.findUnique({
    where: { userId: user.id },
  });

  if (!quotaRecord) {
    quotaRecord = await prisma.userQuota.create({
      data: {
        userId: user.id,
        quotas: {},
      },
    });
  }

  // Parse quotas JSON
  const quotas = (quotaRecord.quotas as unknown as QuotasData) || {};
  const featureQuota = quotas[feature];

  // Check if quota is for today, reset if needed (skip for lifetime quotas)
  const isLifetimeQuota = LIFETIME_QUOTA_FEATURES.includes(feature);
  const used = isLifetimeQuota
    ? (featureQuota?.used ?? 0)
    : (featureQuota?.date === todayKey ? featureQuota.used : 0);

  if (used >= limit) {
    const limitText = isLifetimeQuota ? `免费限${limit}次` : `${limit}次/天`;
    return {
      allowed: false,
      isVip: false,
      used,
      limit,
      remaining: 0,
      message: `${featureName}次数已达上限（${limitText}），升级VIP可无限使用`,
      feature,
    };
  }

  // Calculate new usage
  const newUsed = skipConsume ? used : used + 1;
  const remaining = limit - newUsed;

  // Update quota in database if consuming
  if (!skipConsume) {
    quotas[feature] = { used: newUsed, date: isLifetimeQuota ? 'lifetime' : todayKey };
    await prisma.userQuota.update({
      where: { userId: user.id },
      data: { quotas: quotas as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
    });
  }

  const message = isLifetimeQuota
    ? `剩余${remaining}次${featureName}（非VIP用户免费限${limit}次）`
    : `今日剩余${remaining}次${featureName}（非VIP用户每日${limit}次）`;

  return {
    allowed: true,
    isVip: false,
    used: newUsed,
    limit,
    remaining: Math.max(0, remaining),
    message,
    feature,
  };
}

/**
 * Peek at current quota without consuming.
 */
export async function peekQuota(feature: QuotaFeatureKey): Promise<QuotaCheckResult> {
  return checkQuota(feature, true);
}

/** In-memory store for anonymous users only. */
const anonymousQuotaStore = new Map<string, { dateKey: string; used: number }>();

async function handleAnonymousQuota(
  feature: QuotaFeatureKey,
  limit: number,
  featureName: string,
  skipConsume: boolean,
): Promise<QuotaCheckResult> {
  const now = Date.now();
  const todayKey = getDateKey(now);
  const key = `anonymous_${feature}`;
  const isLifetimeQuota = LIFETIME_QUOTA_FEATURES.includes(feature);

  let entry = anonymousQuotaStore.get(key);
  if (!entry || (!isLifetimeQuota && entry.dateKey !== todayKey)) {
    entry = { dateKey: isLifetimeQuota ? 'lifetime' : todayKey, used: 0 };
    anonymousQuotaStore.set(key, entry);
  }

  const used = entry?.used ?? 0;

  if (used >= limit) {
    const limitText = isLifetimeQuota ? `免费限${limit}次` : `${limit}次/天`;
    const suffix = isLifetimeQuota ? '登录后可继续使用' : '登录后可继续使用';
    return {
      allowed: false,
      isVip: false,
      used,
      limit,
      remaining: 0,
      message: `${featureName}次数已达上限（${limitText}），${suffix}`,
      feature,
    };
  }

  if (!skipConsume) {
    entry.used += 1;
  }

  const currentUsed = skipConsume ? used : used + 1;
  const remaining = limit - currentUsed;

  const message = isLifetimeQuota
    ? `剩余${remaining}次${featureName}（非登录用户免费限${limit}次）`
    : `今日剩余${remaining}次${featureName}（非登录用户每日${limit}次）`;

  return {
    allowed: true,
    isVip: false,
    used: currentUsed,
    limit,
    remaining: Math.max(0, remaining),
    message,
    feature,
  };
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
