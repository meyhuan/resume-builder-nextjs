/* Hallmark · component: pagination feedback · existing tokens · P5 H4 E4 S5 R5 V4 */
'use client'

import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import type { ResumePagination } from '@/hooks/use-resume-pagination'

export function ResumePageFeedback({ pages, contentRef, guides, onGuidesChange, onePage }: {
  readonly pages: ResumePagination; readonly contentRef: RefObject<HTMLDivElement | null>
  readonly guides: boolean; readonly onGuidesChange: (value: boolean) => void; readonly onePage: boolean
}) {
  function locateOverflow() {
    const root = contentRef.current
    const canvas = root?.closest<HTMLElement>('[data-editor-canvas]')
    if (!root || !canvas || !pages.boundaries.length) return
    const rect = root.getBoundingClientRect()
    const scale = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1
    const top = canvas.scrollTop + rect.top - canvas.getBoundingClientRect().top + pages.boundaries[0] * scale - canvas.clientHeight / 3
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    onGuidesChange(true)
    canvas.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' })
  }
  return <div data-resume-page-feedback data-export-hide="true" className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-background px-3 py-1 text-xs print:hidden">
    <span role="status" aria-live="polite" className="font-medium tabular-nums">
      {pages.ready ? `预计 ${pages.pageCount + pages.appendixPages} 页` : '正在计算页数…'}
      {pages.appendixPages > 0 && <span className="ml-1 font-normal text-muted-foreground">（含作品集 {pages.appendixPages} 页）</span>}
    </span>
    <label className="flex min-h-11 cursor-pointer items-center gap-2">
      <input type="checkbox" checked={guides} onChange={event => onGuidesChange(event.target.checked)} className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" />
      显示分页线
    </label>
    {pages.pageCount > 1 && <Button size="sm" variant="ghost" className="min-h-11" onClick={locateOverflow}>
      {onePage ? '定位超出一页的内容' : '定位跨页内容'}
    </Button>}
    {pages.overflowLabel && <span className="max-w-64 truncate text-muted-foreground" title={pages.overflowLabel}>跨页：{pages.overflowLabel}</span>}
    <span className="text-muted-foreground">A4 · 导出以 PDF 预览为准</span>
  </div>
}

export function ResumePageGuides({ pages, visible }: { readonly pages: ResumePagination; readonly visible: boolean }) {
  if (!visible || !pages.ready) return null
  return <div data-resume-page-guides data-export-hide="true" aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 print:hidden">
    {pages.boundaries.map((top, index) => <div key={index} data-resume-page-boundary={index + 1} className="absolute inset-x-0 border-t border-dashed border-slate-400" style={{ top }}>
      <span className="absolute right-2 -translate-y-1/2 rounded border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
        {`第 ${index + 1} 页 / 第 ${index + 2} 页`}
      </span>
    </div>)}
  </div>
}
