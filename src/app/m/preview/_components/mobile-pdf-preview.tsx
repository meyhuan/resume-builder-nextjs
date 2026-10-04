'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { loadPdfJs, type PdfDocument, type PdfRenderTask } from '@/io/pdf-page-count'

export function MobilePdfPreview({ blob, onClose }: { readonly blob: Blob | null; readonly onClose: () => void }) {
  return <Dialog open={!!blob} onOpenChange={next => { if (!next) onClose() }}>
    <DialogContent hideCloseButton className="inset-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div><DialogTitle className="text-base">PDF 分页预览</DialogTitle><DialogDescription className="mt-1 text-xs">按当前排版生成 PDF；预览不消耗导出次数。</DialogDescription></div>
        <button type="button" aria-label="关闭 PDF 分页预览" className="flex size-11 shrink-0 items-center justify-center rounded-lg" onClick={onClose}><X size={20} /></button>
      </div>
      {blob && <PdfPages blob={blob} />}
    </DialogContent>
  </Dialog>
}

/** Render one page at a time, so phones do not depend on a built-in PDF plugin. */
function PdfPages({ blob }: { readonly blob: Blob }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [document, setDocument] = useState<PdfDocument | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [rendering, setRendering] = useState(true)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    let task: ReturnType<Awaited<ReturnType<typeof loadPdfJs>>['getDocument']> | undefined
    async function open() {
      try {
        const [pdfjs, buffer] = await Promise.all([loadPdfJs(), blob.arrayBuffer()])
        if (cancelled) return
        pdfjs.GlobalWorkerOptions.workerSrc = '/libs/pdfjs/pdf.worker.min.js'
        task = pdfjs.getDocument({ data: new Uint8Array(buffer), stopAtErrors: true })
        const pdf = await task.promise
        if (!cancelled) setDocument(pdf)
      } catch {
        if (!cancelled) { setError('PDF 预览加载失败，请重试。'); setRendering(false) }
      }
    }
    void open()
    return () => { cancelled = true; void task?.destroy().catch(() => undefined) }
  }, [blob, retry])

  useEffect(() => {
    if (!document || !canvas.current) return
    let cancelled = false
    let renderTask: PdfRenderTask | undefined
    async function render() {
      try {
        const pdfPage = await document!.getPage(page)
        if (cancelled || !canvas.current) return
        const width = Math.max(240, (scroller.current?.clientWidth ?? window.innerWidth) - 24)
        const viewport = pdfPage.getViewport({ scale: Math.min(width * zoom * Math.min(window.devicePixelRatio || 1, 2), 2048) / pdfPage.getViewport({ scale: 1 }).width })
        canvas.current.width = Math.ceil(viewport.width)
        canvas.current.height = Math.ceil(viewport.height)
        const context = canvas.current.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        renderTask = pdfPage.render({ canvasContext: context, viewport })
        await renderTask.promise
        if (!cancelled) { setRendering(false); scroller.current?.scrollTo({ top: 0 }) }
      } catch {
        if (!cancelled) { setError('当前页显示失败，请重试。'); setRendering(false) }
      }
    }
    void render()
    return () => { cancelled = true; renderTask?.cancel() }
  }, [document, page, zoom])

  function turn(next: number) { setRendering(true); setError(''); setPage(next) }
  function reload() { setError(''); setRendering(true); setDocument(null); setPage(1); setRetry(current => current + 1) }
  return <>
    <div className="flex shrink-0 items-center justify-between gap-2 bg-slate-100 px-3">
      <p role="status" className="py-2 text-sm text-slate-600">{error || (rendering ? '正在加载页面…' : `PDF 实际 ${document?.numPages} 页`)}</p>
      <button type="button" disabled={!document || rendering || !!error} onClick={() => { setRendering(true); setZoom(current => current === 1 ? 2 : 1) }}
        className="min-h-11 shrink-0 rounded-lg px-3 text-sm text-violet-700 disabled:opacity-40">{zoom === 1 ? '放大' : '适屏'}</button>
    </div>
    <div ref={scroller} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
      {error ? <button type="button" onClick={reload} className="mx-auto block min-h-11 rounded-lg border bg-white px-5">重试</button> :
        <canvas ref={canvas} role="img" aria-label={`PDF 第 ${page} 页`} className="mx-auto block bg-white shadow-sm" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? '768px' : 'none', visibility: rendering ? 'hidden' : 'visible' }} />}
    </div>
    <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
      <button type="button" disabled={!document || rendering || page <= 1} onClick={() => turn(page - 1)} className="flex min-h-11 items-center gap-1 rounded-lg px-3 disabled:opacity-40"><ChevronLeft size={18} />上一页</button>
      <span aria-live="polite" className="text-sm tabular-nums">{document ? `${page} / ${document.numPages}` : '—'}</span>
      <button type="button" disabled={!document || rendering || page >= document.numPages} onClick={() => turn(page + 1)} className="flex min-h-11 items-center gap-1 rounded-lg px-3 disabled:opacity-40">下一页<ChevronRight size={18} /></button>
    </div>
  </>
}
