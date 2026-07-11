import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { updateInterviewSchema } from '@/lib/interviews/interview-contracts'
import { deleteInterview, InterviewNotFoundError, updateInterview } from '@/lib/interviews/interview-service'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = updateInterviewSchema.parse(await request.json())
    const interview = await updateInterview(user.id, id, input)
    return NextResponse.json({ interview })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_INTERVIEW', error: error.issues[0]?.message ?? '面试信息不正确' }, { status: 400 })
    if (error instanceof InterviewNotFoundError) return NextResponse.json({ code: 'INTERVIEW_NOT_FOUND', error: '面试记录不存在' }, { status: 404 })
    console.error('[interviews:update] failed', error)
    return NextResponse.json({ code: 'INTERVIEW_UPDATE_FAILED', error: '更新面试记录失败' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    await deleteInterview(user.id, id)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof InterviewNotFoundError) return NextResponse.json({ code: 'INTERVIEW_NOT_FOUND', error: '面试记录不存在' }, { status: 404 })
    console.error('[interviews:delete] failed', error)
    return NextResponse.json({ code: 'INTERVIEW_DELETE_FAILED', error: '删除面试记录失败' }, { status: 500 })
  }
}

