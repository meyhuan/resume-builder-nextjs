import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { generateJobSuggestions, TailorInputStaleError, TailorModelOutputError, TailorNoContentError, TailorQuotaExceededError } from '@/lib/jobs/job-tailor'
import { JobNotFoundError } from '@/lib/jobs/job-service'

interface RouteContext { readonly params: Promise<{ id: string }> }
const inputSchema = z.object({ regenerate: z.boolean().optional().default(false) })

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = inputSchema.parse(await request.json().catch(() => ({})))
    const result = await generateJobSuggestions(user.id, id, input.regenerate)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_INPUT', error: '请求参数不正确' }, { status: 400 })
    if (error instanceof TailorQuotaExceededError) return NextResponse.json({ code: 'QUOTA_EXCEEDED', error: error.message, quotaExceeded: true }, { status: 429 })
    if (error instanceof TailorModelOutputError) return NextResponse.json({ code: 'MODEL_OUTPUT_INVALID', error: '本次建议生成不完整，请重新生成' }, { status: 502 })
    if (error instanceof TailorInputStaleError) return NextResponse.json({ code: 'TAILOR_INPUT_STALE', error: '事实尚未确认或已经变化，请重新确认' }, { status: 409 })
    if (error instanceof TailorNoContentError) return NextResponse.json({ code: 'NO_VALID_SUGGESTIONS', error: '已确认事实中没有足够内容与当前岗位要求形成可靠对应' }, { status: 422 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:tailor] failed', error)
    return NextResponse.json({ code: 'TAILOR_FAILED', error: 'AI 建议生成失败，请稍后重试' }, { status: 500 })
  }
}
