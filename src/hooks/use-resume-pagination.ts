'use client'

import { useEffect, useState, type RefObject } from 'react'
import { calculateResumePages, readPagePaddingVertical, type ResumePageMetrics } from '@/lib/resume-page-metrics'

interface ContentRange { readonly top: number; readonly bottom: number; readonly element: HTMLElement }
export interface ResumePagination extends ResumePageMetrics {
  readonly ready: boolean
  readonly appendixPages: number
  readonly overflowLabel: string
}
const INITIAL: ResumePagination = { ...calculateResumePages(0, 22, false), ready: false, appendixPages: 0, overflowLabel: '' }
const SKIP = '.portfolio-appendix, [data-export-hide="true"], .print\\:hidden, .no-print, [hidden], [aria-hidden="true"], style, script, button'

/** Measure visible saved copy, ignoring A4 min-height, decoration and editor actions. */
export function measureResumePagination(root: HTMLElement): ResumePagination {
  const body = root.matches('.resume-document-main') ? root : root.querySelector<HTMLElement>('.resume-document-main') ?? root
  const frame = body.querySelector<HTMLElement>('.resume-container') ?? body
  const rect = body.getBoundingClientRect()
  const scale = body.offsetWidth > 0 ? rect.width / body.offsetWidth || 1 : 1
  const ranges: ContentRange[] = []
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue
    const element = node.parentElement
    // Editable field wrappers remain measurable; only export-hidden actions are skipped.
    if (!element || element.closest(SKIP)) continue
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const bounds = range.getBoundingClientRect()
    if (bounds.height <= 0 || bounds.width <= 0) continue
    const fontSize = parseFloat(style.fontSize) || 0
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.4
    const leading = Math.max(0, lineHeight - fontSize) / 2
    ranges.push({ top: (bounds.top - rect.top) / scale, bottom: (bounds.bottom - rect.top) / scale + leading, element })
  }
  for (const element of body.querySelectorAll<HTMLImageElement>('img')) {
    if (element.closest(SKIP)) continue
    const bounds = element.getBoundingClientRect()
    if (bounds.width > 0 && bounds.height > 0) ranges.push({ top: (bounds.top - rect.top) / scale, bottom: (bounds.bottom - rect.top) / scale, element })
  }
  const contentHeight = Math.max(0, ...ranges.map(range => range.bottom))
  const onePage = body.getAttribute('data-one-page') === 'true'
  const metrics = calculateResumePages(contentHeight, readPagePaddingVertical(frame.getAttribute('data-page-padding-vertical')), onePage || frame.getAttribute('data-bleed') === 'true')
  const overflow = [...ranges].sort((a, b) => a.top - b.top).find(range => range.bottom > metrics.firstPageHeight + 1)
  const section = overflow?.element.closest('[data-resume-edit-region="section"], section')
  const heading = section?.querySelector('h2, h3')?.textContent?.trim()
  const snippet = overflow?.element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 24)
  const overflowLabel = metrics.pageCount > 1 ? [heading, snippet].filter(Boolean).join(' · ') : ''
  const appendixPages = Number(root.querySelector('[data-portfolio-pages]')?.getAttribute('data-portfolio-pages')) || 0
  return { ...metrics, ready: Boolean(frame.querySelector('h1, h2, p, img, [data-resume-edit-field]')), appendixPages, overflowLabel }
}

export function useResumePagination(contentRef: RefObject<HTMLDivElement | null>, revision: unknown): ResumePagination {
  const [pages, setPages] = useState<ResumePagination>(INITIAL)
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const next = measureResumePagination(root)
      setPages(current => JSON.stringify(current) === JSON.stringify(next) ? current : next)
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(measure, 120) }
    const resize = new ResizeObserver(schedule)
    const mutation = new MutationObserver(schedule)
    resize.observe(root)
    mutation.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'data-one-page', 'data-page-padding-vertical', 'data-bleed', 'src'] })
    root.addEventListener('load', schedule, true)
    document.fonts?.addEventListener('loadingdone', schedule)
    document.fonts?.ready.then(() => { if (!cancelled) schedule() })
    schedule()
    return () => {
      cancelled = true; clearTimeout(timer); resize.disconnect(); mutation.disconnect()
      root.removeEventListener('load', schedule, true)
      document.fonts?.removeEventListener('loadingdone', schedule)
    }
  }, [contentRef, revision])
  return pages
}
