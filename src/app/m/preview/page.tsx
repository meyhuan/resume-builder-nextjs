import type { Metadata } from 'next'
import type { ReactElement } from 'react'
import MobilePreviewClient from './preview-client'

export const metadata: Metadata = {
  title: '移动端简历预览 · 排版设置',
  description: '只读预览 + 模板切换 + 排版设置（字体、字号、行距、间距、颜色等）。',
  robots: { index: false, follow: false },
}

/**
 * Mobile-first read-only resume preview with template switching and typography/layout settings.
 *
 * The page is intentionally self-contained and backend-agnostic: it loads the built-in test
 * resume so the user can visit a URL and evaluate the settings surface end-to-end.
 */
export default function MobilePreviewPage(): ReactElement {
  return <MobilePreviewClient />
}
