import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ApplicationNotFoundError } from '@/lib/applications/application-service'
import { outcomeSchema } from '@/lib/interviews/interview-contracts'
import { saveOutcome } from '@/lib/interviews/interview-service'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id } = await context.params
  const outcome = await prisma.outcome.findFirst({ where: { applicationId: id, job: { userId: user.id } } })
  return NextResponse.json({ outcome })
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = outcomeSchema.parse(await request.json())
    const outcome = await saveOutcome(user.id, id, input)
    return NextResponse.json({ outcome })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_OUTCOME', error: error.issues[0]?.message ?? '结果信息不正确' }, { status: 400 })
    if (error instanceof ApplicationNotFoundError) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
    console.error('[outcomes:save] failed', error)
    return NextResponse.json({ code: 'OUTCOME_SAVE_FAILED', error: '保存结果反馈失败' }, { status: 500 })
  }
}

