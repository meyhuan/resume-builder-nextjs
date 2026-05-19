import { NextResponse } from 'next/server';
import { withQuotaCheck } from '@/lib/quota/quota-guard';

/**
 * POST /next-api/consume-pdf-quota
 *
 * Consumes one PDF export quota.
 * Called when user confirms export after preview.
 */
export async function POST(): Promise<Response> {
  try {
    return withQuotaCheck('pdf:export', async (quota) =>
      NextResponse.json({
        success: true,
        remaining: quota.remaining,
      }),
    );
  } catch (error) {
    console.error('Consume PDF quota error:', error);
    return NextResponse.json(
      { error: 'Failed to consume quota' },
      { status: 500 },
    );
  }
}
