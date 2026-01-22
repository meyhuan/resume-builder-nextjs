import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/resumes - List all resumes for current user
export async function GET() {
  // TODO: Get user ID from session/auth
  // For now, we'll fetch all resumes (demo mode) or handle auth later
  try {
    const resumes = await prisma.resume.findMany({
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
  }
}

// POST /api/resumes - Create a new resume
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, content, template } = body
    
    // Demo user ID
    const userId = 'demo-user-id' 

    // Ensure user exists (demo only)
    let user = await prisma.user.findUnique({ where: { clerkId: userId } })
    // Wait, let's check schema.
    
    // Creating resume
    const resume = await prisma.resume.create({
      data: {
        title: title || 'Untitled Resume',
        content: content || {},
        template: template || 'simple',
        user: {
          connectOrCreate: {
            where: { clerkId: userId },
            create: { clerkId: userId, email: 'demo@example.com' }
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
