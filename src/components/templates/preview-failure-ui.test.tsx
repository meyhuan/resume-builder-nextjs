import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import EditorError from '@/app/editor/error'
import ExportPreviewDialog from '@/components/export-preview-dialog'

afterEach(cleanup)

it('offers recovery when the editor route fails', () => {
  const reset = vi.fn()
  render(<EditorError error={new Error('private details')} reset={reset} />)
  expect(screen.getByRole('alert').textContent).toContain('简历加载失败')
  expect(screen.queryByText('private details')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '重新加载简历' }))
  expect(reset).toHaveBeenCalledOnce()
})

it('keeps PDF generation failure visible and allows retry', () => {
  const retry = vi.fn()
  const props = { open: true, onOpenChange: vi.fn(), pdfUrl: '', onConfirmExport: vi.fn(), onPreviewPdf: retry }
  const { rerender } = render(<ExportPreviewDialog {...props} pdfGenerationFailed />)
  expect(screen.getByRole('alert').textContent).toContain('PDF 预览生成失败')
  expect((screen.getByRole('button', { name: '确认下载 PDF' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '重试 PDF 预览' }))
  expect(retry).toHaveBeenCalledOnce()
  rerender(<ExportPreviewDialog {...props} isGenerating />)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('正在生成 PDF 预览')
})

it('recovers from image generation and decoding failures', async () => {
  const prepare = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('blob:image')
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" onConfirmExport={vi.fn()} onPreviewImage={prepare} />)
  fireEvent.click(screen.getByRole('button', { name: /^图片/ }))
  expect((await screen.findByRole('alert')).textContent).toContain('图片预览加载失败')
  fireEvent.click(screen.getByRole('button', { name: '重试图片预览' }))
  const image = await screen.findByAltText('实际 PNG 导出预览')
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.error(image)
  expect(screen.getByRole('alert').textContent).toContain('图片预览加载失败')
  expect(screen.queryByRole('status')).toBeNull()
  expect(prepare).toHaveBeenCalledTimes(2)
})
