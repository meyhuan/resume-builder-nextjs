import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './rate-limiter';
import { getRateLimitIdentity } from './get-rate-limit-identity';

/**
 * Apply rate limiting to an AI API request.
 * Returns a 429 response if the limit is exceeded, or null if allowed.
 * Also sets rate-limit headers on the response for frontend consumption.
 */
export async function applyRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { identifier, isAuthenticated } = await getRateLimitIdentity(request);
  const result = checkRateLimit(identifier, isAuthenticated);

  if (!result.allowed) {
    const message = isAuthenticated
      ? `今日 AI 使用次数已达上限（${result.limit} 次/天），请明天再试`
      : `未登录用户每天可使用 ${result.limit} 次 AI 功能，登录后可获得更多次数`;

    return NextResponse.json(
      {
        error: message,
        rateLimitExceeded: true,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
        isAuthenticated,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Used': String(result.used),
        },
      },
    );
  }

  return null;
}
