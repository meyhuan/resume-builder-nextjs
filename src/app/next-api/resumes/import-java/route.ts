import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import {
  assertCanCreateResumeForUserId,
  isResumeLimitExceededError,
  MAX_RESUME_COUNT,
  RESUME_LIMIT_EXCEEDED_CODE,
  RESUME_LIMIT_EXCEEDED_MESSAGE,
} from '@/lib/resume-limits'

interface ImportJavaBody {
  readonly wxId: unknown
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

  const wxId: string = String(body.wxId ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')
  const { javaId, title, template, content } = body

  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    return NextResponse.json({ error: signError }, { status: 403 })
  }
  if (!wxId || !javaId || !content) {
    return NextResponse.json({ error: 'Missing required fields: sid, javaId, content' }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
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

  try {
    await assertCanCreateResumeForUserId(user.id)
  } catch (error) {
    if (isResumeLimitExceededError(error)) {
      return NextResponse.json(
        {
          error: RESUME_LIMIT_EXCEEDED_MESSAGE,
          code: RESUME_LIMIT_EXCEEDED_CODE,
          limit: MAX_RESUME_COUNT,
          count: error.count,
        },
        { status: 409 },
      )
    }
    throw error
  }

  const normalizedContent = normalizeResumeContent(
    content as Partial<ResumeData> & Record<string, unknown>,
    { fallbackId: `migrated-${javaId}` },
  )

  await prisma.resume.create({
    data: {
      userId: user.id,
      title: title || '我的简历',
      template: template || 'simple',
      content: normalizedContent as unknown as Prisma.InputJsonValue,
      meta: {
        javaId,
        importedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({ created: true })
}
