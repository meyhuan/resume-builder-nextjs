import { Prisma } from '@prisma/client'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { prisma } from '@/lib/prisma'
import { withJobFitApi } from '@/lib/job-fit/api-route'
import { parseResumeFile, parseResumeText, type JobFitUploadedFile } from '@/lib/job-fit/import-source'
import { hashResume } from '@/lib/job-fit/resume-content'
import { releaseJobFitQuota, reserveJobFitQuota } from '@/lib/job-fit/quota'
import { wakeJobFitWorker } from '@/lib/job-fit/worker'
import { assertCanCreateResumeForUserId } from '@/lib/resume-limits'

export const runtime = 'nodejs'

export const POST = withJobFitApi(async (request: Request, context: { params: Promise<{ id: string }> }, user): Promise<Response> => {
  const { id } = await context.params
  const task = await prisma.jobFitTask.findFirst({ where: { id, userId: user.id } })
  if (!task) return Response.json({ error: '任务不存在', code: 'TASK_NOT_FOUND', retryable: false }, { status: 404 })
  if (!['DRAFT', 'READY', 'FAILED'].includes(task.status)) {
    return Response.json({ error: '当前任务状态不能重新解析来源', code: 'INVALID_TASK_STATE', retryable: false }, { status: 409 })
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const send = async (type: string, data: Record<string, unknown>): Promise<void> => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`))
  }
  const run = async (): Promise<void> => {
    try {
      await reserveJobFitQuota(task.id, user.id, user.wxId)
      await assertCanCreateResumeForUserId(user.id)
      await prisma.jobFitTask.update({ where: { id: task.id }, data: { status: 'PARSING_SOURCE', stage: 'PREPARE', progress: 5, errorCode: null, errorMessage: null } })
      await send('stage', { progress: 5, message: '正在准备基础简历' })
      const contentType = request.headers.get('content-type') ?? ''
      let resume: ResumeData
      let title = '导入的基础简历'
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData()
        const candidate = form.get('file') as Partial<JobFitUploadedFile> | null
        if (!candidate || typeof candidate.name !== 'string' || typeof candidate.size !== 'number' || typeof candidate.arrayBuffer !== 'function') {
          throw new Error('请上传 PDF 或 Word 简历')
        }
        title = candidate.name.replace(/\.(pdf|docx?)$/i, '') || title
        resume = await parseResumeFile(candidate as JobFitUploadedFile, async (progress, message) => send('stage', { progress, message }))
      } else {
        const body = await request.json() as { rawText?: string; title?: string }
        title = body.title?.trim() || title
        await send('stage', { progress: 25, message: 'AI 正在识别简历结构' })
        resume = await parseResumeText(body.rawText ?? '')
      }
      const normalized = normalizeResumeContent(resume, { fallbackId: `job-fit-source-${task.id}` })
      const baseResume = await prisma.resume.create({
        data: {
          title: normalized.name || title,
          content: normalized as unknown as Prisma.InputJsonValue,
          template: 'simple',
          kind: 'BASE',
          meta: { source: 'job_fit_import', jobFitTaskId: task.id },
          userId: user.id,
        },
      })
      await prisma.jobFitTask.update({
        where: { id: task.id },
        data: {
          sourceResumeId: baseResume.id,
          sourceSnapshot: normalized as unknown as Prisma.InputJsonValue,
          sourceHash: hashResume(normalized),
          status: 'QUEUED',
          progress: 5,
          errorCode: null,
          errorMessage: null,
          retryable: false,
        },
      })
      await send('done', { taskId: task.id, resumeId: baseResume.id, title: baseResume.title, processingUrl: `/dashboard/job-fit/${task.id}/processing` })
      void wakeJobFitWorker()
    } catch (error) {
      await prisma.jobFitTask.updateMany({
        where: { id: task.id, userId: user.id },
        data: { status: 'DRAFT', progress: 0, errorCode: 'SOURCE_PARSE_FAILED', errorMessage: error instanceof Error ? error.message : '简历解析失败', retryable: true },
      })
      await releaseJobFitQuota(task.id)
      await send('error', { error: error instanceof Error ? error.message : '简历解析失败', code: 'SOURCE_PARSE_FAILED', retryable: true })
    } finally {
      await writer.close()
    }
  }
  void run()
  return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
})
