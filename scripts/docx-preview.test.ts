import { afterAll, expect, it } from 'vitest'
import { shutdownWordPreview } from '../src/lib/word-preview-worker'
afterAll(() => shutdownWordPreview(), 15000)
import { mkdir, writeFile } from 'node:fs/promises'
import { renderDocxPreview, DocxPreviewError } from '../src/lib/docx-preview'
import { exportResumeToDocx } from '../src/io/export-docx'
import { getTemplateFixture } from '../src/lib/template-fixtures'

// Opt in to the real local converter; ordinary CI keeps portable unit tests.
it
  .skipIf(!process.env.LIBREOFFICE_PATH)
  .each(['canva-minimal', 'canva-columns', 'canva-sidebar'])(
  'renders the actual %s DOCX into viewable preview pages',
  async (templateId) => {
    const buffer = await exportResumeToDocx(
      getTemplateFixture('full'),
      templateId,
    )
    const pages = await renderDocxPreview(buffer)
    expect(pages.length).toBeGreaterThan(0)
    await mkdir('test-artifacts/word-preview', { recursive: true })
    await writeFile(`test-artifacts/word-preview/${templateId}.docx`, buffer)
    for (const [index, page] of pages.entries()) {
      expect(page.subarray(0, 2).toString('hex')).toBe('ffd8')
      expect(page.length).toBeGreaterThan(5000)
      await writeFile(
        `test-artifacts/word-preview/${templateId}-${index + 1}.jpg`,
        page,
      )
    }
  },
  120_000,
)

it.skipIf(!process.env.LIBREOFFICE_PATH)(
  'rejects invalid Word input instead of producing a false preview',
  async () => {
    await expect(renderDocxPreview(Buffer.alloc(0))).rejects.toBeInstanceOf(
      DocxPreviewError,
    )
  },
  90_000,
)
