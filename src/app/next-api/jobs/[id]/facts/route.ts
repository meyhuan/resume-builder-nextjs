import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseResumeFacts } from '@/lib/jobs/fact-extractor'
import { confirmJobFacts, FactsStaleError, InvalidFactSelectionError, JobNotFoundError, SourceResumeMissingError } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string }> }

const confirmFactsSchema = z.object({
  confirmedFactIds: z.array(z.string().min(1)).min(1, '至少确认一条事实'),
  expectedContentHash: z.string().length(64),
})

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id } = await context.params
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { factSet: true, baseResume: { select: { id: true, title: true } } },
  })
  if (!job) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })

  return NextResponse.json({
    facts: parseResumeFacts(job.factSet.facts),
    confirmedFactIds: job.factSet.confirmedFactIds,
    contentHash: job.factSet.sourceContentHash,
    revision: job.factSet.revision,
    confirmedAt: job.factSet.confirmedAt,
    baseResume: job.baseResume,
  })
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })

  try {
    const { id } = await context.params
    const input = confirmFactsSchema.parse(await request.json())
    const factSet = await confirmJobFacts(user.id, id, input.confirmedFactIds, input.expectedContentHash)
    return NextResponse.json({ revision: factSet.revision, confirmedAt: factSet.confirmedAt })
  } catch (error) {
    if (error instanceof ZodError || error instanceof InvalidFactSelectionError) {
      return NextResponse.json({ code: 'INVALID_FACT_SELECTION', error: error instanceof ZodError ? error.issues[0]?.message : '事实选择无效' }, { status: 400 })
    }
    if (error instanceof FactsStaleError) return NextResponse.json({ code: 'FACTS_STALE', error: '母版内容已经变化，请先同步事实' }, { status: 409 })
    if (error instanceof SourceResumeMissingError) return NextResponse.json({ code: 'SOURCE_RESUME_MISSING', error: '原母版已删除，无法重新确认事实' }, { status: 409 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:facts:confirm] failed', error)
    return NextResponse.json({ code: 'FACT_CONFIRM_FAILED', error: '确认事实失败，请稍后重试' }, { status: 500 })
  }
}

