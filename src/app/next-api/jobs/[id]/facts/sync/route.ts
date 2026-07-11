import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseResumeFacts } from '@/lib/jobs/fact-extractor'
import { JobNotFoundError, SourceResumeMissingError, syncJobFacts } from '@/lib/jobs/job-service'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })

  try {
    const { id } = await context.params
    const factSet = await syncJobFacts(user.id, id)
    return NextResponse.json({
      facts: parseResumeFacts(factSet.facts),
      confirmedFactIds: factSet.confirmedFactIds,
      contentHash: factSet.sourceContentHash,
      revision: factSet.revision,
      confirmedAt: factSet.confirmedAt,
    })
  } catch (error) {
    if (error instanceof SourceResumeMissingError) return NextResponse.json({ code: 'SOURCE_RESUME_MISSING', error: '原母版已删除，无法同步事实' }, { status: 409 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:facts:sync] failed', error)
    return NextResponse.json({ code: 'FACT_SYNC_FAILED', error: '同步事实失败，请稍后重试' }, { status: 500 })
  }
}

