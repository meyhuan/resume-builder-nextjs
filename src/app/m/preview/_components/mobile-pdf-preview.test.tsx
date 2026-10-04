import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobilePdfPreview } from './mobile-pdf-preview'

const mocks = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/io/pdf-page-count', () => ({ loadPdfJs: mocks.load }))
const blob = { arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer } as Blob
function pdf(numPages = 2) {
  const cancel = vi.fn(), destroy = vi.fn().mockResolvedValue(undefined)
  const renderPage = vi.fn(() => ({ promise: Promise.resolve(), cancel }))
  const document = { numPages, getPage: vi.fn().mockResolvedValue({ getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }), render: renderPage }) }
  return { document, cancel, destroy, renderPage, api: { GlobalWorkerOptions: { workerSrc: '' }, getDocument: vi.fn(() => ({ promise: Promise.resolve(document), destroy })) } }
}
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); mocks.load.mockReset() })

describe('touch PDF preview', () => {
  it('opens only when requested and renders one actual PDF page at a time', async () => {
    const fixture = pdf()
    mocks.load.mockResolvedValue(fixture.api)
    const close = vi.fn()
    const view = render(<MobilePdfPreview blob={null} onClose={close} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.load).not.toHaveBeenCalled()
    view.rerender(<MobilePdfPreview blob={blob} onClose={close} />)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF 实际 2 页'))
    expect(fixture.document.getPage).toHaveBeenCalledWith(1)
    expect((screen.getByRole('button', { name: '上一页' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(fixture.document.getPage).toHaveBeenCalledWith(2))
    await waitFor(() => expect((screen.getByRole('button', { name: '下一页' }) as HTMLButtonElement).disabled).toBe(true))
    expect(screen.getAllByRole('img')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '上一页' }))
    await screen.findByRole('img', { name: 'PDF 第 1 页' })
    fireEvent.click(screen.getByRole('button', { name: '关闭 PDF 分页预览' }))
    expect(close).toHaveBeenCalledOnce()
  })
  it('shows a retry after parser failure without crashing the preview', async () => {
    const fixture = pdf(1)
    mocks.load.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fixture.api)
    render(<MobilePdfPreview blob={blob} onClose={vi.fn()} />)
    await screen.findByText('PDF 预览加载失败，请重试。')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF 实际 1 页'))
    expect((screen.getByRole('button', { name: '下一页' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('lets a phone user enlarge the page and return to fit without changing the PDF page count', async () => {
    const fixture = pdf()
    mocks.load.mockResolvedValue(fixture.api)
    render(<MobilePdfPreview blob={blob} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF 实际 2 页'))
    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF 实际 2 页'))
    expect((screen.getByRole('img') as HTMLCanvasElement).style.width).toBe('200%')
    fireEvent.click(screen.getByRole('button', { name: '适屏' }))
    await waitFor(() => expect((screen.getByRole('img') as HTMLCanvasElement).style.width).toBe('100%'))
  })
  it('releases parser and render resources when closed', async () => {
    const fixture = pdf()
    mocks.load.mockResolvedValue(fixture.api)
    const view = render(<MobilePdfPreview blob={blob} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('PDF 实际 2 页'))
    view.unmount()
    expect(fixture.destroy).toHaveBeenCalledOnce()
    expect(fixture.cancel).toHaveBeenCalledOnce()
  })
  it('ignores a late loader after the user closes the dialog', async () => {
    const fixture = pdf()
    let resolve!: (value: unknown) => void
    mocks.load.mockReturnValue(new Promise(r => { resolve = r }))
    const view = render(<MobilePdfPreview blob={blob} onClose={vi.fn()} />)
    view.unmount()
    resolve(fixture.api)
    await Promise.resolve()
    expect(fixture.api.getDocument).not.toHaveBeenCalled()
  })
})
