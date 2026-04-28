import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { toExternalResume } from '@/features/migration/java-resume-converter'
import { mapExternalResume } from '@/io/external-resume-importer'
import type { ResumeData } from '@/entities/resume/resume-data'

/**
 * POST /next-api/admin/fix-content-format
 *
 * One-time admin endpoint: scans all Resume rows for the current user
 * (or all users if ?all=1 is passed with a server-side secret) and converts
 * any Java-format content to ResumeData format in-place.
 *
 * Safe to call multiple times — already-converted rows are skipped.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const wxId: string | undefined = cookieStore.get('auth_uid')?.value
  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const allUsers: boolean =
    url.searchParams.get('all') === '1' &&
    url.searchParams.get('secret') === process.env.ADMIN_SECRET

  const where = allUsers ? {} : { user: { wxId } }

  const resumes = await prisma.resume.findMany({
    where,
    select: { id: true, content: true },
  })

  let converted = 0
  let skipped = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const resume of resumes) {
    try {
      const raw = resume.content as Record<string, unknown>
      const isJavaFormat: boolean =
        raw?.base_info !== undefined || !Array.isArray(raw?.sections)
      if (!isJavaFormat) {
        skipped++
        continue
      }
      const newContent: ResumeData = mapExternalResume(toExternalResume(raw))
      await prisma.resume.update({
        where: { id: resume.id },
        data: { content: newContent as unknown as Prisma.InputJsonValue },
      })
      converted++
    } catch (e: unknown) {
      errors.push({
        id: resume.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    total: resumes.length,
    converted,
    skipped,
    errors,
  })
}
