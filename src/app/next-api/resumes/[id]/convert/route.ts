import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { toExternalResume } from '@/features/migration/java-resume-converter'
import { mapExternalResume } from '@/io/external-resume-importer'
import type { ResumeData } from '@/entities/resume/resume-data'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /next-api/resumes/[id]/convert
 *
 * Converts the resume's content from Java/ExternalResume format to the
 * canonical ResumeData format and persists it back to the database.
 * Safe to call if the resume is already in the new format (no-op).
 */
export async function POST(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params
  const cookieStore = await cookies()
  const wxId: string | undefined = cookieStore.get('auth_uid')?.value
  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resume = await prisma.resume.findFirst({
    where: { id, user: { wxId } },
    select: { id: true, content: true },
  })
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const raw = resume.content as Record<string, unknown>
  const isJavaFormat: boolean =
    raw?.base_info !== undefined || !Array.isArray(raw?.sections)

  if (!isJavaFormat) {
    return NextResponse.json({ converted: false, message: 'Already in new format' })
  }

  const newContent: ResumeData = mapExternalResume(toExternalResume(raw))
  await prisma.resume.update({
    where: { id },
    data: { content: newContent as unknown as Prisma.InputJsonValue },
  })

  return NextResponse.json({ converted: true })
}
