import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { deleteOssAsset, uploadOssAsset } from '@/lib/upload-oss-asset'
import {
  MAX_PORTFOLIO_IMAGE_BYTES,
  MAX_PORTFOLIO_IMAGES,
} from '@/entities/resume/portfolio'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface RouteParams {
  readonly params: Promise<{ readonly id: string }>
}

async function resolveOwnedResume(id: string): Promise<{ id: string; userId: string; content: unknown } | null> {
  const cookieStore = await cookies()
  const wxId = cookieStore.get('auth_uid')?.value
  if (!wxId) return null
  return prisma.resume.findFirst({
    where: { id, user: { wxId } },
    select: { id: true, userId: true, content: true },
  })
}

function countPortfolioImages(content: unknown): number {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return 0
  const portfolio = (content as Record<string, unknown>).portfolio
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) return 0
  const images = (portfolio as Record<string, unknown>).images
  return Array.isArray(images) ? images.length : 0
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params
    const resume = await resolveOwnedResume(id)
    if (!resume) return NextResponse.json({ error: '未登录或简历不存在' }, { status: 404 })
    if (countPortfolioImages(resume.content) >= MAX_PORTFOLIO_IMAGES) {
      return NextResponse.json({ error: `作品集最多上传 ${MAX_PORTFOLIO_IMAGES} 张图片` }, { status: 400 })
    }

    const form = await request.formData()
    const entry = form.get('file')
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: '未检测到上传图片' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.has(entry.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WebP 图片' }, { status: 400 })
    }
    if (entry.size > MAX_PORTFOLIO_IMAGE_BYTES) {
      return NextResponse.json({ error: '单张图片不能超过 10MB' }, { status: 400 })
    }

    const source = Buffer.from(await entry.arrayBuffer())
    const output = await sharp(source, { failOn: 'error' })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, smartSubsample: true })
      .toBuffer({ resolveWithObject: true })
    if (!output.info.width || !output.info.height) {
      return NextResponse.json({ error: '无法读取图片尺寸' }, { status: 400 })
    }

    const uploaded = await uploadOssAsset({
      fileBuffer: output.data,
      mimeType: 'image/webp',
      extension: 'webp',
      directory: `portfolio/${resume.userId}/${resume.id}`,
    })
    return NextResponse.json({
      id: `portfolio-${randomUUID()}`,
      url: uploaded.url,
      objectKey: uploaded.key,
      width: output.info.width,
      height: output.info.height,
    })
  } catch (error: unknown) {
    console.error('[portfolio-images] upload failed', error)
    return NextResponse.json({ error: '图片上传失败，请稍后重试' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params
    const resume = await resolveOwnedResume(id)
    if (!resume) return NextResponse.json({ error: '未登录或简历不存在' }, { status: 404 })
    const body = await request.json() as { objectKey?: unknown }
    const objectKey = typeof body.objectKey === 'string' ? body.objectKey : ''
    const expectedPrefix = `portfolio/${resume.userId}/${resume.id}/`
    if (!objectKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: '无权删除该图片' }, { status: 403 })
    }
    await deleteOssAsset(objectKey)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[portfolio-images] delete failed', error)
    return NextResponse.json({ error: '图片删除失败，请稍后重试' }, { status: 500 })
  }
}
