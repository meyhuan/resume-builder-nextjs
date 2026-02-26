import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface RateLimitIdentity {
  readonly identifier: string;
  readonly isAuthenticated: boolean;
}

/**
 * Extract rate-limit identity from a Next.js API request.
 * Uses userId (from auth_uid cookie) if logged in, otherwise falls back to IP.
 */
export async function getRateLimitIdentity(
  request: NextRequest,
): Promise<RateLimitIdentity> {
  const cookieStore = await cookies();
  const userId: string | undefined = cookieStore.get('auth_uid')?.value;

  if (userId) {
    return { identifier: `user:${userId}`, isAuthenticated: true };
  }

  const forwarded: string | null = request.headers.get('x-forwarded-for');
  const realIp: string | null = request.headers.get('x-real-ip');
  const ip: string = forwarded?.split(',')[0]?.trim() ?? realIp ?? '0.0.0.0';
  return { identifier: `ip:${ip}`, isAuthenticated: false };
}
