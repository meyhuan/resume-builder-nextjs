import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const applications = await prisma.application.findMany({
    where: { job: { userId: user.id, status: { not: 'ARCHIVED' } } },
    orderBy: [{ nextActionAt: 'asc' }, { updatedAt: 'desc' }],
    include: {
      job: { select: { id: true, company: true, role: true, source: true } },
      resume: { select: { id: true, title: true } },
      activities: { orderBy: { occurredAt: 'desc' }, take: 3 },
    },
  })
  return NextResponse.json({ applications })
}

