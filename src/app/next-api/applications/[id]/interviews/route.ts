import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { ApplicationNotFoundError } from '@/lib/applications/application-service'
import { createInterviewSchema } from '@/lib/interviews/interview-contracts'
import { createInterview } from '@/lib/interviews/interview-service'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id } = await context.params
  const application = await prisma.application.findFirst({ where: { id, job: { userId: user.id } }, select: { id: true } })
  if (!application) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
  const interviews = await prisma.interview.findMany({ where: { applicationId: id }, orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }] })
  return NextResponse.json({ interviews })
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = createInterviewSchema.parse(await request.json())
    const interview = await createInterview(user.id, id, input)
    return NextResponse.json({ interview }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_INTERVIEW', error: error.issues[0]?.message ?? '面试信息不完整' }, { status: 400 })
    if (error instanceof ApplicationNotFoundError) return NextResponse.json({ code: 'APPLICATION_NOT_FOUND', error: '投递记录不存在' }, { status: 404 })
    console.error('[interviews:create] failed', error)
    return NextResponse.json({ code: 'INTERVIEW_CREATE_FAILED', error: '创建面试记录失败' }, { status: 500 })
  }
}

