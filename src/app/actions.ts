'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

import { revalidatePath } from 'next/cache'

export async function syncUserAction(userData: {
  wxId: string;
  name?: string;
  avatar?: string;
  email?: string;
}) {
  try {
    const { wxId, name, avatar, email } = userData;

    if (!wxId) {
      return { success: false, error: 'wxId is required' };
    }

    const user = await prisma.user.upsert({
      where: { wxId },
      update: {
        name: name || undefined,
        avatar: avatar || undefined,
        email: email || undefined,
      },
      create: {
        wxId,
        name: name || `用户_${wxId}`,
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
