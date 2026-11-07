import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { convertWordToPdf } from './word-preview-worker'
import type { ExportProgressListener } from './export-progress'
import { rasterizePdfToPngs } from '@/lib/pdf-to-png'
import {
  newSharedPuppeteerPage,
  closeSharedPuppeteerPage,
} from '@/lib/puppeteer-browser'

export class DocxPreviewError extends Error {
  constructor() {
    super('Word 预览生成失败，请重试。预览完成前不会扣除导出次数。')
    this.name = 'DocxPreviewError'
  }
}

/** Convert the exact generated DOCX, never the editor HTML, to preview pages. */
export async function renderDocxPreview(
  buffer: Buffer,
  progress: ExportProgressListener = () => {},
): Promise<readonly Buffer[]> {
  if (buffer.length < 4 || buffer.subarray(0, 4).toString('hex') !== '504b0304')
    throw new DocxPreviewError()
  // Keep runtime files in a dedicated subtree. Next's dependency tracer must
  // never glob the entire system temp directory while tracing the PDF read.
  const root = join(tmpdir(), 'aijianli-word-preview')
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'job-'))
  try {
    const input = join(directory, 'resume.docx')
    await writeFile(input, buffer)
    await convertWordToPdf(input, join(directory, 'resume.pdf'), progress)
    const pdf = await readFile(join(directory, 'resume.pdf'))
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new Error('Invalid converted PDF')
    progress('rendering')
    const page = await newSharedPuppeteerPage()
    try {
      const images = await rasterizePdfToPngs(page, pdf)
      if (!images.length) throw new Error('Empty Word preview')
      return images
    } finally {
      await closeSharedPuppeteerPage(page)
    }
  } catch (error) {
    console.error(
      '[docx-preview] conversion failed',
      error instanceof Error ? error.message : String(error),
    )
    throw new DocxPreviewError()
  } finally {
    // Only the directory created by this invocation is removed.
    await rm(directory, { recursive: true, force: true, maxRetries: 3 })
  }
}
