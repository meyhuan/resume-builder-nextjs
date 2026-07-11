import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { addActivitySchema } from '@/lib/applications/application-contracts'
import { addApplicationActivity, ApplicationNotFoundError } from '@/lib/applications/application-service'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = addActivitySchema.parse(await request.json())
    const activity = await addApplicationActivity(user.id, id, input)
    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_ACTIVITY', error: error.issues[0]?.message ?? '记录内容不正确' }, { status: 400 })
    if (error instanceof ApplicationNotFoundError) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
    console.error('[applications:activity] failed', error)
    return NextResponse.json({ code: 'ACTIVITY_CREATE_FAILED', error: '添加记录失败' }, { status: 500 })
  }
}

