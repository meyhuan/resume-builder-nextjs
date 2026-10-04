import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readPdfPageCount } from '@/io/pdf-page-count'
import { usePdfPreviewPageCount } from './use-pdf-preview-page-count'

vi.mock('@/io/pdf-page-count', () => ({ readPdfPageCount: vi.fn() }))
const readCount = vi.mocked(readPdfPageCount)
const blob = new Blob(['preview'])
function deferred() {
  let resolve!: (count: number) => void
  const promise = new Promise<number>(done => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => { vi.resetAllMocks() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('verified PDF preview count', () => {
  it('keeps the verified count for an unchanged version, including after closing a preview', async () => {
    readCount.mockResolvedValue(2)
    const { result, rerender } = renderHook(({ revision }) => usePdfPreviewPageCount(revision), { initialProps: { revision: 'content/theme/template/one-page-v1' } })
    expect(result.current.pdfPageCount).toBeNull()
    await act(() => result.current.recordPreview(blob, 'content/theme/template/one-page-v1'))
    expect(result.current.pdfPageCount).toBe(2)
    rerender({ revision: 'content/theme/template/one-page-v1' })
    expect(result.current.pdfPageCount).toBe(2)
  })

  it.each(['content-v2', 'theme-v2', 'template-v2', 'one-page-v2', 'portfolio-v2'])('invalidates a verified count when %s changes', async revision => {
    readCount.mockResolvedValue(2)
    const { result, rerender } = renderHook(({ revision }) => usePdfPreviewPageCount(revision), { initialProps: { revision: 'v1' } })
    await act(() => result.current.recordPreview(blob, 'v1'))
    rerender({ revision })
    expect(result.current.pdfPageCount).toBeNull()
    rerender({ revision: 'v1' })
    expect(result.current.pdfPageCount).toBeNull()
  })

  it('ignores a PDF response generated from an older editor version', async () => {
    const { result } = renderHook(() => usePdfPreviewPageCount('v2'))
    await act(() => result.current.recordPreview(blob, 'v1'))
    expect(readCount).not.toHaveBeenCalled()
    expect(result.current.pdfPageCount).toBeNull()
  })

  it('does not restore an outdated count when parsing completes after an edit', async () => {
    const reading = deferred()
    readCount.mockReturnValue(reading.promise)
    const { result, rerender } = renderHook(({ revision }) => usePdfPreviewPageCount(revision), { initialProps: { revision: 'v1' } })
    let pending!: Promise<void>
    act(() => { pending = result.current.recordPreview(blob, 'v1') })
    rerender({ revision: 'v2' })
    await act(async () => { reading.resolve(2); await pending })
    expect(result.current.pdfPageCount).toBeNull()
  })

  it('keeps the newest preview count when parsing requests finish out of order', async () => {
    const first = deferred(), second = deferred()
    readCount.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => usePdfPreviewPageCount('v1'))
    let firstPending!: Promise<void>, secondPending!: Promise<void>
    act(() => { firstPending = result.current.recordPreview(blob, 'v1'); secondPending = result.current.recordPreview(blob, 'v1') })
    await act(async () => { second.resolve(3); await secondPending })
    expect(result.current.pdfPageCount).toBe(3)
    await act(async () => { first.resolve(2); await firstPending })
    expect(result.current.pdfPageCount).toBe(3)
  })

  it('falls back to estimates on a count error and allows a later preview to recover', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    readCount.mockRejectedValueOnce(new Error('Parser unavailable')).mockResolvedValueOnce(2)
    const { result } = renderHook(() => usePdfPreviewPageCount('v1'))
    await act(() => result.current.recordPreview(blob, 'v1'))
    expect(result.current.pdfPageCount).toBeNull()
    await act(() => result.current.recordPreview(blob, 'v1'))
    expect(result.current.pdfPageCount).toBe(2)
  })
})
