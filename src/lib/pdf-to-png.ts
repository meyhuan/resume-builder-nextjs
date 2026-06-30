import type { Page } from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

// Read the PDF.js scripts once at module load time and cache them in memory.
// This avoids a network round-trip on every export request and keeps PDF.js
// independent from Chromium's profile cache.
function readPdfjsScript(filename: string): string {
  const filePath = path.join(process.cwd(), 'public', 'libs', 'pdfjs', filename)
  return fs.readFileSync(filePath, 'utf-8')
}

let _pdfjsContent: string | null = null
let _pdfjsWorkerContent: string | null = null

function getPdfjsContent(): string {
  if (!_pdfjsContent) _pdfjsContent = readPdfjsScript('pdf.min.js')
  return _pdfjsContent
}

function getPdfjsWorkerContent(): string {
  if (!_pdfjsWorkerContent) _pdfjsWorkerContent = readPdfjsScript('pdf.worker.min.js')
  return _pdfjsWorkerContent
}

/**
 * Converts a PDF buffer into an array of PNG buffers (one per page).
 * 
 * THE ULTIMATE WORKAROUND FOR NODE.JS CANVAS HELL:
 * Instead of compiling node-canvas on Windows/Vercel with ghostscript/cairo dependencies,
 * this utility injects the browser-version of PDF.js into a headless browser page, feeds it 
 * the PDF base64, and lets the real Chromium Canvas API do the rasterization perfectly.
 *
 * @param page An active Puppeteer page instance. Note: this will navigate the page to about:blank.
 * @param pdfBuffer The PDF file as a Buffer.
 * @param scale Resolution scale (default: 1.5 — good balance of quality vs file size for mobile preview).
 * @returns Array of JPEG image Buffers corresponding to each page.
 */
export async function rasterizePdfToPngs(page: Page, pdfBuffer: Buffer, scale: number = 1.5): Promise<Buffer[]> {
  const pageScreenshots: Buffer[] = []
  
  console.log('[pdf-to-png] starting in-browser PDF rasterization...')
  // Clear the page to free memory and prep a clean environment for PDF.js
  await page.goto('about:blank')
  
  // Inject PDF.js from local file content (cached in memory after first read).
  // Using `content` instead of `url` avoids any network request — the script
  // is inlined directly into the page, which also works on about:blank.
  await page.addScriptTag({ content: getPdfjsContent() })
  
  const pdfBase64 = pdfBuffer.toString('base64')
  // Pass the worker script as inline content so Puppeteer can create a blob URL
  // for it — no network fetch needed.
  const workerContent = getPdfjsWorkerContent()
  
  const dataUrls = await page.evaluate(async (base64Data, renderScale, pdfjsWorkerJs) => {
    // @ts-expect-error - injected globally by script tag
    const pdfjsLib = window['pdfjs-dist/build/pdf']
    // Create a blob URL from the worker source so PDF.js can spawn the worker
    // without making any outbound HTTP requests.
    const workerBlob = new Blob([pdfjsWorkerJs], { type: 'application/javascript' })
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob)
    
    // Convert base64 to Uint8Array
    const binary = atob(base64Data)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    
    const doc = await pdfjsLib.getDocument({ data: array }).promise
    const pngs: string[] = []
    
    for (let i = 1; i <= doc.numPages; i++) {
      const pdfPage = await doc.getPage(i)
      const viewport = pdfPage.getViewport({ scale: renderScale })
      
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get 2d context')
      
      await pdfPage.render({ canvasContext: ctx, viewport }).promise
      pngs.push(canvas.toDataURL('image/jpeg', 0.85))
    }
    
    return pngs
  }, pdfBase64, scale, workerContent)

  for (const dataUrl of dataUrls) {
    // Strip the "data:image/png;base64," prefix
    const base64 = dataUrl.split(',')[1]
    if (base64) {
      pageScreenshots.push(Buffer.from(base64, 'base64'))
    }
  }
  
  console.log('[pdf-to-png] in-browser rasterization complete', { count: pageScreenshots.length })
  return pageScreenshots
}
