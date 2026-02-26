import { NextRequest, NextResponse } from 'next/server';
import { peekRateLimit } from '@/lib/ai/rate-limiter';
import { getRateLimitIdentity } from '@/lib/ai/get-rate-limit-identity';

/**
 * GET /api/ai/usage
 *
 * Returns the current AI usage stats for the requesting user/IP.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { identifier, isAuthenticated } = await getRateLimitIdentity(request);
  const result = peekRateLimit(identifier, isAuthenticated);

  return NextResponse.json({
    used: result.used,
    limit: result.limit,
    remaining: result.remaining,
    isAuthenticated,
  });
}
