import { NextResponse } from 'next/server';
import { peekQuota } from '@/lib/quota/quota-checker';

/**
 * GET /next-api/ai/usage
 *
 * Returns the current AI usage quota for the requesting user.
 */
export async function GET(): Promise<NextResponse> {
  const quota = await peekQuota('ai');

  return NextResponse.json({
    allowed: quota.allowed,
    isVip: quota.isVip,
    used: quota.used,
    limit: quota.isVip ? null : quota.limit,
    remaining: quota.isVip ? 'unlimited' : quota.remaining,
    message: quota.message,
  });
}
