export interface PdfRenderTask {
  readonly promise: Promise<void>
  cancel(): void
}

export interface PdfPage {
  getViewport(options: { readonly scale: number }): { readonly width: number; readonly height: number }
  render(options: { readonly canvasContext: CanvasRenderingContext2D; readonly viewport: ReturnType<PdfPage['getViewport']> }): PdfRenderTask
}

export interface PdfDocument {
  readonly numPages: number
  getPage(pageNumber: number): Promise<PdfPage>
}

interface PdfLoadingTask {
  readonly promise: Promise<PdfDocument>
  destroy(): Promise<void>
}

interface PdfJs {
  readonly GlobalWorkerOptions: { workerSrc: string }
  getDocument(options: { readonly data: Uint8Array; readonly stopAtErrors: boolean }): PdfLoadingTask
}

let scriptPromise: Promise<PdfJs> | undefined

function currentPdfJs(): PdfJs | undefined {
  return (window as Window & { 'pdfjs-dist/build/pdf'?: PdfJs })['pdfjs-dist/build/pdf']
}

export function loadPdfJs(): Promise<PdfJs> {
  const existing = currentPdfJs()
  if (existing) return Promise.resolve(existing)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<PdfJs>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/libs/pdfjs/pdf.min.js'
    script.async = true
    const timer = window.setTimeout(() => fail(), 10000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('PDF page counter failed to load'))
    }
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timer)
      const pdfjs = currentPdfJs()
      if (pdfjs) resolve(pdfjs)
      else fail()
    }
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    scriptPromise = undefined
    throw error
  })
  return scriptPromise
}

/** Read the generated PDF itself; load the bundled parser only after a preview. */
export async function readPdfPageCount(blob: Blob): Promise<number> {
  const [pdfjs, buffer] = await Promise.all([loadPdfJs(), blob.arrayBuffer()])
  pdfjs.GlobalWorkerOptions.workerSrc = '/libs/pdfjs/pdf.worker.min.js'
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), stopAtErrors: true })
  try {
    const document = await task.promise
    if (!Number.isInteger(document.numPages) || document.numPages < 1) throw new Error('Invalid PDF page count')
    return document.numPages
  } finally {
    await task.destroy().catch(() => undefined)
  }
}
