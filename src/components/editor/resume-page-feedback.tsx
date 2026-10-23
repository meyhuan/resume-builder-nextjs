/* Hallmark · component: pagination feedback · existing tokens · P5 H4 E4 S5 R5 V4 */
'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import type { ResumePagination } from '@/hooks/use-resume-pagination'

export function ResumePageFeedback({ pages, contentRef, onePage, pdfPageCount }: {
  readonly pages: ResumePagination; readonly contentRef: RefObject<HTMLDivElement | null>
  readonly onePage: boolean
  readonly pdfPageCount?: number | null
}) {
  function locateOverflow() {
    const root = contentRef.current
    const canvas = root?.closest<HTMLElement>('[data-editor-canvas]')
    if (!root || !canvas || !pages.boundaries.length) return
    const rect = root.getBoundingClientRect()
    const scale = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1
    const top = canvas.scrollTop + rect.top - canvas.getBoundingClientRect().top + pages.boundaries[0] * scale - canvas.clientHeight / 3
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    canvas.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' })
  }
  return <div data-resume-page-feedback data-export-hide="true" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-background px-3 py-1 text-xs print:hidden">
    <span role="status" aria-live="polite" data-page-count-source={pdfPageCount != null ? 'pdf' : 'estimate'} className="font-medium tabular-nums">
      {pdfPageCount != null ? `PDF 实际 ${pdfPageCount} 页` : pages.ready ? `预计 ${pages.pageCount + pages.appendixPages} 页` : '正在计算页数…'}
      {pdfPageCount == null && pages.appendixPages > 0 && <span className="ml-1 font-normal text-muted-foreground">（含作品集 {pages.appendixPages} 页）</span>}
    </span>
    {pages.pageCount > 1 && <Button size="sm" variant="ghost" className="min-h-11" onClick={locateOverflow}>
      {onePage ? '定位超出一页的内容' : '查看预计跨页位置'}
    </Button>}
    {pages.overflowLabel && <span className="max-w-64 truncate text-muted-foreground" title={pages.overflowLabel}>预计跨页：{pages.overflowLabel}</span>}
    <span className="text-muted-foreground">页数仅供估算，实际分页以 PDF 预览为准</span>
  </div>
}

/**
 * Screen-only A4 boundary overlay. It is driven by the same physical A4
 * metrics as the status bar and is explicitly excluded from exported HTML.
 * Chromium remains the source of truth for the final PDF fragmentation.
 */
export function ResumePageGuides({ pages }: { readonly pages: ResumePagination }) {
  if (!pages.ready || pages.boundaries.length === 0) return null
  return (
    <div data-resume-page-guides data-export-hide="true" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 print:hidden">
      {pages.boundaries.map((boundary, index) => (
        <div key={boundary} className="absolute inset-x-0 border-t border-dashed border-slate-300/80">
          <span className="absolute right-1 -top-3 rounded bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-slate-400 shadow-sm">
            第 {index + 2} 页
          </span>
        </div>
      ))}
    </div>
  )
}
