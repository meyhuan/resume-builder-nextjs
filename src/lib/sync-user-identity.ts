import { Prisma, type User } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
      // Never rebind a login identity already linked to another Java account.
      if (javaUserId && byWx?.javaUserId && byWx.javaUserId !== javaUserId) {
        throw new Error('登录身份关联冲突，请联系客服核查账号')
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
