import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { persistResumeAssets } from '@/lib/persist-resume-assets'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /next-api/resumes/[id] - Get a single resume
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { 
        id,
        user: { wxId: userId }
      }
    })
    
    if (!resume) {
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
    const cookieStore = await cookies();
    userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    updateStep = 'parse-body'
    const body = await req.json()
    const { title, content, template, thumbnail } = body
    const normalizedContent = normalizeResumeContent(
      content as Partial<ResumeData> & Record<string, unknown>,
      { fallbackId: resumeId },
    )
    updateStep = 'persist-assets'
    const persistedAssets = await persistResumeAssets({
      content: normalizedContent as unknown as Record<string, unknown>,
      thumbnail,
      customPrefix: resumeId,
    })
    
    updateStep = 'update-database'
    const data: Prisma.ResumeUpdateInput = {
      content: persistedAssets.content as Prisma.InputJsonValue,
      template,
      thumbnail: persistedAssets.thumbnail,
    }
    if (typeof title === 'string' && title.trim()) {
      data.title = title.trim()
    }

    const resume = await prisma.resume.update({
      where: { 
        id,
        user: { wxId: userId }
      },
      data,
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
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.resume.delete({
      where: { 
        id,
        user: { wxId: userId }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }
}
