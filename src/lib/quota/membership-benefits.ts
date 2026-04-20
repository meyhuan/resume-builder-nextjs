/**
 * Membership Benefits Configuration
 *
 * Centralized management of all VIP and non-VIP user privileges.
 * Modify quota limits in quota-config.ts to adjust globally.
 *
 * @module membership-benefits
 */

import { DEFAULT_QUOTA_LIMITS } from './quota-config';

/** Quota limit for non-VIP users (number per day, total lifetime, or boolean for on/off features) */
export type QuotaValue = number | boolean;

/** Quota configuration for a specific feature */
export interface FeatureQuota {
  /** Usage limit for non-VIP users (daily or lifetime depending on feature) */
  readonly nonVipLimit: number;
  /** Display name for the feature */
  readonly displayName: string;
  /** Description of the feature */
  readonly description: string;
}

/** AI feature categories and their quotas */
export const AI_FEATURE_QUOTAS: Record<string, FeatureQuota> = {
  'ai:generate-resume': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.aiGenerateResume,
    displayName: 'AI 生成简历',
    description: '根据求职意向智能生成完整简历',
  },
  'ai:import-section': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.aiImportSection,
    displayName: 'AI 导入优化',
    description: '导入并智能优化简历章节',
  },
  'ai:generate-section': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.aiGenerateSection,
    displayName: 'AI 续写内容',
    description: '为现有章节智能生成续写内容',
  },
  'ai:polish-section': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.aiPolishSection,
    displayName: 'AI 润色文本',
    description: '优化语言表达，提升专业性',
  },
  'ai:optimize-resume': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.aiOptimizeResume,
    displayName: 'AI 一键优化简历',
    description: '结合岗位JD一键优化全部简历内容',
  },
} as const;

/** Export-related quotas */
export const EXPORT_QUOTAS = {
  /** PDF export quota for non-VIP users (lifetime total, never resets) */
  'pdf:export': {
    nonVipLimit: DEFAULT_QUOTA_LIMITS.pdfExport,
    displayName: 'PDF 导出',
    description: '导出高清 PDF 简历文件（免费限 1 次）',
  },
} as const;

/** Boolean feature flags (true = VIP only, false = available to all) */
export const BOOLEAN_FEATURES = {
  /** Access to premium templates */
  'template:vip': {
    vipOnly: true,
    displayName: '精品模板',
    description: '使用全部高级设计模板',
  },
  /** Remove watermark from exports */
  'watermark:remove': {
    vipOnly: true,
    displayName: '无水印导出',
    description: '导出无水印高清简历',
  },
  /** PNG export availability */
  'export:png': {
    vipOnly: false,
    displayName: 'PNG 图片导出',
    description: '导出简历为 PNG 图片',
  },
  /** Markdown export availability */
  'export:markdown': {
    vipOnly: false,
    displayName: 'Markdown 导出',
    description: '导出简历为 Markdown 文本',
  },
} as const;

/** All valid feature keys for quota checking */
export type QuotaFeatureKey =
  | keyof typeof AI_FEATURE_QUOTAS
  | keyof typeof EXPORT_QUOTAS;

/** All valid feature keys including boolean features */
export type FeatureKey = QuotaFeatureKey | keyof typeof BOOLEAN_FEATURES;

/** Get the quota limit for a feature */
export function getQuotaLimit(feature: QuotaFeatureKey): number {
  if (feature in AI_FEATURE_QUOTAS) {
    return AI_FEATURE_QUOTAS[feature as keyof typeof AI_FEATURE_QUOTAS].nonVipLimit;
  }
  if (feature in EXPORT_QUOTAS) {
    return EXPORT_QUOTAS[feature as keyof typeof EXPORT_QUOTAS].nonVipLimit;
  }
  return 0;
}

/** Get the display name for a feature */
export function getFeatureDisplayName(feature: FeatureKey): string {
  if (feature in AI_FEATURE_QUOTAS) {
    return AI_FEATURE_QUOTAS[feature as keyof typeof AI_FEATURE_QUOTAS].displayName;
  }
  if (feature in EXPORT_QUOTAS) {
    return EXPORT_QUOTAS[feature as keyof typeof EXPORT_QUOTAS].displayName;
  }
  if (feature in BOOLEAN_FEATURES) {
    return BOOLEAN_FEATURES[feature as keyof typeof BOOLEAN_FEATURES].displayName;
  }
  return feature;
}

/** Get the description for a feature */
export function getFeatureDescription(feature: FeatureKey): string {
  if (feature in AI_FEATURE_QUOTAS) {
    return AI_FEATURE_QUOTAS[feature as keyof typeof AI_FEATURE_QUOTAS].description;
  }
  if (feature in EXPORT_QUOTAS) {
    return EXPORT_QUOTAS[feature as keyof typeof EXPORT_QUOTAS].description;
  }
  if (feature in BOOLEAN_FEATURES) {
    return BOOLEAN_FEATURES[feature as keyof typeof BOOLEAN_FEATURES].description;
  }
  return '';
}

/** Check if a feature is VIP-only (boolean features) */
export function isVipOnlyFeature(feature: keyof typeof BOOLEAN_FEATURES): boolean {
  return BOOLEAN_FEATURES[feature].vipOnly;
}

/** Duration of quota window in milliseconds (24 hours) */
export const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Cleanup interval for quota store (10 minutes) */
export const QUOTA_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

/** Helper to convert AI_FEATURE_QUOTAS keys to camelCase */
function toCamelCase(key: string): string {
  return key.replace(/[:]/g, '-').split('-').map((part, i) => {
    if (i === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('');
}

/** Generate MEMBERSHIP_BENEFITS_SUMMARY from AI_FEATURE_QUOTAS (single source of truth) */
function generateBenefitsSummary(): {
  nonVip: Record<string, { limit: number; unit: string } | boolean>;
  vip: Record<string, { limit: string; unit: string } | boolean>;
} {
  const nonVip: Record<string, { limit: number; unit: string } | boolean> = {};
  const vip: Record<string, { limit: string; unit: string } | boolean> = {};

  // Generate from AI_FEATURE_QUOTAS
  for (const [key, config] of Object.entries(AI_FEATURE_QUOTAS)) {
    const camelKey = toCamelCase(key);
    nonVip[camelKey] = { limit: config.nonVipLimit, unit: '次/天' };
    vip[camelKey] = { limit: 'unlimited', unit: '' };
  }

  // Add export quotas (pdf:export is lifetime, not daily)
  for (const [key, config] of Object.entries(EXPORT_QUOTAS)) {
    const camelKey = toCamelCase(key);
    const isLifetime = key === 'pdf:export';
    nonVip[camelKey] = { limit: config.nonVipLimit, unit: isLifetime ? '次（免费）' : '次/天' };
    vip[camelKey] = { limit: 'unlimited', unit: '' };
  }

  // Add boolean features
  for (const [key, config] of Object.entries(BOOLEAN_FEATURES)) {
    const camelKey = toCamelCase(key);
    if (config.vipOnly) {
      nonVip[camelKey] = false;
      vip[camelKey] = true;
    }
  }

  return { nonVip, vip };
}

/** Summary of all membership benefits for display purposes - auto-generated from AI_FEATURE_QUOTAS */
export const MEMBERSHIP_BENEFITS_SUMMARY = generateBenefitsSummary();
