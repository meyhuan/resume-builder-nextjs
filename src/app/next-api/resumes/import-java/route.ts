import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'

interface ImportJavaBody {
  readonly sid: unknown
  readonly timestamp: unknown
  readonly sign: unknown
  readonly javaId: string
  readonly title: string
  readonly template: string
  readonly content: Record<string, unknown>
}

/**
 * POST /next-api/resumes/import-java
 *
 * Called by the WeChat mini-program home page to import a single resume
 * that was fetched from the Java backend and converted to ResumeData format
 * on the mini-program side.
 *
 * Authentication: uses IMPORT_SECRET env var instead of a cookie, because
 * the mini-program calls this directly without a browser session.
 *
 * Idempotent: if a resume with the same (userId, meta.javaId) already exists
 * it is skipped and `{ created: false, reason: "already_exists" }` is returned.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: ImportJavaBody
  try {
    body = (await req.json()) as ImportJavaBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sid: string = String(body.sid ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')
  const { javaId, title, template, content } = body

  const signError = verifyMiniSign({ sid, timestamp, sign })
  if (signError) {
    return NextResponse.json({ error: signError }, { status: 403 })
  }
  if (!sid || !javaId || !content) {
    return NextResponse.json({ error: 'Missing required fields: sid, javaId, content' }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { wxId: sid },
    update: {},
    create: { wxId: sid, name: `用户_${sid}` },
    select: { id: true },
  })

  const existing = await prisma.resume.findFirst({
    where: {
      userId: user.id,
      meta: { path: ['javaId'], equals: javaId },
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ created: false, reason: 'already_exists' })
  }

  await prisma.resume.create({
    data: {
      userId: user.id,
      title: title || '我的简历',
      template: template || 'simple',
      content: content as Prisma.InputJsonValue,
      meta: {
        javaId,
        importedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({ created: true })
}
