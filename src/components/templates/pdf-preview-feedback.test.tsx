import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PdfIframePreview } from '@/components/pdf-iframe-preview'
import ExportPreviewDialog from '@/components/export-preview-dialog'
import { track } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
beforeEach(() => { vi.useFakeTimers(); vi.mocked(track).mockClear() })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

it('reports a missing load event as a timeout, once, without blocking download', () => {
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="blob:private-file" onConfirmExport={vi.fn()} isVip />)
  act(() => vi.advanceTimersByTime(15000))
  expect(screen.getByRole('status').textContent).toContain('暂未确认加载完成')
  expect(track).toHaveBeenCalledWith('app_error', expect.objectContaining({ source: 'pdf_preview', failureReason: 'load_timeout', elapsedMs: 15000, iframeLoadObserved: false }))
  expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain('blob:private-file')
  act(() => vi.advanceTimersByTime(60000))
  expect(track).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: '确认下载 PDF' }) as HTMLButtonElement).disabled).toBe(false)
})

it('does not infer rendered success from load; still accepts a blank report only once', () => {
  render(<PdfIframePreview pdfUrl="blob:pdf" />)
  fireEvent.load(screen.getByTitle('PDF 预览'))
  act(() => vi.advanceTimersByTime(15000))
  expect(track).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '预览仍为空白？反馈问题' }))
  fireEvent.click(screen.getByRole('button', { name: '已记录空白问题' }))
  expect(track).toHaveBeenCalledTimes(1)
  expect(track).toHaveBeenCalledWith('app_error', expect.objectContaining({ failureReason: 'user_reported_blank', iframeLoadObserved: true }))
})

it('deduplicates frame errors, stops timeout, and creates a new attempt on retry', () => {
  render(<PdfIframePreview pdfUrl="blob:pdf" />)
  fireEvent.error(screen.getByTitle('PDF 预览'))
  fireEvent.error(screen.getByTitle('PDF 预览'))
  act(() => vi.advanceTimersByTime(15000))
  expect(track).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status').textContent).toContain('加载失败')
  const firstId = vi.mocked(track).mock.calls[0][1]?.previewAttemptId
  fireEvent.click(screen.getByRole('button', { name: '重试预览' }))
  expect(screen.queryByRole('status')).toBeNull()
  fireEvent.error(screen.getByTitle('PDF 预览'))
  expect(track).toHaveBeenCalledTimes(2)
  expect(vi.mocked(track).mock.calls[1][1]?.previewAttemptId).not.toBe(firstId)
})

it('clears a timeout notice on late load and offers image preview on errors', () => {
  const image = vi.fn()
  render(<PdfIframePreview pdfUrl="blob:pdf" onPreviewImage={image} />)
  act(() => vi.advanceTimersByTime(15000))
  fireEvent.load(screen.getByTitle('PDF 预览'))
  expect(screen.queryByRole('status')).toBeNull()
  fireEvent.error(screen.getByTitle('PDF 预览'))
  fireEvent.click(screen.getByRole('button', { name: '切换图片预览' }))
  expect(image).toHaveBeenCalledOnce()
})

it.each(['close', 'format', 'file'] as const)('cancels the previous timer on %s', (action) => {
  const props = { open: true, onOpenChange: vi.fn(), pdfUrl: 'blob:old', onConfirmExport: vi.fn() }
  const view = render(<ExportPreviewDialog {...props} />)
  act(() => vi.advanceTimersByTime(10000))
  if (action === 'close') view.rerender(<ExportPreviewDialog {...props} open={false} />)
  if (action === 'format') fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  if (action === 'file') view.rerender(<ExportPreviewDialog {...props} pdfUrl="blob:new" />)
  act(() => vi.advanceTimersByTime(5000))
  expect(track).not.toHaveBeenCalled()
})

it('records an explicit unsupported capability separately from a timeout', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'pdfViewerEnabled')
  Object.defineProperty(navigator, 'pdfViewerEnabled', { configurable: true, value: false })
  try {
    render(<PdfIframePreview pdfUrl="blob:pdf" />)
    expect(screen.getByRole('status').textContent).toContain('不支持内嵌')
    act(() => vi.advanceTimersByTime(15000))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('app_error', expect.objectContaining({ failureReason: 'viewer_unsupported', pdfViewerEnabled: false }))
  } finally {
    if (original) Object.defineProperty(navigator, 'pdfViewerEnabled', original)
    else Reflect.deleteProperty(navigator, 'pdfViewerEnabled')
  }
})
