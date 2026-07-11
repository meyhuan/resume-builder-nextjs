import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { analyzeJobWorkspace, FactsNotConfirmedError } from '@/lib/jobs/job-analysis'
import { JobNotFoundError } from '@/lib/jobs/job-service'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })

  try {
    const { id } = await context.params
    const analysis = await analyzeJobWorkspace(user.id, id)
    return NextResponse.json({ analysis })
  } catch (error) {
    if (error instanceof FactsNotConfirmedError) return NextResponse.json({ code: 'FACTS_NOT_CONFIRMED', error: '请先确认可用于分析的真实事实' }, { status: 409 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:analyze] failed', error)
    return NextResponse.json({ code: 'JOB_ANALYZE_FAILED', error: '岗位分析失败，请稍后重试' }, { status: 500 })
  }
}

