import { useRef } from 'react'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateResumePages, CSS_PX_PER_MM, readPagePaddingVertical } from '@/lib/resume-page-metrics'
import { measureResumePagination, useResumePagination } from '@/hooks/use-resume-pagination'
import { getOnePageAdjustments } from '@/components/editor/one-page-adjustments'
import { buildResumeHtml } from '@/io/html-export'
import { ResumePageFeedback, ResumePageGuides } from '@/components/editor/resume-page-feedback'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value() {
    const element = this.startContainer.parentElement as HTMLElement
    const top = Number(element.dataset.top ?? 50)
    const height = Number(element.dataset.height ?? 20)
    const scale = Number(element.closest('[data-scale]')?.getAttribute('data-scale') ?? 1)
    return { top: 50 + top * scale, bottom: 50 + (top + height) * scale, left: 0, width: 100 * scale, height: height * scale }
  } })
})
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.useRealTimers() })

function fixture(scale = 1) {
  const root = document.createElement('div')
  root.dataset.scale = String(scale)
  root.innerHTML = `<div class="resume-document-main"><div class="resume-container" data-page-padding-vertical="22" style="min-height:3000px;font-size:14px;line-height:20px">
    <section data-resume-edit-region="section"><h2 data-top="30">项目经历</h2><p data-top="1200" style="font-size:14px;line-height:20px">项目正文</p></section>
    <div data-export-hide="true"><button data-top="8000">删除</button><p data-top="8000">编辑提示</p></div>
    <p class="print:hidden" data-top="8000">屏幕控件</p>
  </div></div>`
  document.body.appendChild(root)
  const body = root.firstElementChild as HTMLElement
  vi.spyOn(body, 'getBoundingClientRect').mockReturnValue({ top: 50, width: 794 * scale, height: 3000 * scale } as DOMRect)
  Object.defineProperty(body, 'offsetWidth', { configurable: true, value: 794 })
  return root
}

describe('live pagination feedback', () => {
  it('clearly distinguishes estimated boundaries from verified PDF totals, without adding appendix pages twice', () => {
    const root = fixture()
    const pages = { ...measureResumePagination(root), appendixPages: 2 }
    const props = { pages, contentRef: { current: root as HTMLDivElement }, guides: true, onGuidesChange: vi.fn(), onePage: false }
    const { rerender } = render(<ResumePageFeedback {...props} />)
    expect(screen.getByRole('status').textContent).toContain('预计 4 页')
    expect(screen.getByRole('checkbox', { name: '显示分页参考线' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '查看预计跨页位置' })).toBeTruthy()
    rerender(<ResumePageFeedback {...props} pdfPageCount={3} />)
    expect(screen.getByRole('status').textContent).toBe('PDF 实际 3 页')
    expect(screen.getByRole('status').getAttribute('data-page-count-source')).toBe('pdf')
    expect(screen.getByText('参考线仅供估算，实际分页以 PDF 预览为准')).toBeTruthy()
    rerender(<ResumePageFeedback {...props} pdfPageCount={null} />)
    expect(screen.getByRole('status').textContent).toContain('预计 4 页')
  })

  it('labels on-canvas boundaries as references and keeps them out of exports', () => {
    const root = fixture()
    const { container } = render(<ResumePageGuides pages={measureResumePagination(root)} visible />)
    expect(container.textContent).toContain('第 1 页 / 第 2 页（参考）')
    expect(buildResumeHtml(container)).not.toContain('（参考）')
  })

  it('matches first/continuation page margins and handles fractional A4 rounding', () => {
    const first = 275 * CSS_PX_PER_MM
    const next = 253 * CSS_PX_PER_MM
    expect(calculateResumePages(first + 0.5, 22, false).pageCount).toBe(1)
    expect(calculateResumePages(first + 2, 22, false).pageCount).toBe(2)
    expect(calculateResumePages(first + next + 2, 22, false).boundaries).toEqual([first, first + next])
    expect(calculateResumePages(297 * CSS_PX_PER_MM, 22, true).pageCount).toBe(1)
    expect(readPagePaddingVertical(undefined)).toBe(22)
    expect(readPagePaddingVertical('19')).toBe(19)
  })

  it.each([1, 0.8])('measures actual content at scale %s and excludes canvas min-height/editor actions', scale => {
    const pages = measureResumePagination(fixture(scale))
    expect(pages.ready).toBe(true)
    expect(pages.pageCount).toBe(2)
    expect(pages.contentHeight).toBeCloseTo(1223)
    expect(pages.overflowLabel).toBe('项目经历 · 项目正文')
    expect(pages.contentHeight).toBeLessThan(3000)
  })

  it('does not count an empty A4 minimum or double-count portfolio pages', () => {
    const root = fixture()
    root.querySelector('p[data-top="1200"]')!.setAttribute('data-top', '500')
    root.insertAdjacentHTML('beforeend', '<div class="portfolio-appendix" data-portfolio-pages="2"><p data-top="9000">作品</p></div>')
    const pages = measureResumePagination(root)
    expect(pages.pageCount).toBe(1)
    expect(pages.appendixPages).toBe(2)
    expect(pages.overflowLabel).toBe('')
  })

  it('updates overflow context when text changes without a resize', async () => {
    vi.useFakeTimers()
    const root = fixture()
    const { result } = renderHook(() => useResumePagination(useRef(root), 'qingning'))
    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(result.current.overflowLabel).toContain('项目正文')
    await act(async () => { root.querySelector('p[data-top="1200"]')!.textContent = '更新后的描述'; await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(150) })
    expect(result.current.overflowLabel).toContain('更新后的描述')
  })

  it('removes page guides and page feedback from exported HTML without changing saved content', () => {
    const root = fixture()
    root.insertAdjacentHTML('beforeend', '<div data-export-hide="true" data-resume-page-guides>第 1 页 / 第 2 页</div>')
    const html = buildResumeHtml(root)
    expect(html).toContain('项目正文')
    expect(html).not.toContain('data-resume-page-guides')
    expect(html).not.toContain('第 1 页 / 第 2 页')
  })

  it('explains only changed settings, preserving exact opening values', () => {
    const before = { spacingScale: 1.2, lineHeight: 1.8, fontSize: 15 }
    expect(getOnePageAdjustments(before, before)).toEqual([])
    expect(getOnePageAdjustments(before, { spacingScale: 0, lineHeight: 1.4, fontSize: 12 })).toEqual([
      { key: 'spacingScale', label: '模块间距', unit: 'x', before: 1.2, after: 0 },
      { key: 'lineHeight', label: '行高', unit: '', before: 1.8, after: 1.4 },
      { key: 'fontSize', label: '字号', unit: 'px', before: 15, after: 12 },
    ])
  })
})
