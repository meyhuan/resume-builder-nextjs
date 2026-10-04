'use client'

import type { RefObject } from 'react'
import type { ResumePagination } from '@/hooks/use-resume-pagination'

export function MobilePageFeedback({ pages, pdfPageCount, guides, onGuidesChange, onPreview, generating, contentRef, stageRef }: {
  readonly pages: ResumePagination; readonly pdfPageCount: number | null
  readonly guides: boolean; readonly onGuidesChange: (value: boolean) => void
  readonly onPreview: () => void; readonly generating: boolean
  readonly contentRef: RefObject<HTMLDivElement | null>; readonly stageRef: RefObject<HTMLDivElement | null>
}) {
  function locate() {
    const root = contentRef.current, stage = stageRef.current
    if (!root || !stage || !pages.boundaries.length) return
    onGuidesChange(true)
    const rect = root.getBoundingClientRect()
    const scale = rect.width / root.offsetWidth
    stage.scrollTo({ top: stage.scrollTop + rect.top - stage.getBoundingClientRect().top + pages.boundaries[0] * scale - stage.clientHeight / 3,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return <div data-mobile-page-feedback data-export-hide="true" className="shrink-0 border-b bg-white px-3 text-sm">
    <div className="flex min-h-11 items-center justify-between gap-2">
      <span role="status" data-page-count-source={pdfPageCount != null ? 'pdf' : 'estimate'} className="font-medium tabular-nums">
        {pdfPageCount != null ? `PDF 实际 ${pdfPageCount} 页` : pages.ready ? `预计 ${pages.pageCount + pages.appendixPages} 页` : '正在计算页数…'}
      </span>
      <button type="button" disabled={generating || !pages.ready} onClick={onPreview} className="min-h-11 rounded-lg px-2 text-violet-700 disabled:opacity-50">{generating ? '正在生成…' : '查看 PDF 分页'}</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <label className="flex min-h-11 items-center gap-2 text-slate-600"><input type="checkbox" className="size-4 accent-violet-600" checked={guides} onChange={event => onGuidesChange(event.target.checked)} />分页参考线</label>
      {pages.boundaries.length > 0 && <button type="button" onClick={locate} className="min-h-11 rounded-lg px-2 text-slate-600">定位预计跨页处</button>}
    </div>
    {guides && <p className="pb-2 text-xs leading-5 text-slate-500">参考线为估算，实际分页以 PDF 预览为准。{pages.appendixPages > 0 ? `含作品集约 ${pages.appendixPages} 页。` : ''}</p>}
  </div>
}
