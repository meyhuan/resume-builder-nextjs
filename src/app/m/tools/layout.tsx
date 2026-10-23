import type { Metadata } from 'next'
import type { ReactElement, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'AI 求职工具 · 智简简历',
  description: '移动端 AI 面试准备、JD 匹配与简历翻译工具箱',
  robots: { index: false, follow: false },
}

export default function MobileToolsLayout({
  children,
}: {
  readonly children: ReactNode
}): ReactElement {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased pb-safe">
      {children}
    </div>
  )
}
