import { after, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withJobFitApi } from '@/lib/job-fit/api-route'
import { reserveJobFitQuota } from '@/lib/job-fit/quota'
import { processJobFitTask } from '@/lib/job-fit/worker'

export const runtime = 'nodejs'

export const POST = withJobFitApi(async (_request: Request, context: { params: Promise<{ id: string }> }, user): Promise<Response> => {
  const { id } = await context.params
  const task = await prisma.jobFitTask.findFirst({ where: { id, userId: user.id } })
  if (!task) return NextResponse.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
  if (!task.sourceSnapshot || !task.jobTitle || !task.jobDescription) {
    return NextResponse.json({ error: '简历或岗位信息不完整', code: 'INVALID_TASK_INPUT', retryable: false }, { status: 422 })
  }
  if (task.status === 'COMPLETED') return NextResponse.json({ taskId: id, resultUrl: `/dashboard/job-fit/${id}/result` })
  if (!['DRAFT', 'READY', 'FAILED'].includes(task.status)) {
    return NextResponse.json({ error: '任务已经开始', code: 'INVALID_TASK_STATE', retryable: false }, { status: 409 })
  }
  await reserveJobFitQuota(id, user.id, user.wxId)
  await prisma.jobFitTask.update({ where: { id }, data: { status: 'QUEUED', progress: 5, errorCode: null, errorMessage: null, retryable: false } })
  after(() => processJobFitTask(id))
  return NextResponse.json({ taskId: id, status: 'QUEUED', processingUrl: `/dashboard/job-fit/${id}/processing` })
})
