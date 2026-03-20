import type { User } from '@prisma/client';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface CurrentUserRecordResult {
  readonly clerkUserId: string | null;
  readonly dbUser: User | null;
}

/**
 * Resolve the authenticated Clerk user to the local Prisma user record.
 */
export async function getCurrentUserRecord(): Promise<CurrentUserRecordResult> {
  const authResult = await auth();
  const clerkUserId: string | null = authResult.userId;
  if (!clerkUserId) {
    return {
      clerkUserId: null,
      dbUser: null,
    };
  }
  const existingUser: User | null = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (existingUser) {
    return {
      clerkUserId,
      dbUser: existingUser,
    };
  }
  const clerkUser = await currentUser();
  const primaryEmail: string | null = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const displayName: string | null = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() || clerkUser?.username || primaryEmail;
  const avatarUrl: string | null = clerkUser?.imageUrl ?? null;
  const dbUser: User = await prisma.user.create({
    data: {
      clerkId: clerkUserId,
      email: primaryEmail,
      name: displayName,
      avatar: avatarUrl,
    },
  });
  return {
    clerkUserId,
    dbUser,
  };
}
