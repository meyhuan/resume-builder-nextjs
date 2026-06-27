import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { persistResumeAssets } from '@/lib/persist-resume-assets'
import { toExternalResume } from '@/features/migration/java-resume-converter'
import { mapExternalResume } from '@/io/external-resume-importer'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import {
  assertCanCreateResumeForWxId,
  isResumeLimitExceededError,
  MAX_RESUME_COUNT,
  RESUME_LIMIT_EXCEEDED_CODE,
  RESUME_LIMIT_EXCEEDED_MESSAGE,
} from '@/lib/resume-limits'

/**
 * Detect and convert Java/ExternalResume format to ResumeData if needed.
 * Java format has snake_case keys like base_info, job_intention, etc.
 */
function normalizeContent(raw: unknown): ResumeData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw as ResumeData
  }
  const obj = raw as Record<string, unknown>
  const isJavaFormat: boolean =
    obj.base_info !== undefined || !Array.isArray(obj.sections)
  if (isJavaFormat) {
    return mapExternalResume(toExternalResume(obj))
  }
  return normalizeResumeContent(raw as Partial<ResumeData> & Record<string, unknown>)
}

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
    const wxId = cookieStore.get("auth_uid")?.value;

    if (!wxId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertCanCreateResumeForWxId(wxId)

    const normalizedContent: ResumeData = normalizeContent(content)
    const persistedAssets = await persistResumeAssets({
      content: normalizedContent as unknown as Record<string, unknown>,
      thumbnail: null,
    })

    // Creating resume
    const resume = await prisma.resume.create({
      data: {
        title: title || 'Untitled Resume',
        content: persistedAssets.content as Prisma.InputJsonValue,
        template: template || 'simple',
        user: {
          connectOrCreate: {
            where: { wxId: wxId },
            create: { wxId: wxId }
          }
        }
      }
    })
    
    return NextResponse.json(resume)
  } catch (error) {
    if (isResumeLimitExceededError(error)) {
      return NextResponse.json(
        {
          error: RESUME_LIMIT_EXCEEDED_MESSAGE,
          code: RESUME_LIMIT_EXCEEDED_CODE,
          limit: MAX_RESUME_COUNT,
          count: error.count,
        },
        { status: 409 },
      )
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 })
  }
}
