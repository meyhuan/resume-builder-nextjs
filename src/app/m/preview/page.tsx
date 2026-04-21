import type { Metadata } from 'next'
import { Suspense, type ReactElement } from 'react'
import MobilePreviewClient from './preview-client'

export const metadata: Metadata = {
  title: '移动端简历预览 · 排版设置',
  description: '只读预览 + 模板切换 + 排版设置（字体、字号、行距、间距、颜色等）。',
  robots: { index: false, follow: false },
}

/**
 * Mobile-first read-only resume preview with template switching and typography/layout settings.
 *
 * Loads the user's draft data from the draft store (or from server if no draft),
 * syncing it into the app store so templates can render it.
 */
export default function MobilePreviewPage(): ReactElement {
  return (
    <Suspense>
      <MobilePreviewClient />
    </Suspense>
  )
}
