import { after, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireJobFitUser, JobFitAuthError } from '@/lib/job-fit/auth'
import { wakeJobFitWorker } from '@/lib/job-fit/worker'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireJobFitUser()
    const { id } = await context.params
    const task = await prisma.jobFitTask.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        sourceType: true,
        sourceResumeId: true,
        companyName: true,
        jobTitle: true,
        status: true,
        stage: true,
        progress: true,
        errorCode: true,
        errorMessage: true,
        retryable: true,
        tailoredResumeId: true,
        cancelRequestedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!task) return NextResponse.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
    if (task.status === 'QUEUED' || (task.status === 'RUNNING' && task.progress < 100)) after(() => wakeJobFitWorker())
    return NextResponse.json({
      task,
      processingUrl: `/dashboard/job-fit/${task.id}/processing`,
      resultUrl: task.status === 'COMPLETED' ? `/dashboard/job-fit/${task.id}/result` : null,
    })
  } catch (error) {
    if (error instanceof JobFitAuthError) return NextResponse.json({ error: error.message, code: error.code, retryable: false }, { status: error.status })
    console.error('[job-fit/task:get]', error)
    return NextResponse.json({ error: '任务状态加载失败', code: 'TASK_LOAD_FAILED', retryable: true }, { status: 500 })
  }
}
