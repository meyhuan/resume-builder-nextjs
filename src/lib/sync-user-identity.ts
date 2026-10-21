import { Prisma, type User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyIdentityRelink } from '@/lib/verify-identity-relink'

export interface UserIdentity {
  wxId: string
  javaUserId?: string
  name?: string
  avatar?: string
  email?: string
}

/** Reuse a linked account without moving its data or replacing its login key. */
export async function syncUserIdentity(input: UserIdentity): Promise<User> {
  const wxId = input.wxId.trim()
  const javaUserId = input.javaUserId?.trim() || undefined
  if (!wxId) throw new Error('wxId is required')

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const byJava = javaUserId
        ? await prisma.user.findUnique({ where: { javaUserId } })
        : null
      const byWx = await prisma.user.findUnique({ where: { wxId } })
      // Only repair an orphan after Java confirms deletion and exact ownership.
      if (javaUserId && byWx?.javaUserId && byWx.javaUserId !== javaUserId) {
        if (byJava || !await verifyIdentityRelink(wxId, byWx.javaUserId, javaUserId)) {
          throw new Error('登录身份关联冲突，请联系客服核查账号')
        }
        // Compare-and-set prevents an overlapping login from overwriting a new link.
        // Keep the row ID, wxId, resumes, quotas and all other related data intact.
        const result = await prisma.user.updateMany({
          where: { id: byWx.id, wxId, javaUserId: byWx.javaUserId },
          data: { javaUserId },
        })
        if (result.count !== 1) continue
        const repaired = await prisma.user.findUnique({ where: { id: byWx.id } })
        if (!repaired || repaired.javaUserId !== javaUserId) continue
        console.info('[identity-relink] repaired deleted Java account', {
          userId: byWx.id, oldJavaUserId: byWx.javaUserId, newJavaUserId: javaUserId,
        })
        return repaired
      }
      const existing = byJava ?? byWx
      const profile = {
        name: input.name || undefined,
        avatar: input.avatar || undefined,
        email: input.email || undefined,
      }
      if (existing) {
        if (!existing.wxId && byWx && byWx.id !== existing.id) {
          throw new Error('登录身份关联冲突，请联系客服核查账号')
        }
        // Keep an existing wxId stable: switching unionid/openid/numeric ID
        // would invalidate other sessions and can recreate a shadow account.
        return await prisma.user.update({
          where: { id: existing.id },
          data: { ...profile, javaUserId, wxId: existing.wxId || wxId },
        })
      }
      return await prisma.user.create({
        data: { ...profile, wxId, javaUserId, name: input.name || `用户_${wxId}` },
      })
    } catch (error) {
      // Another login may have linked either unique key between read/write.
      // Resolve BOTH keys again; never fall back to an unsynced cookie.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt < 2) {
        continue
      }
      throw error
    }
  }
  throw new Error('账号同步失败，请重试')
}
