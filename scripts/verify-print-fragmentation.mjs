import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

// Test native Chromium pagination, not just the presence of CSS declarations.
// Synthetic content only; no account, saved resume or network dependency.
const source = await fs.readFile(process.argv[2] || 'src/lib/print-pagination.ts', 'utf8')
const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module.exports })
const css = module.exports.PRINT_PAGINATION_CSS
const out = path.resolve('test-artifacts/print-fragmentation')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, ...(process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}) })
const results = []
try {
  for (const width of [1440, 390]) {
    for (const kind of ['paragraphs', 'list', 'line-breaks', 'header-boundary', 'compact', 'compact-boundary']) {
      const page = await browser.newPage()
      await page.setViewport({ width, height: 900 })
      const count = kind.startsWith('compact') ? 3 : kind === 'line-breaks' ? 32 : 27
      const lines = Array.from({ length: count }, (_, i) => `MARKER_${String(i).padStart(2, '0')} responsible for planning, delivery and quality.`)
      const rich = kind === 'list' ? `<ul>${lines.map(s => `<li>${s}</li>`).join('')}</ul>`
        : kind === 'line-breaks' ? `<p>${lines.join('<br>')}</p>` : lines.map(s => `<p>${s}</p>`).join('')
      const spacer = kind === 'header-boundary' ? 1010 : kind === 'compact-boundary' ? 980 : kind === 'compact' ? 930 : 300
      await page.setContent(`<!doctype html><style>
        @page {size:A4; margin:19mm 0} @page:first {margin-top:0}
        * {box-sizing:border-box} body {margin:0;font:15px/24px Arial}
        main {width:794px;padding:0 57px} p,li {margin:0 0 6px} ul {margin:0;padding-left:20px}
        .flow-root {display:flow-root} h3 {font: bold 15px/24px Arial;margin:0}
        [data-print-block-header] {display:flex;justify-content:space-between;margin-bottom:8px}
        ${css}
        </style><main><div style="height:${spacer}px">WORK_END</div>
        <div class="flow-root"><div class="flow-root project-item" data-resume-block>
          <div data-print-block-header><h3>PROJECT_TITLE</h3><span>2026_DATE</span></div>
          <div data-print-splittable="true">${rich}</div>
        </div></div><p>DOCUMENT_END</p></main>`, { waitUntil: 'load' })
      await page.emulateMediaType('print')
      await page.evaluate(module.exports.preparePrintFragmentation)
      const firstDecisions = await page.$$eval('[data-print-keep-together]', items => items.length)
      await page.evaluate(module.exports.preparePrintFragmentation)
      assert.equal(await page.$$eval('[data-print-keep-together]', items => items.length), firstDecisions, 'classification must be idempotent')
      const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }))
      const name = `${width}-${kind}`
      await fs.writeFile(path.join(out, `${name}.pdf`), pdf)
      await page.goto('about:blank')
      await page.addScriptTag({ path: path.resolve('public/libs/pdfjs/pdf.min.js') })
      const worker = await fs.readFile('public/libs/pdfjs/pdf.worker.min.js', 'utf8')
      const pages = await page.evaluate(async ({ encoded, worker }) => {
        const pdfjs = window['pdfjs-dist/build/pdf']
        pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([worker], { type: 'application/javascript' }))
        const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(encoded), c => c.charCodeAt(0)) }).promise
        const pages = []
        for (let n = 1; n <= doc.numPages; n++) {
          const p = await doc.getPage(n)
          pages.push((await p.getTextContent()).items.map(t => ({ text: t.str, y: t.transform[5] })))
        }
        await doc.destroy()
        return pages
      }, { encoded: pdf.toString('base64'), worker })
      const text = pages.flat().map(t => t.text).join(' ')
      for (const marker of [...lines.map((_, i) => `MARKER_${String(i).padStart(2, '0')}`), 'PROJECT_TITLE', '2026_DATE', 'DOCUMENT_END']) {
        assert.equal(text.split(marker).length - 1, 1, `${name}: missing/duplicated ${marker}`)
      }
      const firstBody = pages.findIndex(items => items.some(t => t.text.includes('MARKER_00')))
      const titlePage = pages.findIndex(items => items.some(t => t.text.includes('PROJECT_TITLE')))
      assert.equal(titlePage, firstBody, `${name}: title stranded on previous page`)
      if (['paragraphs', 'list', 'line-breaks'].includes(kind)) {
        assert.equal(firstBody, 0, `${name}: long body pushed wholesale to next page`)
        assert.ok(pages[0].some(t => t.text.includes('MARKER_') && t.y < 160), `${name}: excessive blank space at page bottom`)
      }
      if (kind === 'header-boundary') assert.equal(firstBody, 1, `${name}: header/body must move together`)
      if (kind.startsWith('compact')) assert.ok(pages[firstBody].some(t => t.text.includes('MARKER_02')), `${name}: short item split unnecessarily`)
      if (kind === 'compact-boundary') assert.equal(firstBody, 1, `${name}: short item should move intact`)
      assert.ok(pages.every(items => items.some(t => t.text.trim())), `${name}: empty page`)
      results.push({ name, pages: pages.length, pass: true })
      console.log(`PASS ${name} (${pages.length} pages)`)
      await page.close()
    }
  }
  const classificationPage = await browser.newPage()
  await classificationPage.emulateMediaType('print')
  for (const [name, attrs, height, expected] of [
    ['normal-short', '', 200, 1],
    ['bleed-short', 'data-bleed="true"', 200, 1],
    ['bleed-long', 'data-bleed="true"', 800, 0],
    ['one-page-fit', 'data-one-page="true"', 200, 0],
    ['one-page-fallback', 'data-one-page="false"', 200, 1],
    ['large-margins', 'data-page-padding-vertical="60"', 250, 0],
  ]) {
    await classificationPage.setContent(`<div class="resume-container" ${attrs}><div data-resume-block style="height:${height}px"><div data-print-splittable="true">Content</div></div></div>`)
    await classificationPage.evaluate(module.exports.preparePrintFragmentation)
    assert.equal(await classificationPage.$$eval('[data-print-keep-together]', items => items.length), expected, name)
    // Growing an already measured item must remove its old keep-together hint.
    await classificationPage.$eval('[data-resume-block]', item => { item.style.height = '1200px' })
    await classificationPage.evaluate(module.exports.preparePrintFragmentation)
    assert.equal(await classificationPage.$$eval('[data-print-keep-together]', items => items.length), 0, `${name}: stale measurement`)
    results.push({ name, pass: true })
    console.log(`PASS ${name} and remeasurement`)
  }
  await classificationPage.close()
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
