import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export interface RateLimitIdentity {
  readonly identifier: string;
  readonly isAuthenticated: boolean;
}

/**
 * Extract rate-limit identity from a Next.js API request.
 * Uses Clerk userId if logged in, otherwise falls back to IP.
 */
export async function getRateLimitIdentity(
  request: NextRequest,
): Promise<RateLimitIdentity> {
  const authResult = await auth();
  const userId: string | null = authResult.userId;

  if (userId) {
    return { identifier: `user:${userId}`, isAuthenticated: true };
  }

  const forwarded: string | null = request.headers.get('x-forwarded-for');
  const realIp: string | null = request.headers.get('x-real-ip');
  const ip: string = forwarded?.split(',')[0]?.trim() ?? realIp ?? '0.0.0.0';
  return { identifier: `ip:${ip}`, isAuthenticated: false };
}
