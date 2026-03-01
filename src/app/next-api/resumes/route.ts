import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// GET /next-api/resumes - List all resumes for current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resumes = await prisma.resume.findMany({
      where: { user: { wxId: userId } },
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
    
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Creating resume
    const resume = await prisma.resume.create({
      data: {
        title: title || 'Untitled Resume',
        content: content || {},
        template: template || 'simple',
        user: {
          connectOrCreate: {
            where: { wxId: userId },
            create: { wxId: userId }
          }
        }
      }
    })
    
    return NextResponse.json(resume)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 })
  }
}
