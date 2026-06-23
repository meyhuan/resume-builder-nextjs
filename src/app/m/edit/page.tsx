import { type ReactElement } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import { createDefaultResume } from '@/lib/default-resume'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import MobileEditHomeClient, { type InitialResume } from './edit-home-client'

const log = createLogger('m/edit/page')

export const metadata: Metadata = {
  title: '我的简历',
  description: '移动端简历编辑首页',
}

interface EditHomePageProps {
  readonly searchParams: Promise<EditHomeSearchParams>
}

interface EditHomeSearchParams {
  readonly id?: string
  readonly javaId?: string
  readonly source?: string
  readonly mini?: string
  readonly debug?: string
  readonly miniVersion?: string
  readonly mpVersion?: string
}

function hasEditableContent(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  const resume = content as Partial<ResumeData>
  if (resume.name || resume.baseInfo || resume.jobIntention) return true
  return Array.isArray(resume.sections) && resume.sections.length > 0
}

function buildCanonicalEditRedirect(id: string, params: EditHomeSearchParams): string {
  const next = new URLSearchParams({ id })
  const preservedKeys: ReadonlyArray<keyof EditHomeSearchParams> = [
    'source',
    'mini',
    'debug',
    'miniVersion',
    'mpVersion',
  ]
  for (const key of preservedKeys) {
    const value = params[key]
    if (value) next.set(key, value)
  }
  return `/m/edit?${next.toString()}`
}

function hasMiniProgramContext(params: EditHomeSearchParams): boolean {
  if (params.source === 'web' || params.source === 'standalone' || params.mini === '0') return false
  return true
}

/**
 * /m/edit - Mobile edit home (Server Component).
 *
 * Resolves the target resume entirely on the server:
 *   - ?id=<prisma-cuid>   (canonical)
 *   - ?javaId=<number>    (mini-program handoff; resolved via Resume.meta.javaId)
 *   - neither             (picks the most recently updated resume)
 *
 * Passes the full resume to the client component as a prop, so the client
 * never needs to fetch again. This avoids loading flicker, race conditions
 * with useEffect deps, and saves a round-trip.
 */
export default async function MobileEditHomePage(
  { searchParams }: EditHomePageProps,
): Promise<ReactElement> {
  const params = await searchParams
  log.info('enter', params)
  const store = await cookies()
  const initialInMiniProgram = hasMiniProgramContext(params)
  const wxId: string | undefined = store.get('auth_uid')?.value
  if (!wxId) {
    log.warn('no auth cookie, redirecting to login')
    redirect('/login?redirect=/m/edit')
  }

  const user = await prisma.user.findUnique({ where: { wxId }, select: { id: true } })
  if (!user) {
    log.warn('user not found for wxId', { wxId })
    redirect('/login?redirect=/m/edit')
  }

  // javaId handoff: resolve to canonical id once, then redirect.
  if (params.javaId && !params.id) {
    const match = await prisma.resume.findFirst({
      where: {
        userId: user.id,
        meta: { path: ['javaId'], equals: String(params.javaId) },
      },
      select: { id: true },
    })
    if (match) redirect(buildCanonicalEditRedirect(match.id, params))
  }

  const resume = params.id
    ? await prisma.resume.findFirst({
        where: { id: params.id, userId: user.id },
        select: { id: true, title: true, content: true, template: true },
      })
    : await prisma.resume.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, content: true, template: true },
      })

  let initialContent: ResumeData | null = resume
    ? resume.content as unknown as ResumeData
    : null
  if (resume && !hasEditableContent(resume.content)) {
    log.warn('resume content is empty, backfilling default content', { id: resume.id })
    initialContent = createDefaultResume()
    await prisma.resume.update({
      where: { id: resume.id },
      data: { content: initialContent as unknown as Prisma.InputJsonValue },
    })
  }
  if (resume && initialContent) {
    initialContent = normalizeResumeContent(
      initialContent as unknown as Partial<ResumeData> & Record<string, unknown>,
      { fallbackId: resume.id },
    )
  }

  const initial: InitialResume | null = resume && initialContent
    ? {
        id: resume.id,
        title: resume.title,
        content: initialContent,
        template: resume.template ?? 'simple',
      }
    : null
  log.info('resolved', { id: initial?.id, hasSections: Array.isArray((initial?.content as unknown as Record<string, unknown>)?.sections) })

  return <MobileEditHomeClient initial={initial} initialInMiniProgram={initialInMiniProgram} />
}
