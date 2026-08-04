import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withJobFitApi } from '@/lib/job-fit/api-route'
import { releaseJobFitQuota } from '@/lib/job-fit/quota'

export const POST = withJobFitApi(async (_request: Request, context: { params: Promise<{ id: string }> }, user): Promise<Response> => {
  const { id } = await context.params
  const task = await prisma.jobFitTask.findFirst({ where: { id, userId: user.id }, select: { status: true } })
  if (!task) return NextResponse.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
  if (task.status === 'COMPLETED') return NextResponse.json({ error: '已完成的任务不能取消', code: 'TASK_COMPLETED', retryable: false }, { status: 409 })
  if (task.status === 'CANCELLED') return NextResponse.json({ taskId: id, status: 'CANCELLED' })
  if (task.status === 'RUNNING') {
    await prisma.jobFitTask.update({ where: { id }, data: { cancelRequestedAt: new Date() } })
    return NextResponse.json({ taskId: id, status: 'CANCELLING' })
  }
  await prisma.jobFitTask.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelRequestedAt: new Date(), progress: 0 } })
  await releaseJobFitQuota(id)
  return NextResponse.json({ taskId: id, status: 'CANCELLED' })
})
