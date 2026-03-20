import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserRecord } from '@/lib/auth/get-current-user-record'
import { persistResumeAssets } from '@/lib/persist-resume-assets'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /next-api/resumes/[id] - Get a single resume
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUserRecord()
    if (!currentUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { id }
    })
    
    if (!resume || resume.userId !== currentUser.dbUser.id) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    
    return NextResponse.json(resume)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 })
  }
}

// PUT /next-api/resumes/[id] - Update a resume
export async function PUT(req: Request, { params }: RouteParams) {
  let resumeId: string = ''
  let userId: string | undefined
  let updateStep: string = 'init'
  try {
    const { id } = await params
    resumeId = id
    const currentUser = await getCurrentUserRecord()
    userId = currentUser.dbUser?.id
    if (!currentUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    updateStep = 'parse-body'
    const body = await req.json()
    const { title, content, template, thumbnail } = body
    updateStep = 'persist-assets'
    const persistedAssets = await persistResumeAssets({
      content,
      thumbnail,
      customPrefix: resumeId,
    })
    updateStep = 'verify-ownership'
    const existingResume = await prisma.resume.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existingResume || existingResume.userId !== currentUser.dbUser.id) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    
    updateStep = 'update-database'
    const resume = await prisma.resume.update({
      where: { id },
      data: {
        title,
        content: persistedAssets.content as Prisma.InputJsonValue,
        template,
        thumbnail: persistedAssets.thumbnail
      }
    })
    
    return NextResponse.json(resume)
  } catch (error: unknown) {
    console.error('resume-update-failed', {
      resumeId,
      userId,
      updateStep,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 })
  }
}

// DELETE /next-api/resumes/[id] - Delete a resume
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUserRecord()
    if (!currentUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingResume = await prisma.resume.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existingResume || existingResume.userId !== currentUser.dbUser.id) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    await prisma.resume.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }
}
