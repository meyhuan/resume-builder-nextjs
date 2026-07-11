import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { updateApplicationSchema } from '@/lib/applications/application-contracts'
import { ApplicationNotFoundError, deleteApplication, updateApplication } from '@/lib/applications/application-service'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = updateApplicationSchema.parse(await request.json())
    const application = await updateApplication(user.id, id, input)
    return NextResponse.json({ application })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_APPLICATION', error: error.issues[0]?.message ?? '投递信息不正确' }, { status: 400 })
    if (error instanceof ApplicationNotFoundError) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
    console.error('[applications:update] failed', error)
    return NextResponse.json({ code: 'APPLICATION_UPDATE_FAILED', error: '更新投递记录失败' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    await deleteApplication(user.id, id)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
    console.error('[applications:delete] failed', error)
    return NextResponse.json({ code: 'APPLICATION_DELETE_FAILED', error: '删除投递记录失败' }, { status: 500 })
  }
}

