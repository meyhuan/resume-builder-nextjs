'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function syncNextUserAction(userData: {
  wxId: string
  name?: string
  avatar?: string
  email?: string
  javaUserId?: string
}) {
  try {
    const { wxId, name, avatar, email, javaUserId } = userData

    console.log(`[syncNextUserAction] START: wxId=${wxId}, javaUserId=${javaUserId}`)

    if (!wxId) {
      console.log('[syncNextUserAction] ERROR: wxId is required')
      return { success: false, error: 'wxId is required' }
    }

    const updateData = {
      name: name || undefined,
      avatar: avatar || undefined,
      email: email || undefined,
      javaUserId: javaUserId || undefined,
    }
    console.log('[syncNextUserAction] updateData:', JSON.stringify(updateData))

    if (javaUserId) {
      console.log(`[syncNextUserAction] Looking up user by javaUserId=${javaUserId}`)
      const legacyUser = await prisma.user.findFirst({
        where: {
          javaUserId: String(javaUserId),
          wxId: { not: wxId },
        },
      })
      console.log(
        '[syncNextUserAction] javaUserId lookup result:',
        legacyUser ? `found id=${legacyUser.id}, wxId=${legacyUser.wxId}` : 'not found',
      )
      if (legacyUser) {
        console.log(`[syncNextUserAction] Migrating legacy user by javaUserId ${javaUserId} -> ${wxId}`)
        const user = await prisma.user.update({
          where: { id: legacyUser.id },
          data: { wxId, ...updateData },
        })
        console.log(`[syncNextUserAction] Migration complete, user.id=${user.id}`)
        return { success: true, user, migrated: true }
      }
    }

    console.log(`[syncNextUserAction] No existing user found, performing upsert for wxId=${wxId}`)
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
    })

    return { success: true, user }
  } catch (error: unknown) {
    console.error('Server Action Error (syncNextUserAction):', error)
    return { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }
  }
}

export async function revalidateDashboard() {
  revalidatePath('/dashboard')
}

/**
 * @deprecated Use /editor/new route instead for blank resume creation.
 */
export async function createResume(): Promise<never> {
  redirect('/editor/new')
}
