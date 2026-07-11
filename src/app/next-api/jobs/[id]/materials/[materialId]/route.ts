import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { deleteJobMaterial, MaterialNotFoundError, updateJobMaterial } from '@/lib/jobs/job-material-service'
import { parseJobMaterialContent } from '@/lib/jobs/job-material-contracts'
import { prisma } from '@/lib/prisma'

interface RouteContext { readonly params: Promise<{ id: string; materialId: string }> }
const updateSchema = z.object({ title: z.string().trim().min(1).max(120).optional(), text: z.string().max(20000) })

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  const { id, materialId } = await context.params
  const material = await prisma.jobMaterial.findFirst({ where: { id: materialId, jobId: id, job: { userId: user.id } } })
  if (!material) return NextResponse.json({ code: 'MATERIAL_NOT_FOUND', error: '材料不存在' }, { status: 404 })
  return NextResponse.json({ material: { ...material, content: parseJobMaterialContent(material.content) } })
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id, materialId } = await context.params
    const input = updateSchema.parse(await request.json())
    const material = await updateJobMaterial(user.id, id, materialId, input)
    return NextResponse.json({ material })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: 'INVALID_MATERIAL', error: error.issues[0]?.message ?? '材料内容不正确' }, { status: 400 })
    if (error instanceof MaterialNotFoundError) return NextResponse.json({ code: 'MATERIAL_NOT_FOUND', error: '材料不存在' }, { status: 404 })
    console.error('[jobs:materials:update] failed', error)
    return NextResponse.json({ code: 'MATERIAL_UPDATE_FAILED', error: '保存材料失败，请稍后重试' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ code: 'AUTH_REQUIRED', error: '请先登录' }, { status: 401 })
  try {
    const { id, materialId } = await context.params
    await deleteJobMaterial(user.id, id, materialId)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof MaterialNotFoundError) return NextResponse.json({ code: 'MATERIAL_NOT_FOUND', error: '材料不存在' }, { status: 404 })
    console.error('[jobs:materials:delete] failed', error)
    return NextResponse.json({ code: 'MATERIAL_DELETE_FAILED', error: '删除材料失败，请稍后重试' }, { status: 500 })
  }
}

