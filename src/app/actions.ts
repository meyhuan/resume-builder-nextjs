'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

import { revalidatePath } from 'next/cache'

export async function syncUserAction(userData: {
  wxId: string;
  name?: string;
  avatar?: string;
  email?: string;
  javaUserId?: string;
  legacyCvUserId?: string;
}) {
  try {
    const { wxId, name, avatar, email, javaUserId, legacyCvUserId } = userData;

    console.log(`[syncUserAction] START: wxId=${wxId}, legacyCvUserId=${legacyCvUserId}, javaUserId=${javaUserId}`);

    if (!wxId) {
      console.log('[syncUserAction] ERROR: wxId is required');
      return { success: false, error: 'wxId is required' };
    }

    const updateData = {
      name: name || undefined,
      avatar: avatar || undefined,
      email: email || undefined,
      javaUserId: javaUserId || undefined,
    };
    console.log(`[syncUserAction] updateData:`, JSON.stringify(updateData));

    // Check if a legacy record exists and migrate it on-the-fly
    // Try 1: exact match by legacyCvUserId (numeric cvUserId stored as wxId)
    const legacyId = legacyCvUserId ?? (/^\d+$/.test(wxId) ? wxId : null);
    console.log(`[syncUserAction] Try 1: legacyId=${legacyId}`);
    if (legacyId) {
      console.log(`[syncUserAction] Looking up user by wxId=${legacyId}`);
      const legacyUser = await prisma.user.findUnique({ where: { wxId: legacyId } });
      console.log(`[syncUserAction] Try 1 result:`, legacyUser ? `found id=${legacyUser.id}` : 'not found');
      if (legacyUser) {
        console.log(`[syncUserAction] ✓ Migrating legacy user wxId ${legacyId} → ${wxId}`);
        const user = await prisma.user.update({
          where: { id: legacyUser.id },
          data: { wxId, ...updateData },
        });
        console.log(`[syncUserAction] ✓ Migration complete, user.id=${user.id}`);
        return { success: true, user, migrated: true };
      }
    }
    // Try 2: match by javaUserId (legacy record may have wxId=openid but javaUserId=cvUserId)
    console.log(`[syncUserAction] Try 2: javaUserId=${javaUserId}`);
    if (javaUserId) {
      console.log(`[syncUserAction] Looking up user by javaUserId=${String(javaUserId)}`);
      const legacyUser = await prisma.user.findFirst({
        where: {
          javaUserId: String(javaUserId),
          wxId: { not: wxId }, // exclude if already migrated
        },
      });
      console.log(`[syncUserAction] Try 2 result:`, legacyUser ? `found id=${legacyUser.id}, wxId=${legacyUser.wxId}` : 'not found');
      if (legacyUser) {
        console.log(`[syncUserAction] ✓ Migrating legacy user by javaUserId ${javaUserId} → ${wxId}`);
        const user = await prisma.user.update({
          where: { id: legacyUser.id },
          data: { wxId, ...updateData },
        });
        console.log(`[syncUserAction] ✓ Migration complete, user.id=${user.id}`);
        return { success: true, user, migrated: true };
      }
    }
    console.log(`[syncUserAction] No legacy user found, performing upsert for wxId=${wxId}`);

    const user = await prisma.user.upsert({
      where: { wxId },
      update: updateData,
      create: {
        wxId,
        name: name || `用户_${wxId}`,
        avatar,
        email,
        javaUserId,
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
