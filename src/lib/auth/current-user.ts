import type { User } from '@prisma/client'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/** Resolve the current dashboard user using the authentication contract used by the existing app. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const wxId = cookieStore.get('auth_uid')?.value
  if (!wxId) return null

  return prisma.user.findUnique({ where: { wxId } })
}

