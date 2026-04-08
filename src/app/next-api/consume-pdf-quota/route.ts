import { NextResponse } from 'next/server';
import { checkQuota } from '@/lib/quota/quota-checker';

/**
 * POST /next-api/consume-pdf-quota
 *
 * Consumes one PDF export quota.
 * Called when user confirms export after preview.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const quota = await checkQuota('pdf');
    
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

    return NextResponse.json({
      success: true,
      remaining: quota.remaining,
    });
  } catch (error) {
    console.error('Consume PDF quota error:', error);
    return NextResponse.json(
      { error: 'Failed to consume quota' },
      { status: 500 },
    );
  }
}
