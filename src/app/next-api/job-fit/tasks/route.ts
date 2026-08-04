import { after, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { prisma } from '@/lib/prisma'
import { requireJobFitUser, JobFitAuthError } from '@/lib/job-fit/auth'
import { hashResume } from '@/lib/job-fit/resume-content'
import { JobFitQuotaExceededError, reserveJobFitQuota } from '@/lib/job-fit/quota'
import { processJobFitTask } from '@/lib/job-fit/worker'

export const runtime = 'nodejs'

const CreateTaskSchema = z.object({
  sourceType: z.enum(['EXISTING', 'FILE', 'TEXT']),
  sourceResumeId: z.string().min(1).optional(),
  companyName: z.string().max(100).optional().default(''),
  jobTitle: z.string().trim().min(1, '请填写目标岗位').max(100),
  jobDescription: z.string().trim().min(20, '岗位描述至少需要 20 个字符').max(10_000),
  jobUrl: z.string().url('岗位链接格式不正确').max(1000).optional().or(z.literal('')),
  focusAreas: z.array(z.enum(['keywords', 'achievements', 'concise', 'structure'])).min(1).default(['keywords', 'achievements', 'concise']),
  optimizationMode: z.enum(['PROFESSIONAL', 'SPRINT']).default('PROFESSIONAL'),
})

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireJobFitUser()
    const url = new URL(request.url)
    const limit = Math.min(5, Math.max(1, Number(url.searchParams.get('limit') ?? '5')))
    const tasks = await prisma.jobFitTask.findMany({
      where: { userId: user.id, status: { not: 'DRAFT' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        status: true,
        stage: true,
        progress: true,
        scoring: true,
        tailoredResumeId: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        sourceResume: { select: { id: true, title: true } },
      },
    })
    return NextResponse.json({ tasks })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  let createdTaskId: string | undefined
  try {
    const user = await requireJobFitUser()
    const body = CreateTaskSchema.parse(await request.json())
    const idempotencyKey = (request.headers.get('x-idempotency-key') ?? '').trim()
    if (idempotencyKey.length < 8 || idempotencyKey.length > 120) {
      return NextResponse.json({ error: '缺少有效的幂等键', code: 'INVALID_IDEMPOTENCY_KEY', retryable: false }, { status: 400 })
    }
    const existing = await prisma.jobFitTask.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } },
      select: { id: true, status: true },
    })
    if (existing) return NextResponse.json(taskLocation(existing.id, existing.status), { status: 200 })

    let source: { id: string; content: Prisma.JsonValue; title: string } | null = null
    if (body.sourceType === 'EXISTING') {
      if (!body.sourceResumeId) return NextResponse.json({ error: '请选择基础简历', code: 'SOURCE_REQUIRED', retryable: false }, { status: 400 })
      source = await prisma.resume.findFirst({
        where: { id: body.sourceResumeId, userId: user.id, kind: 'BASE' },
        select: { id: true, content: true, title: true },
      })
      if (!source) return NextResponse.json({ error: '基础简历不存在或无权访问', code: 'SOURCE_NOT_FOUND', retryable: false }, { status: 404 })
    }
    const sourceSnapshot = source
      ? normalizeResumeContent(source.content as unknown as Partial<ResumeData>, { fallbackId: source.id })
      : undefined
    const task = await prisma.jobFitTask.create({
      data: {
        userId: user.id,
        sourceType: body.sourceType,
        sourceResumeId: source?.id,
        idempotencyKey,
        companyName: body.companyName.trim() || null,
        jobTitle: body.jobTitle,
        jobDescription: body.jobDescription,
        jobUrl: body.jobUrl?.trim() || null,
        focusAreas: body.focusAreas as unknown as Prisma.InputJsonValue,
        optimizationMode: body.optimizationMode,
        sourceSnapshot: sourceSnapshot as unknown as Prisma.InputJsonValue | undefined,
        sourceHash: sourceSnapshot ? hashResume(sourceSnapshot) : null,
        status: source ? 'READY' : 'DRAFT',
        progress: 0,
      },
    })
    createdTaskId = task.id
    await prisma.jobFitTask.update({ where: { id: task.id }, data: { billingRootTaskId: task.id } })
    await reserveJobFitQuota(task.id, user.id, user.wxId)
    if (source) {
      await prisma.jobFitTask.update({ where: { id: task.id }, data: { status: 'QUEUED', progress: 5 } })
      after(() => processJobFitTask(task.id))
    }
    return NextResponse.json(taskLocation(task.id, source ? 'QUEUED' : 'DRAFT'), { status: 201 })
  } catch (error) {
    if (createdTaskId && error instanceof JobFitQuotaExceededError) {
      await prisma.jobFitTask.deleteMany({ where: { id: createdTaskId } })
    }
    return apiError(error)
  }
}

function taskLocation(taskId: string, status: string): Record<string, string> {
  return {
    taskId,
    status,
    processingUrl: `/dashboard/job-fit/${taskId}/processing`,
    resultUrl: `/dashboard/job-fit/${taskId}/result`,
  }
}

function apiError(error: unknown): NextResponse {
  if (error instanceof JobFitAuthError) return NextResponse.json({ error: error.message, code: error.code, retryable: false }, { status: error.status })
  if (error instanceof JobFitQuotaExceededError) return NextResponse.json({ error: error.message, code: error.code, retryable: false }, { status: 429 })
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? '提交内容不完整', code: 'INVALID_INPUT', retryable: false }, { status: 400 })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json({ error: '重复提交，请继续查看已有任务', code: 'DUPLICATE_TASK', retryable: true }, { status: 409 })
  }
  console.error('[job-fit/tasks]', error)
  return NextResponse.json({ error: '岗位定制服务暂时不可用', code: 'INTERNAL_ERROR', retryable: true }, { status: 500 })
}
