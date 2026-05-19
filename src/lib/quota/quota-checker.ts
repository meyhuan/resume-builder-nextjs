/**
 * Quota tracking for VIP-gated features (AI and PDF export).
 *
 * - VIP users: unlimited access
 * - Non-VIP users: limited by daily/total quotas
 *
 * Single-row design: one UserQuota record per user with JSON quotas field.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checkVipStatus, checkVipStatusForWxId } from '@/lib/api/vip-api';
import {
  getQuotaLimit,
  getFeatureDisplayName,
  type QuotaFeatureKey,
} from './membership-benefits';
import { LIFETIME_QUOTA_FEATURES } from './quota-config';

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

  // Find or create user by wxId (using upsert to avoid race conditions)
  const user = await prisma.user.upsert({
    where: { wxId: userId },
    update: {},
    create: { wxId: userId },
  });

  // Find or create single quota record for this user
  // Use try-catch to handle race conditions when multiple requests run concurrently
  let quotaRecord;
  try {
    quotaRecord = await prisma.userQuota.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        quotas: {},
      },
    });
  } catch (error) {
    // If another request created the record first (P2002), fetch the existing record
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      quotaRecord = await prisma.userQuota.findUnique({
        where: { userId: user.id },
      });
      if (!quotaRecord) {
        throw new Error(`[quota] Failed to fetch UserQuota after P2002 for user ${user.id}`);
      }
    } else {
      throw error;
    }
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

/**
 * Check and consume quota for a specific user (by wxId / unionid).
 * Mirrors `checkQuota` but does not depend on the auth_uid cookie. Designed
 * for API routes that authenticate via signed body (mini-program).
 */
export async function checkQuotaForUser(
  wxId: string,
  feature: QuotaFeatureKey,
  skipConsume = false,
): Promise<QuotaCheckResult> {
  if (!wxId) {
    return {
      allowed: false,
      isVip: false,
      used: 0,
      limit: 0,
      remaining: 0,
      message: '未登录',
      feature,
    };
  }

  const { isVip } = await checkVipStatusForWxId(wxId);
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

  const limit = getQuotaLimit(feature);
  const featureName = getFeatureDisplayName(feature);
  const todayKey = getDateKey(Date.now());

  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
  });

  let quotaRecord;
  try {
    quotaRecord = await prisma.userQuota.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        quotas: {},
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      quotaRecord = await prisma.userQuota.findUnique({ where: { userId: user.id } });
      if (!quotaRecord) {
        throw new Error(`[quota:wxid] Failed to fetch UserQuota after P2002 for user ${user.id}`);
      }
    } else {
      throw error;
    }
  }

  const quotas = (quotaRecord.quotas as unknown as QuotasData) || {};
  const featureQuota = quotas[feature];

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

  const newUsed = skipConsume ? used : used + 1;
  const remaining = limit - newUsed;

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

  console.log('[quota:wxid] decision', { wxId, feature, used: newUsed, remaining, skipConsume });

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

/** Peek a user's quota without consuming. */
export async function peekQuotaForUser(wxId: string, feature: QuotaFeatureKey): Promise<QuotaCheckResult> {
  return checkQuotaForUser(wxId, feature, true);
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
