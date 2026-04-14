/**
 * Quota Configuration - Single Source of Truth
 *
 * This file defines all quota limits and is shared between:
 * - Backend: quota-checker.ts, membership-benefits.ts
 * - Frontend: use-vip-check.ts, UI components
 *
 * Modify values here to change quotas globally.
 */

/** Default quota limits for non-VIP users (number per day) */
export const DEFAULT_QUOTA_LIMITS = {
  /** AI: Generate complete resume from scratch */
  aiGenerateResume: 3,
  /** AI: Import and optimize resume sections */
  aiImportSection: 3,
  /** AI: Generate additional content for existing sections */
  aiGenerateSection: 5,
  /** AI: Polish and refine text content */
  aiPolishSection: 5,
  /** AI: One-click optimize entire resume */
  aiOptimizeResume: 2,
  /** PDF export limit */
  pdfExport: 1,
} as const;

/** Type for quota limit keys */
export type QuotaLimitKey = keyof typeof DEFAULT_QUOTA_LIMITS;

/**
 * Get quota limit by feature key (kebab-case to camelCase mapping)
 * Used by backend quota checker
 */
export function getQuotaLimitByFeature(feature: string): number {
  // Map kebab-case feature keys to camelCase limit keys
  // e.g., 'ai:generate-resume' -> 'aiGenerateResume'
  const key = feature.replace(/[:]/g, '-').split('-').map((part, i) => {
    if (i === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('') as QuotaLimitKey;

  return DEFAULT_QUOTA_LIMITS[key] ?? 0;
}
