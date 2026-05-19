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
  /** Additional free export count from Java backend (for pdf:export). */
  readonly freeExportCount?: number;
}

/** Helper to build QuotaCheckResult with automatic freeExportCount for pdf:export */
function createResult(
  params: Omit<QuotaCheckResult, 'freeExportCount'> & { freeExportCount?: number },
): QuotaCheckResult {
  return {
    ...params,
    freeExportCount: params.feature === 'pdf:export' ? params.freeExportCount ?? 0 : undefined,
  };
}

function getEffectiveLimit(feature: QuotaFeatureKey, freeExportCount: number): number {
  const baseLimit = getQuotaLimit(feature);
  return feature === 'pdf:export' ? baseLimit + freeExportCount : baseLimit;
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
  const logPrefix = '[quota:check]';
  console.log(`${logPrefix} start`, { feature, skipConsume });
  const { isVip, userId, freeExportCount = 0 } = await checkVipStatus();
  console.log(`${logPrefix} vipStatus`, { isVip, userId, freeExportCount });
  if (isVip) {
    console.log(`${logPrefix} vipGranted`, { feature, userId });
    return createResult({
      allowed: true,
      isVip: true,
      used: 0,
      limit: Infinity,
      remaining: 'unlimited',
      message: 'VIP用户 unlimited',
      feature,
    });
  }
  const limit = getEffectiveLimit(feature, freeExportCount);
  const featureName = getFeatureDisplayName(feature);
  if (!userId) {
    console.log(`${logPrefix} noUserId`, { feature });
    return createResult({
      allowed: false,
      isVip: false,
      used: 0,
      limit: 0,
      remaining: 0,
      message: '请先登录',
      feature,
    });
  }
  console.log(`${logPrefix} proceedToCore`, { userId, feature });
  return checkQuotaCore(userId, freeExportCount, feature, skipConsume, limit, featureName);
}

/**
 * Peek at current quota without consuming.
 */
export async function peekQuota(feature: QuotaFeatureKey): Promise<QuotaCheckResult> {
  console.log('[quota:peek] start', { feature });
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
  const logPrefix = '[quota:checkForUser]';
  console.log(`${logPrefix} start`, { wxId, feature, skipConsume });
  if (!wxId) {
    console.log(`${logPrefix} emptyWxId`, { feature });
    return createResult({
      allowed: false,
      isVip: false,
      used: 0,
      limit: 0,
      remaining: 0,
      message: '未登录',
      feature,
    });
  }
  const { isVip, freeExportCount = 0 } = await checkVipStatusForWxId(wxId);
  console.log(`${logPrefix} vipStatus`, { wxId, isVip, freeExportCount });
  if (isVip) {
    console.log(`${logPrefix} vipGranted`, { wxId, feature });
    return createResult({
      allowed: true,
      isVip: true,
      used: 0,
      limit: Infinity,
      remaining: 'unlimited',
      message: 'VIP用户 unlimited',
      feature,
    });
  }
  const limit = getEffectiveLimit(feature, freeExportCount);
  const featureName = getFeatureDisplayName(feature);
  console.log(`${logPrefix} proceedToCore`, { wxId, limit, featureName });
  return checkQuotaCore(wxId, freeExportCount, feature, skipConsume, limit, featureName, {
    userName: `用户_${wxId}`,
    logPrefix: '[quota:wxid]',
  });
}

/** Peek a user's quota without consuming. */
export async function peekQuotaForUser(wxId: string, feature: QuotaFeatureKey): Promise<QuotaCheckResult> {
  console.log('[quota:peekForUser] start', { wxId, feature });
  return checkQuotaForUser(wxId, feature, true);
}

/**
 * Get all quota statuses for the current user.
 * Useful for displaying usage dashboard.
 */
export async function getAllQuotas(): Promise<QuotaCheckResult[]> {
  console.log('[quota:getAll] start');
  const features: QuotaFeatureKey[] = [
    'ai:generate-resume',
    'ai:import-section',
    'ai:generate-section',
    'ai:polish-section',
    'ai:optimize-resume',
    'pdf:export',
  ];
  const results = await Promise.all(features.map((f) => peekQuota(f)));
  console.log('[quota:getAll] done', { count: results.length });
  return results;
}

/**
 * Core quota check logic shared by checkQuota and checkQuotaForUser.
 * Handles user upsert, quota record fetch, limit check, and consumption.
 */
async function checkQuotaCore(
  wxId: string,
  freeExportCount: number,
  feature: QuotaFeatureKey,
  skipConsume: boolean,
  limit: number,
  featureName: string,
  opts?: { userName?: string; logPrefix?: string },
): Promise<QuotaCheckResult> {
  const logPrefix = opts?.logPrefix ?? '[quota:core]';
  console.log(`${logPrefix} start`, { wxId, feature, limit, skipConsume });
  const todayKey = getDateKey(Date.now());
  console.log(`${logPrefix} upsertUser`, { wxId });
  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, ...(opts?.userName ? { name: opts.userName } : {}) },
  });
  console.log(`${logPrefix} userReady`, { userId: user.id });
  let quotaRecord;
  try {
    console.log(`${logPrefix} upsertQuota`, { userId: user.id });
    quotaRecord = await prisma.userQuota.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, quotas: {} },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.log(`${logPrefix} raceConditionP2002`, { userId: user.id });
      quotaRecord = await prisma.userQuota.findUnique({ where: { userId: user.id } });
      if (!quotaRecord) {
        throw new Error(`${logPrefix} Failed to fetch UserQuota after P2002 for user ${user.id}`);
      }
      console.log(`${logPrefix} recoveredFromRace`, { userId: user.id });
    } else {
      console.error(`${logPrefix} dbError`, { userId: user.id, error });
      throw error;
    }
  }
  const quotas = (quotaRecord.quotas as unknown as QuotasData) || {};
  const featureQuota = quotas[feature];
  const isLifetimeQuota = LIFETIME_QUOTA_FEATURES.includes(feature);
  const used = isLifetimeQuota
    ? (featureQuota?.used ?? 0)
    : (featureQuota?.date === todayKey ? featureQuota.used : 0);
  console.log(`${logPrefix} quotaState`, { userId: user.id, feature, used, isLifetimeQuota, featureDate: featureQuota?.date, todayKey });
  if (used >= limit) {
    console.log(`${logPrefix} limitExceeded`, { userId: user.id, feature, used, limit });
    const limitText = isLifetimeQuota ? `免费限${limit}次` : `${limit}次/天`;
    return createResult({
      allowed: false,
      isVip: false,
      used,
      limit,
      remaining: 0,
      message: `${featureName}次数已达上限（${limitText}），升级VIP可无限使用`,
      feature,
      freeExportCount,
    });
  }
  const newUsed = skipConsume ? used : used + 1;
  const remaining = limit - newUsed;
  if (!skipConsume) {
    console.log(`${logPrefix} consuming`, { userId: user.id, feature, newUsed });
    quotas[feature] = { used: newUsed, date: isLifetimeQuota ? 'lifetime' : todayKey };
    await prisma.userQuota.update({
      where: { userId: user.id },
      data: { quotas: quotas as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
    });
  }
  const message = isLifetimeQuota
    ? `剩余${remaining}次${featureName}（非VIP用户免费限${limit}次）`
    : `今日剩余${remaining}次${featureName}（非VIP用户每日${limit}次）`;
  if (opts?.logPrefix) {
    console.log(`${opts.logPrefix} decision`, { wxId, feature, used: newUsed, remaining, skipConsume, freeExportCount });
  }
  console.log(`${logPrefix} result`, { userId: user.id, feature, allowed: true, used: newUsed, remaining });
  return createResult({
    allowed: true,
    isVip: false,
    used: newUsed,
    limit,
    remaining: Math.max(0, remaining),
    message,
    feature,
    freeExportCount,
  });
}
