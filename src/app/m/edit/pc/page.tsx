import type { Metadata } from 'next'
import { type ReactElement } from 'react'
import PcGuideClient from './pc-guide-client'

export const metadata: Metadata = {
  title: 'PC端',
  description: '复制智简简历电脑端编辑链接，在电脑浏览器中继续编辑当前简历。',
  robots: { index: false, follow: false },
}

interface PcGuidePageProps {
  readonly searchParams: Promise<{
    readonly id?: string
    readonly tpl?: string
  }>
}

export default async function PcGuidePage(
  { searchParams }: PcGuidePageProps,
): Promise<ReactElement> {
  const params = await searchParams
  return (
    <PcGuideClient
      resumeId={params.id ?? null}
      templateId={params.tpl ?? null}
    />
  )
}
