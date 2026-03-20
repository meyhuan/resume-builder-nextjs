import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUserRecord } from '@/lib/auth/get-current-user-record'
import { persistResumeAssets } from '@/lib/persist-resume-assets'

// GET /next-api/resumes - List all resumes for current user
export async function GET() {
  try {
    const currentUser = await getCurrentUserRecord()
    if (!currentUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: currentUser.dbUser.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        updatedAt: true,
        template: true
      }
    })
    return NextResponse.json(resumes)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
  }
}

// POST /next-api/resumes - Create a new resume
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, content, template } = body
    const persistedAssets = await persistResumeAssets({
      content,
      thumbnail: null,
    })

    const currentUser = await getCurrentUserRecord()
    if (!currentUser.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Creating resume
    const resume = await prisma.resume.create({
      data: {
        title: title || 'Untitled Resume',
        content: persistedAssets.content as Prisma.InputJsonValue,
        template: template || 'simple',
        user: {
          connect: { id: currentUser.dbUser.id }
        }
      }
    })
    
    return NextResponse.json(resume)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 })
  }
}
