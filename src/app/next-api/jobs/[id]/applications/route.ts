import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createApplicationSchema } from '@/lib/applications/application-contracts'
import { createApplication, InvalidApplicationAssetError } from '@/lib/applications/application-service'
import { JobNotFoundError } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id } = await context.params
  const job = await prisma.job.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!job) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
  const applications = await prisma.application.findMany({ where: { jobId: id }, include: { activities: { orderBy: { occurredAt: 'desc' } } }, orderBy: { appliedAt: 'desc' } })
  return NextResponse.json({ applications })
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = createApplicationSchema.parse(await request.json())
    const application = await createApplication(user.id, id, input)
    return NextResponse.json({ application }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_APPLICATION', error: error.issues[0]?.message ?? '投递信息不完整' }, { status: 400 })
    if (error instanceof InvalidApplicationAssetError) return NextResponse.json({ code: 'INVALID_APPLICATION_ASSET', error: '选择的简历或材料不属于当前岗位' }, { status: 409 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[applications:create] failed', error)
    return NextResponse.json({ code: 'APPLICATION_CREATE_FAILED', error: '创建投递记录失败' }, { status: 500 })
  }
}

