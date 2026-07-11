import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createJobSchema } from '@/lib/jobs/job-contracts'
import { BaseResumeNotFoundError, createJobWorkspace } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'
import {
  isResumeLimitExceededError,
  MAX_RESUME_COUNT,
  RESUME_LIMIT_EXCEEDED_CODE,
  RESUME_LIMIT_EXCEEDED_MESSAGE,
} from '@/lib/resume-limits'

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })

  const status = new URL(request.url).searchParams.get('status') ?? 'active'
  const jobs = await prisma.job.findMany({
    where: {
      userId: user.id,
      ...(status === 'archived'
        ? { status: 'ARCHIVED' }
        : status === 'all'
          ? {}
          : { status: { not: 'ARCHIVED' } }),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      company: true,
      role: true,
      source: true,
      status: true,
      matchSnapshot: true,
      lastExportedAt: true,
      updatedAt: true,
      tailoredResume: { select: { id: true, thumbnail: true } },
    },
  })

  return NextResponse.json({ jobs })
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })

  try {
    const input = createJobSchema.parse(await request.json())
    const created = await createJobWorkspace(user.id, input)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: 'INVALID_JOB_INPUT', error: error.issues[0]?.message ?? '岗位信息不完整', issues: error.flatten() },
        { status: 400 },
      )
    }
    if (error instanceof BaseResumeNotFoundError) {
      return NextResponse.json({ code: 'BASE_RESUME_NOT_FOUND', error: '选择的母版简历不存在' }, { status: 404 })
    }
    if (isResumeLimitExceededError(error)) {
      return NextResponse.json(
        { code: RESUME_LIMIT_EXCEEDED_CODE, error: RESUME_LIMIT_EXCEEDED_MESSAGE, limit: MAX_RESUME_COUNT },
        { status: 409 },
      )
    }
    console.error('[jobs:create] failed', error)
    return NextResponse.json({ code: 'JOB_CREATE_FAILED', error: '创建岗位失败，请稍后重试' }, { status: 500 })
  }
}

