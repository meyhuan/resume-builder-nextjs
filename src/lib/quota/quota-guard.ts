import { NextResponse } from 'next/server';
import { checkQuota } from './quota-checker';
import type { QuotaCheckResult } from './quota-checker';
import type { QuotaFeatureKey } from './membership-benefits';

/**
 * Wraps a route handler with quota checking.
 * If quota is exceeded, returns a 429 JSON response.
 * Otherwise, invokes the handler with the quota result.
 *
 * Eliminates the repetitive pattern:
 *   const quota = await checkQuota(feature);
 *   if (!quota.allowed) { return NextResponse.json({...}, { status: 429 }); }
 */
export async function withQuotaCheck(
  feature: QuotaFeatureKey,
  handler: (quota: QuotaCheckResult) => Promise<Response>,
): Promise<Response> {
  const quota = await checkQuota(feature);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.message,
        quotaExceeded: true,
        remaining: quota.remaining,
      },
      { status: 429 },
    );
  }
  return handler(quota);
}
