import { NextResponse } from 'next/server';
import { peekQuota } from '@/lib/quota/quota-checker';

/**
 * GET /next-api/quota
 *
 * Returns current quota status for AI and PDF features.
 * Includes VIP status and remaining uses.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [aiQuota, pdfQuota] = await Promise.all([
      peekQuota('ai'),
      peekQuota('pdf'),
    ]);

    return NextResponse.json({
      ai: {
        allowed: aiQuota.allowed,
        isVip: aiQuota.isVip,
        used: aiQuota.used,
        limit: aiQuota.isVip ? null : aiQuota.limit,
        remaining: aiQuota.isVip ? 'unlimited' : aiQuota.remaining,
        message: aiQuota.message,
      },
      pdf: {
        allowed: pdfQuota.allowed,
        isVip: pdfQuota.isVip,
        used: pdfQuota.used,
        limit: pdfQuota.isVip ? null : pdfQuota.limit,
        remaining: pdfQuota.isVip ? 'unlimited' : pdfQuota.remaining,
        message: pdfQuota.message,
      },
    });
  } catch (error) {
    console.error('[quota] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check quota' },
      { status: 500 },
    );
  }
}
