import { afterAll, expect, it } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { exportResumeToDocx } from '../src/io/export-docx'
import { getTemplateFixture } from '../src/lib/template-fixtures'
import { renderDocxPreview } from '../src/lib/docx-preview'
import {
  prewarmWordPreview,
  shutdownWordPreview,
} from '../src/lib/word-preview-worker'
import {
  cachedWordPreview,
  wordPreviewKey,
} from '../src/lib/word-preview-cache'
afterAll(() => shutdownWordPreview(), 15000)
it.skipIf(!process.env.LIBREOFFICE_PATH)(
  'benchmarks cold start, warm conversion and cached previews',
  async () => {
    const results: unknown[] = []
    const start = performance.now()
    await prewarmWordPreview()
    results.push({
      label: 'startup',
      ms: Math.round(performance.now() - start),
    })
    for (const [label, template, suffix] of [
      ['first-after-prewarm', 'canva-minimal', 'a'],
      ['repeat-cache', 'canva-minimal', 'a'],
      ['warm-uncached', 'canva-minimal', 'b'],
      ['warm-columns', 'canva-columns', 'c'],
      ['warm-sidebar', 'canva-sidebar', 'd'],
    ]) {
      const resume = getTemplateFixture('full')
      const key = wordPreviewKey('benchmark', suffix, template, resume, {})
      const marks: { stage: string; ms: number }[] = []
      const begin = performance.now()
      const value = await cachedWordPreview(
        key,
        async (progress) => {
          progress('generating')
          const buffer = await exportResumeToDocx(resume, template)
          return { buffer, images: await renderDocxPreview(buffer, progress) }
        },
        (stage) =>
          marks.push({ stage, ms: Math.round(performance.now() - begin) }),
      )
      expect(value.images.length).toBeGreaterThan(0)
      const result = {
        label,
        ms: Math.round(performance.now() - begin),
        marks,
        pages: value.images.length,
        imageHash: createHash('sha256').update(value.images[0]).digest('hex'),
      }
      results.push(result)
      console.log('WORD_PERFORMANCE', JSON.stringify(result))
      await mkdir('test-artifacts/word-preview-performance', {
        recursive: true,
      })
      await writeFile(
        'test-artifacts/word-preview-performance/results.json',
        JSON.stringify(results, null, 2),
      )
    }
  },
  180000,
)
