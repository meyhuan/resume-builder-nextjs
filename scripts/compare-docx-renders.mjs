import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

const output = path.resolve(process.argv[2] || 'test-artifacts/comparison/pagination-2026-10-23')
const baseUrl = process.argv[3] || 'http://127.0.0.1:3012'
const source = ts.createSourceFile('qa.mjs', fs.readFileSync('scripts/verify-template.mjs', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const context = { fs, pdfjsPath: path.resolve('public/libs/pdfjs/pdf.min.js'), pdfjsWorkerPath: path.resolve('public/libs/pdfjs/pdf.worker.min.js') }
const helper = name => vm.runInNewContext(`(${source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(source)})`, context)
const exportHtml = helper('buildTemplateLabExportHtml')
const paginate = helper('applyPdfPaginationHints')
const analyze = helper('analyzePdfPages')
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })
const results = []
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1 })
  for (const id of ['canva-minimal', 'canva-columns', 'canva-sidebar']) {
    for (const fixture of ['full', 'long', 'sparse']) {
      const name = `${id}-${fixture}`
      const folder = path.join(output, 'browser', name)
      fs.mkdirSync(folder, { recursive: true })
      await page.emulateMediaType('screen')
      await page.bringToFront()
      await page.goto(`${baseUrl}/dev/template-lab?tpl=${id}&fixture=${fixture}&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle0', timeout: 120000 })
      await page.waitForSelector('[data-template-lab="ready"] .resume-container')
      await page.evaluate(() => document.fonts.ready)
      const root = await page.$('[data-template-root="true"] .resume-container')
      await root.screenshot({ path: path.join(folder, 'html.png') })
      const html = await exportHtml(page)
      fs.writeFileSync(path.join(folder, 'export.html'), html)
      const print = await browser.newPage()
      try {
        await print.setViewport({ width: 794, height: 1123 })
        await print.emulateMediaType('print')
        await print.setContent(html.replace('<head>', `<head><base href="${baseUrl}/">`), { waitUntil: 'networkidle0' })
        await print.evaluate(() => document.fonts.ready)
        await paginate(print)
        const pdf = Buffer.from(await print.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }))
        fs.writeFileSync(path.join(folder, 'export.pdf'), pdf)
        const analysis = await analyze(print, pdf)
        for (const rendered of analysis.renderedPages) fs.writeFileSync(path.join(folder, `pdf-page-${rendered.pageNumber}.png`), Buffer.from(rendered.png, 'base64'))
        results.push({ name, pages: analysis.pages })
        console.log(name, analysis.pages.map(p => p.textChars))
      } finally { await print.close() }
    }
  }
} finally { await browser.close() }
fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2))
