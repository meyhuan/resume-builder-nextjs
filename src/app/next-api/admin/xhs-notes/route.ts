import { NextRequest, NextResponse } from 'next/server'
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'
import { prisma } from '@/lib/prisma'
import { verifyAdminPassword } from '@/lib/verify-admin-password'

const XHS_ADMIN_TOKEN = process.env.XHS_ADMIN_TOKEN || process.env.ADMIN_PASSWORD || ''

interface JavaSubmissionRow {
  id: number
  userId: number
  topicKey?: string
  noteUrl?: string
  noteId?: string
  status?: number
  rejectReason?: string
  needsManualCheck?: boolean
  baseDays?: number
  bonusDays?: number
  grantedDays?: number
  views?: number
  likes?: number
  collects?: number
  comments?: number
  inviteCode?: string
  inviteConversions?: number
  createdAt?: string
}

async function enrichRowsWithDrafts(rows: JavaSubmissionRow[]) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const javaUserIds = Array.from(new Set(rows.map((r) => String(r.userId)).filter(Boolean)))
  try {
    const users = await prisma.user.findMany({
      where: { javaUserId: { in: javaUserIds } },
      select: {
        id: true,
        javaUserId: true,
        name: true,
        xhsNoteDrafts: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            topic: true,
            output: true,
            createdAt: true,
          },
        },
      },
    })
    const userMap = new Map(users.map((u) => [String(u.javaUserId), u]))
    return rows.map((row) => {
      const matchedUser = userMap.get(String(row.userId))
      const matchedDraft =
        matchedUser?.xhsNoteDrafts.find((d) => d.topic === row.topicKey) ||
        matchedUser?.xhsNoteDrafts[0] ||
        null
      return {
        ...row,
        userName: matchedUser?.name || null,
        draft: matchedDraft
          ? {
              id: matchedDraft.id,
              topic: matchedDraft.topic,
              output: matchedDraft.output,
              createdAt: matchedDraft.createdAt.toISOString(),
            }
          : null,
      }
    })
  } catch {
    return rows
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : ''
  if (!(await verifyAdminPassword(adminPassword))) {
    return NextResponse.json({ error: '管理员密码不正确' }, { status: 403 })
  }

  const action = typeof body.action === 'string' ? body.action : 'list'
  const javaBase = getServerJavaApiBaseUrl()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (XHS_ADMIN_TOKEN) headers['X-Xhs-Admin-Token'] = XHS_ADMIN_TOKEN

  if (action === 'drafts') {
    const drafts = await prisma.xhsNoteDraft.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { id: true, name: true, wxId: true, javaUserId: true } },
      },
    })
    return NextResponse.json({ status: 100, data: drafts })
  }

  const response =
    (action === 'list' || action === 'config')
      ? await fetch(
          `${javaBase}/xhs-note/admin/${action}${
            body.status === undefined ? '' : `?status=${encodeURIComponent(String(body.status))}`
          }`,
          { headers, cache: 'no-store' }
        )
      : await fetch(`${javaBase}/xhs-note/admin/${action}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          cache: 'no-store',
        })

  const data = (await response.json().catch(() => null)) as { status?: number; data?: unknown } | null
  if (!data) {
    return NextResponse.json({ error: 'Invalid xhs admin response' }, { status: response.status })
  }

  if (action === 'list' && Array.isArray(data.data)) {
    data.data = await enrichRowsWithDrafts(data.data as JavaSubmissionRow[])
  }

  return NextResponse.json(data, { status: response.status })
}
