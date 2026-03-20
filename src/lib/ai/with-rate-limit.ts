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
      ? `Daily AI usage limit reached (${result.limit} uses/day). Please try again tomorrow.`
      : `Guest users can use AI features ${result.limit} times per day. Log in for more uses.`;

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
