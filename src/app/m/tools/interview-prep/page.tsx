import type { Metadata } from 'next'
import type { ReactElement } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createDefaultResume } from '@/lib/default-resume'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getSafeReturnPath } from '@/lib/platform/route'
import MobileInterviewPrepClient from './interview-prep-client'

export const metadata: Metadata = {
  title: '面试准备与打招呼 · 智简简历',
  description: '移动端根据简历生成 BOSS 打招呼语、自我介绍与高频面试题。',
  robots: { index: false, follow: false },
}

interface PageProps {
  readonly searchParams: Promise<{
    readonly id?: string
    readonly returnTo?: string
    readonly source?: string
  }>
}

function hasEditableContent(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  const resume = content as Partial<ResumeData>
  return Boolean(
    resume.name ||
      resume.baseInfo ||
      resume.jobIntention ||
      resume.portfolio?.images.length ||
      (Array.isArray(resume.sections) && resume.sections.length > 0),
  )
}

export default async function MobileInterviewPrepPage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const params = await searchParams
  const store = await cookies()
  const wxId = store.get('auth_uid')?.value

  const fallbackReturnTo = params.id ? `/m/edit?id=${encodeURIComponent(params.id)}` : '/m'
  const returnTo = getSafeReturnPath(params.returnTo, fallbackReturnTo)

  // If not logged in, redirect with return context
  if (!wxId) {
    const loginRedirect = `/m/tools/interview-prep?${new URLSearchParams({
      ...(params.id ? { id: params.id } : {}),
      ...(params.source ? { source: params.source } : {}),
      returnTo,
    }).toString()}`
    redirect(`/login?redirect=${encodeURIComponent(loginRedirect)}`)
  }

  const user = await prisma.user.findUnique({
    where: { wxId },
    select: { id: true },
  })
  if (!user) {
    redirect('/login')
  }

  const allResumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true },
  })

  if (allResumes.length === 0) {
    redirect('/m')
  }

  const activeRow =
    (params.id ? allResumes.find((r) => r.id === params.id) : null) || allResumes[0]

  let content = activeRow.content as unknown as ResumeData
  if (!hasEditableContent(content)) {
    content = createDefaultResume()
  }
  content = normalizeResumeContent(content as Partial<ResumeData> & Record<string, unknown>, {
    fallbackId: activeRow.id,
  })

  const initialResume = {
    id: activeRow.id,
    title: activeRow.title || '未命名简历',
    content,
  }

  const resumeOptions = allResumes.map((r) => ({
    id: r.id,
    title: r.title || '未命名简历',
  }))

  return (
    <MobileInterviewPrepClient
      initialResume={initialResume}
      resumeOptions={resumeOptions}
      returnTo={returnTo}
      source={params.source || 'web'}
    />
  )
}
