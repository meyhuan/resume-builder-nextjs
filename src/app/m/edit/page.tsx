import { type ReactElement } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import type { ResumeData } from '@/entities/resume/resume-data'
import MobileEditHomeClient, { type InitialResume } from './edit-home-client'

const log = createLogger('m/edit/page')

export const metadata: Metadata = {
  title: '编辑简历 · AI 简历',
  description: '移动端简历编辑首页',
}

interface EditHomePageProps {
  readonly searchParams: Promise<{ id?: string; javaId?: string }>
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
    if (match) redirect(`/m/edit?id=${match.id}`)
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

  const initial: InitialResume | null = resume
    ? {
        id: resume.id,
        title: resume.title,
        content: resume.content as unknown as ResumeData,
        template: resume.template ?? 'simple',
      }
    : null
  log.info('resolved', { id: initial?.id, hasSections: Array.isArray((initial?.content as unknown as Record<string, unknown>)?.sections) })

  return <MobileEditHomeClient initial={initial} />
}
