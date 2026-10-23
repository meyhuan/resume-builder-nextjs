import type { Metadata } from 'next'
import type { ReactElement } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createDefaultResume } from '@/lib/default-resume'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import type { ResumeData } from '@/entities/resume/resume-data'
import { createMobileEditPath, getSafeReturnPath } from '@/lib/platform/route'
import MobileAiToolsClient, { type InitialAiToolsResume } from './tools-client'

export const metadata: Metadata = {
  title: 'AI 工具 · 智简简历',
  description: '在微信小程序中使用 AI 助手和简历翻译。',
  robots: { index: false, follow: false },
}

interface ToolsPageProps {
  readonly searchParams: Promise<{
    readonly id?: string
    readonly tool?: string
    readonly returnTo?: string
  }>
}

function hasEditableContent(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  const resume = content as Partial<ResumeData>
  return Boolean(
    resume.name || resume.baseInfo || resume.jobIntention || resume.portfolio?.images.length ||
    (Array.isArray(resume.sections) && resume.sections.length > 0),
  )
}

export default async function MobileAiToolsPage(
  { searchParams }: ToolsPageProps,
): Promise<ReactElement> {
  const params = await searchParams
  const store = await cookies()
  const wxId = store.get('auth_uid')?.value
  const fallbackReturnTo = params.id ? createMobileEditPath(params.id) : '/m/edit'
  const returnTo = getSafeReturnPath(params.returnTo, fallbackReturnTo)
  const loginRedirect = `/m/edit/tools?${new URLSearchParams({
    ...(params.id ? { id: params.id } : {}),
    ...(params.tool ? { tool: params.tool } : {}),
    returnTo,
  }).toString()}`
  if (!wxId) redirect(`/login?redirect=${encodeURIComponent(loginRedirect)}`)

  const user = await prisma.user.findUnique({ where: { wxId }, select: { id: true } })
  if (!user) redirect(`/login?redirect=${encodeURIComponent(loginRedirect)}`)

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

  if (!resume) redirect('/m')

  let content = resume.content as unknown as ResumeData
  if (!hasEditableContent(content)) {
    content = createDefaultResume()
    await prisma.resume.update({
      where: { id: resume.id },
      data: { content: content as unknown as Prisma.InputJsonValue },
    })
  }
  content = normalizeResumeContent(content as Partial<ResumeData> & Record<string, unknown>, { fallbackId: resume.id })

  const initial: InitialAiToolsResume = {
    id: resume.id,
    title: resume.title,
    content,
    template: resume.template ?? 'simple',
  }

  return (
    <MobileAiToolsClient
      initial={initial}
      initialTool={params.tool === 'translate' ? 'translate' : 'assistant'}
      returnTo={returnTo}
    />
  )
}
