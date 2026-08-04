import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withJobFitApi } from '@/lib/job-fit/api-route'

export const GET = withJobFitApi(async (_request: Request, context: { params: Promise<{ id: string }> }, user): Promise<Response> => {
  const { id } = await context.params
  const task = await prisma.jobFitTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      companyName: true,
      jobTitle: true,
      sourceResumeId: true,
      tailoredResumeId: true,
      sourceSnapshot: true,
      optimizedSnapshot: true,
      scoring: true,
      summary: true,
      changes: true,
      claims: true,
      readiness: true,
      resultSchemaVersion: true,
      engineVersion: true,
      optimizationMode: true,
      completedAt: true,
      sourceResume: { select: { title: true, template: true, meta: true } },
    },
  })
  if (!task) return NextResponse.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
  if (task.status !== 'COMPLETED' || !task.optimizedSnapshot || !task.tailoredResumeId) {
    return NextResponse.json({ error: '岗位定制结果尚未生成', code: 'RESULT_NOT_READY', retryable: task.status === 'FAILED' }, { status: 409 })
  }
  return NextResponse.json({ result: task })
})
