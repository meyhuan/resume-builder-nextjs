'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

import { revalidatePath } from 'next/cache'

export async function syncUserAction(userData: {
  clerkId?: string;
  name?: string;
  avatar?: string;
  email?: string;
}) {
  try {
    const authResult = await auth()
    const clerkUserId: string | null = userData.clerkId ?? authResult.userId
    if (!clerkUserId) {
      return { success: false, error: 'clerkId is required' };
    }

    const clerkUser = await currentUser()
    const fallbackEmail: string | undefined = clerkUser?.emailAddresses[0]?.emailAddress ?? undefined
    const fallbackName: string | undefined = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim() || clerkUser?.username || undefined
    const fallbackAvatar: string | undefined = clerkUser?.imageUrl ?? undefined
    const name: string | undefined = userData.name || fallbackName
    const avatar: string | undefined = userData.avatar || fallbackAvatar
    const email: string | undefined = userData.email || fallbackEmail

    const user = await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: {
        name: name || undefined,
        avatar: avatar || undefined,
        email: email || undefined,
      },
      create: {
        clerkId: clerkUserId,
        name: name || email || 'User',
        avatar,
        email,
      },
    });

    return { success: true, user };
  } catch (error: unknown) {
    console.error('Server Action Error (syncUserAction):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' };
  }
}

export async function revalidateDashboard() {
  revalidatePath('/dashboard')
}

/**
 * @deprecated Use /editor/new route instead for blank resume creation.
 */
export async function createResume(): Promise<never> {
  redirect('/editor/new');
}
