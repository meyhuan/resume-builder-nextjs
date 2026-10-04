import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type PdfWindow = Window & { 'pdfjs-dist/build/pdf'?: unknown }
const blob = { arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer } as Blob
function parser(promise = Promise.resolve({ numPages: 2 })) {
  const destroy = vi.fn().mockResolvedValue(undefined)
  return { GlobalWorkerOptions: { workerSrc: '' }, getDocument: vi.fn((_options: unknown) => { void _options; return { promise, destroy } }), destroy }
}
beforeEach(() => { vi.resetModules() })
afterEach(() => {
  delete (window as PdfWindow)['pdfjs-dist/build/pdf']
  document.head.querySelectorAll('script').forEach(node => node.remove())
})

describe('generated PDF page count', () => {
  it('reads PDF metadata with the local worker and releases the document after counting', async () => {
    const pdfjs = parser()
    ;(window as PdfWindow)['pdfjs-dist/build/pdf'] = pdfjs
    const { readPdfPageCount } = await import('./pdf-page-count')
    expect(await readPdfPageCount(blob)).toBe(2)
    expect(pdfjs.getDocument.mock.calls[0][0]).toEqual({ data: new Uint8Array([37, 80, 68, 70]), stopAtErrors: true })
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('/libs/pdfjs/pdf.worker.min.js')
    expect(pdfjs.destroy).toHaveBeenCalledOnce()
  })

  it('loads the parser once for simultaneous reads', async () => {
    const { readPdfPageCount } = await import('./pdf-page-count')
    const reads = [readPdfPageCount(blob), readPdfPageCount(blob)]
    const scripts = document.head.querySelectorAll('script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('src')).toBe('/libs/pdfjs/pdf.min.js')
    ;(window as PdfWindow)['pdfjs-dist/build/pdf'] = parser()
    scripts[0].dispatchEvent(new Event('load'))
    expect(await Promise.all(reads)).toEqual([2, 2])
  })

  it('rejects invalid metadata and releases its parsing resources', async () => {
    const pdfjs = parser(Promise.resolve({ numPages: 0 }))
    ;(window as PdfWindow)['pdfjs-dist/build/pdf'] = pdfjs
    const { readPdfPageCount } = await import('./pdf-page-count')
    await expect(readPdfPageCount(blob)).rejects.toThrow('Invalid PDF page count')
    expect(pdfjs.destroy).toHaveBeenCalledOnce()
  })

  it('allows retry after the lazy script fails to load', async () => {
    const { readPdfPageCount } = await import('./pdf-page-count')
    const first = readPdfPageCount(blob)
    const firstRejected = expect(first).rejects.toThrow('failed to load')
    document.head.querySelector('script')!.dispatchEvent(new Event('error'))
    await firstRejected
    const second = readPdfPageCount(blob)
    const script = document.head.querySelector('script')!
    ;(window as PdfWindow)['pdfjs-dist/build/pdf'] = parser()
    script.dispatchEvent(new Event('load'))
    expect(await second).toBe(2)
  })
})
