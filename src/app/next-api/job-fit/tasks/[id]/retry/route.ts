import { randomUUID } from 'crypto'
import { after, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withJobFitApi } from '@/lib/job-fit/api-route'
import { reserveJobFitQuota } from '@/lib/job-fit/quota'
import { processJobFitTask } from '@/lib/job-fit/worker'

export const runtime = 'nodejs'

export const POST = withJobFitApi(async (request: Request, context: { params: Promise<{ id: string }> }, user): Promise<Response> => {
  const { id } = await context.params
  const task = await prisma.jobFitTask.findFirst({ where: { id, userId: user.id } })
  if (!task) return NextResponse.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
  if (!['FAILED', 'CANCELLED', 'EXPIRED'].includes(task.status)) {
    return NextResponse.json({ error: '当前任务不能重试', code: 'INVALID_TASK_STATE', retryable: false }, { status: 409 })
  }
  if (!task.sourceSnapshot) {
    return NextResponse.json({ error: '来源简历不可用，请重新选择简历', code: 'SOURCE_NOT_AVAILABLE', retryable: false }, { status: 422 })
  }
  const root = task.billingRootTaskId ?? task.id
  const retryResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${root})::bigint)`
    const active = await tx.jobFitTask.findFirst({
      where: { userId: user.id, billingRootTaskId: root, status: { in: ['READY', 'QUEUED', 'RUNNING', 'COMPLETED'] } },
      select: { id: true, status: true },
    })
    if (active) return { active }
    const retry = await tx.jobFitTask.create({
      data: {
        userId: user.id,
        sourceType: task.sourceType,
        sourceResumeId: task.sourceResumeId,
        idempotencyKey: request.headers.get('x-idempotency-key')?.trim() || randomUUID(),
        retryOfTaskId: task.id,
        billingRootTaskId: root,
        companyName: task.companyName,
        jobTitle: task.jobTitle,
        jobDescription: task.jobDescription,
        jobUrl: task.jobUrl,
        focusAreas: task.focusAreas as Prisma.InputJsonValue,
        optimizationMode: task.optimizationMode,
        sourceSnapshot: task.sourceSnapshot as Prisma.InputJsonValue,
        sourceHash: task.sourceHash,
        status: 'READY',
        progress: 0,
      },
    })
    return { retry }
  })
  if (retryResult.active) return NextResponse.json({ taskId: retryResult.active.id, status: retryResult.active.status, processingUrl: `/dashboard/job-fit/${retryResult.active.id}/processing` })
  const retry = retryResult.retry
  if (!retry) throw new Error('JOB_FIT_RETRY_CREATE_FAILED')
  try {
    await reserveJobFitQuota(retry.id, user.id, user.wxId)
  } catch (error) {
    await prisma.jobFitTask.deleteMany({ where: { id: retry.id, quotaState: { in: ['NONE', 'RELEASED'] } } })
    throw error
  }
  await prisma.jobFitTask.update({ where: { id: retry.id }, data: { status: 'QUEUED', progress: 5 } })
  after(() => processJobFitTask(retry.id))
  return NextResponse.json({ taskId: retry.id, status: 'QUEUED', processingUrl: `/dashboard/job-fit/${retry.id}/processing` }, { status: 201 })
})
