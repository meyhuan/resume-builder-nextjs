import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'

/**
 * POST /next-api/resumes/mini
 *
 * Unified resume management endpoint for the WeChat mini-program.
 * All actions share the same HMAC-MD5 signature scheme.
 *
 * Request body:
 *   { action, sid, timestamp, sign, ...actionFields }
 *
 * Actions:
 *   list                          → returns resume list
 *   create   { title, template }  → creates empty resume
 *   copy     { resumeId }         → copies a resume
 *   rename   { resumeId, title }  → renames a resume
 *   delete   { resumeId }         → deletes a resume
 */

type Action = 'list' | 'create' | 'copy' | 'rename' | 'delete'

interface RequestBody {
  action: Action
  wxId: unknown
  timestamp: unknown
  sign: unknown
  resumeId?: string
  title?: string
  template?: string
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wxId: string = String(body.wxId ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')

  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    return NextResponse.json({ error: signError }, { status: 403 })
  }

  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
    select: { id: true },
  })

  const { action } = body

  if (action === 'list') {
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, thumbnail: true, updatedAt: true, template: true },
    })
    return NextResponse.json(resumes)
  }

  if (action === 'create') {
    const title: string = body.title || '新简历'
    const template: string = body.template || 'simple'
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        title,
        template,
        content: { sections: [] } as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, title: true, template: true, updatedAt: true },
    })
    return NextResponse.json(resume)
  }

  if (action === 'copy') {
    const { resumeId } = body
    if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
    const source = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
    })
    if (!source) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    const copy = await prisma.resume.create({
      data: {
        userId: user.id,
        title: source.title + ' (副本)',
        template: source.template ?? 'simple',
        content: source.content as Prisma.InputJsonValue,
        thumbnail: source.thumbnail,
      },
      select: { id: true, title: true, template: true, updatedAt: true },
    })
    return NextResponse.json(copy)
  }

  if (action === 'rename') {
    const { resumeId, title } = body
    if (!resumeId || !title) return NextResponse.json({ error: 'Missing resumeId or title' }, { status: 400 })
    const resume = await prisma.resume.updateMany({
      where: { id: resumeId, userId: user.id },
      data: { title },
    })
    if (resume.count === 0) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { resumeId } = body
    if (!resumeId) return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 })
    const deleted = await prisma.resume.deleteMany({
      where: { id: resumeId, userId: user.id },
    })
    if (deleted.count === 0) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
