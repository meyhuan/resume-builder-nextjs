import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/resumes/[id] - Get a single resume
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 })
  }
}

// PUT /api/resumes/[id] - Update a resume
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_uid")?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json()
    const { title, content, template, thumbnail } = body
    
    const resume = await prisma.resume.update({
      where: { 
        id,
        user: { wxId: userId }
      },
      data: {
        title,
        content,
        template,
        thumbnail
      }
    })
    
    return NextResponse.json(resume)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 })
  }
}

// DELETE /api/resumes/[id] - Delete a resume
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
  }
}
