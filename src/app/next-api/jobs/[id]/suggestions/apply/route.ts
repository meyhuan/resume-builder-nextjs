import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { applyJobSuggestions, SuggestionConflictError, SuggestionSetNotFoundError, TailorInputStaleError, TailorNoContentError } from '@/lib/jobs/job-tailor'
import { JobNotFoundError } from '@/lib/jobs/job-service'

interface RouteContext { readonly params: Promise<{ id: string }> }
const applySchema = z.object({
  suggestionSetId: z.string().min(1),
  acceptedSuggestionIds: z.array(z.string().min(1)).min(1),
})

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = applySchema.parse(await request.json())
    const result = await applyJobSuggestions(user.id, id, input.suggestionSetId, input.acceptedSuggestionIds)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError || error instanceof SuggestionSetNotFoundError) return NextResponse.json({ code: 'SUGGESTION_SET_STALE', error: '建议已经失效，请重新生成' }, { status: 409 })
    if (error instanceof SuggestionConflictError) return NextResponse.json({ code: 'VERSION_CHANGED', error: '岗位简历已被修改，请重新生成建议', conflictIds: error.conflictIds }, { status: 409 })
    if (error instanceof TailorInputStaleError) return NextResponse.json({ code: 'TAILOR_INPUT_STALE', error: '事实或简历内容已经变化，请重新生成建议' }, { status: 409 })
    if (error instanceof TailorNoContentError) return NextResponse.json({ code: 'NO_OPTIMIZABLE_CONTENT', error: '没有可应用建议的简历内容' }, { status: 422 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:suggestions:apply] failed', error)
    return NextResponse.json({ code: 'SUGGESTION_APPLY_FAILED', error: '应用建议失败，请稍后重试' }, { status: 500 })
  }
}

