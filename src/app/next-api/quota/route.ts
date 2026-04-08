import { NextResponse } from 'next/server';
import { getAllQuotas } from '@/lib/quota/quota-checker';
import type { QuotaCheckResult } from '@/lib/quota/quota-checker';

interface QuotaResponse {
  allowed: boolean;
  isVip: boolean;
  used: number;
  limit: number | null;
  remaining: number | 'unlimited';
  message: string;
}

function formatQuotaResponse(quota: QuotaCheckResult): QuotaResponse {
  return {
    allowed: quota.allowed,
    isVip: quota.isVip,
    used: quota.used,
    limit: quota.isVip ? null : quota.limit,
    remaining: quota.isVip ? 'unlimited' : quota.remaining,
    message: quota.message,
  };
}

/**
 * GET /next-api/quota
 *
 * Returns current quota status for all features.
 * Includes VIP status and remaining uses.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const allQuotas = await getAllQuotas();

    const response: Record<string, QuotaResponse> = {};

    for (const quota of allQuotas) {
      // Extract short name from feature key (e.g., 'ai:generate-resume' -> 'generateResume')
      const key = quota.feature.replace(/[:]/g, '-').split('-').map((part, i) => {
        if (i === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join('');
      response[key] = formatQuotaResponse(quota);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[quota] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check quota' },
      { status: 500 },
    );
  }
}
