import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { JOB_MATERIAL_TYPES } from '@/lib/jobs/job-material-contracts'
import { generateJobMaterial, MaterialFactsNotConfirmedError, MaterialModelOutputError, MaterialQuotaExceededError } from '@/lib/jobs/job-material-service'
import { JobNotFoundError } from '@/lib/jobs/job-service'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string }> }
const generateSchema = z.object({ type: z.enum(JOB_MATERIAL_TYPES), regenerate: z.boolean().optional().default(false) })

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id } = await context.params
  const job = await prisma.job.findFirst({ where: { id, userId: user.id }, select: { id: true } })
  if (!job) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
  const materials = await prisma.jobMaterial.findMany({ where: { jobId: id }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({ materials })
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id } = await context.params
    const input = generateSchema.parse(await request.json())
    const result = await generateJobMaterial(user.id, id, input.type, input.regenerate)
    return NextResponse.json(result, { status: result.cached ? 200 : 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_MATERIAL_TYPE', error: '材料类型不正确' }, { status: 400 })
    if (error instanceof MaterialQuotaExceededError) return NextResponse.json({ code: 'QUOTA_EXCEEDED', error: error.message, quotaExceeded: true }, { status: 429 })
    if (error instanceof MaterialModelOutputError) return NextResponse.json({ code: 'MODEL_OUTPUT_INVALID', error: '本次材料规划不完整，请重新生成' }, { status: 502 })
    if (error instanceof MaterialFactsNotConfirmedError) return NextResponse.json({ code: 'FACTS_NOT_CONFIRMED', error: '请先确认可用于生成材料的真实事实' }, { status: 409 })
    if (error instanceof JobNotFoundError) return NextResponse.json({ code: 'JOB_NOT_FOUND', error: '岗位不存在' }, { status: 404 })
    console.error('[jobs:materials:generate] failed', error)
    return NextResponse.json({ code: 'MATERIAL_GENERATE_FAILED', error: '材料生成失败，请稍后重试' }, { status: 500 })
  }
}
