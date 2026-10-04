import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer'

const root = process.cwd()
const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/pdf-page-feedback')
await fs.mkdir(out, { recursive: true })
const require = createRequire(import.meta.url)
const esbuildPath = (await fs.readdir(path.join(root, 'node_modules/.pnpm'))).find(name => name.startsWith('esbuild@'))
const esbuild = require(path.join(root, `node_modules/.pnpm/${esbuildPath}/node_modules/esbuild/lib/main.js`))
const fixtureBundle = await esbuild.build({ stdin: { contents: 'export { getTemplateFixture } from "./src/lib/template-fixtures"', resolveDir: root, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node' })
const { getTemplateFixture } = await import(`data:text/javascript;base64,${Buffer.from(fixtureBundle.outputFiles[0].text).toString('base64')}`)
const fixture = getTemplateFixture('long')
const python = process.env.PDF_QA_PYTHON || 'C:/Users/62765/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = []
const passed = (check, evidence = {}) => { results.push({ check, pass: true, ...evidence }); console.log(`PASS ${check}`) }
const status = '[data-resume-page-feedback] [role=status]'
let page
async function newEditor() {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })
  await page.evaluateOnNewDocument(resume => {
    // Isolated client fixture only: no auth cookie and no persisted resume to save.
    // Keep the forced-login overlay from hiding the measured document in this UI test.
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'pagination-ui-fixture', userInfo: null }, version: 0 }))
    localStorage.setItem('import_pending_resume', JSON.stringify(resume))
    localStorage.removeItem('resume_editor_draft_backup_v1')
  }, fixture)
  await page.goto(`${baseUrl}/editor/new?template=qingning&source=import`, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.waitForSelector('.qingning-resume')
  await page.waitForFunction(() => document.querySelector('.resume-document-main')?.textContent.includes('欧阳承远'))
  return page
}
async function clickText(page, selector, text) {
  const element = await page.evaluateHandle(({ selector, text }) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === text), { selector, text })
  await element.click()
}
async function estimate(page) {
  await page.waitForFunction(selector => document.querySelector(selector)?.dataset.pageCountSource === 'estimate' && document.querySelector(selector)?.textContent.startsWith('预计 '), {}, status)
}
async function verified(page, count) {
  await page.waitForFunction(({ selector, count }) => document.querySelector(selector)?.textContent === `PDF 实际 ${count} 页` && document.querySelector(selector)?.dataset.pageCountSource === 'pdf', { timeout: 30000 }, { selector: status, count })
}
async function closePreview(page) {
  await page.click('[role=dialog] button:has(.lucide-x)')
  await page.waitForSelector('iframe[title="PDF 预览"]', { hidden: true })
}
async function editName(page, name) {
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#name')
  await page.click('#name', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type('#name', name)
  await clickText(page, '[role=dialog] button', '确定')
  await page.waitForSelector('#name', { hidden: true })
}
function pdfCount(file) {
  const result = spawnSync(python, ['-c', 'import sys,pdfplumber; p=pdfplumber.open(sys.argv[1]); print(len(p.pages)); p.close()', file], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return Number(result.stdout.trim())
}
async function previewBytes(page) {
  await page.waitForSelector('iframe[title="PDF 预览"]')
  // Read the same local Blob as the viewer. Older CDP clients can report an
  // empty body for binary attachment responses in current Chrome versions.
  return Buffer.from(await page.evaluate(async () => {
    const url = document.querySelector('iframe[title="PDF 预览"]').src.split('#')[0]
    const buffer = await (await fetch(url)).arrayBuffer()
    return [...new Uint8Array(buffer)]
  }))
}
async function preview(page, name) {
  const response = page.waitForResponse(res => res.url().endsWith('/next-api/generate-pdf') && res.request().method() === 'POST', { timeout: 90000 })
  await page.click('header button[title="导出"]')
  const pdfResponse = await response
  assert.equal(pdfResponse.status(), 200)
  assert.equal(JSON.parse(pdfResponse.request().postData()).preview, true)
  const bytes = await previewBytes(page)
  const file = path.join(out, `${name}.pdf`)
  await fs.writeFile(file, bytes)
  const count = pdfCount(file)
  await verified(page, count)
  return { count, bytes, file }
}
try {
  page = await newEditor()
  await estimate(page)
  assert.equal(await page.$('script[src="/libs/pdfjs/pdf.min.js"]'), null)
  assert.ok((await page.$eval('[data-resume-page-feedback]', el => el.textContent)).includes('显示分页参考线'))
  await page.waitForSelector('[data-resume-page-boundary]')
  assert.ok((await page.$eval('[data-resume-page-boundary]', el => el.textContent)).includes('（参考）'))
  await clickText(page, '[data-resume-page-feedback] button', '查看预计跨页位置')
  await page.waitForFunction(() => document.querySelector('[data-editor-canvas]').scrollTop > 100)
  passed('real PC editor labels estimated boundaries honestly and keeps the locate action usable; PDF.js stays lazy')

  const first = await preview(page, 'initial-preview')
  assert.ok((await page.$eval('[role=dialog]', el => el.textContent)).includes(`实际 PDF 共 ${first.count} 页`))
  await page.screenshot({ path: path.join(out, 'pdf-preview-count.png') })
  await closePreview(page)
  await verified(page, first.count)
  await page.screenshot({ path: path.join(out, 'verified-feedback.png') })
  passed('actual preview page count equals independent pdfplumber metadata and remains visible after closing', { actualPdfPages: first.count })

  await page.click('[data-resume-page-feedback] input[type=checkbox]')
  await page.click('[data-resume-page-feedback] input[type=checkbox]')
  await verified(page, first.count)
  passed('toggling reference lines does not invalidate a verified PDF count')

  await editName(page, '分页反馈核对')
  await estimate(page)
  await page.screenshot({ path: path.join(out, 'edited-estimate.png') })
  passed('editing saved resume content immediately restores estimated page feedback')

  const second = await preview(page, 'edited-preview')
  await closePreview(page)
  await page.click('header button[title="样式"]')
  if (!await page.$('#font-size-select')) await clickText(page, '[role=tab]', '样式设置')
  await page.waitForSelector('#font-size-select')
  await page.click('#font-size-select')
  await clickText(page, '[role=option]', '偏大')
  await estimate(page)
  passed('changing typography invalidates verified counts from an older layout', { previousActualPdfPages: second.count })

  const styled = await preview(page, 'styled-preview')
  await closePreview(page)
  let held
  let captured
  const intercepted = new Promise(resolve => { captured = resolve })
  await page.setRequestInterception(true)
  const intercept = req => {
    if (!held && req.url().endsWith('/next-api/generate-pdf') && req.method() === 'POST') { held = req; captured(); return }
    void req.continue()
  }
  page.on('request', intercept)
  const response = page.waitForResponse(res => res.url().endsWith('/next-api/generate-pdf'), { timeout: 90000 })
  await page.click('header button[title="导出"]')
  await intercepted
  await editName(page, '生成期间继续编辑')
  await estimate(page)
  await held.continue()
  assert.equal((await response).status(), 200)
  await page.waitForSelector('iframe[title="PDF 预览"]')
  await estimate(page)
  await closePreview(page)
  await estimate(page)
  page.off('request', intercept)
  await page.setRequestInterception(false)
  passed('an older PDF finishing after an edit never replaces the current estimate', { previousActualPdfPages: styled.count })

  const failed = await newEditor()
  let parserFailed = false
  failed.on('console', msg => { if (msg.text().includes('无法读取 PDF 页数')) parserFailed = true })
  await failed.setRequestInterception(true)
  failed.on('request', req => {
    if (req.url().endsWith('/libs/pdfjs/pdf.min.js')) { void req.abort(); return }
    if (req.url().endsWith('/next-api/generate-pdf')) { void req.respond({ status: 200, contentType: 'application/pdf', body: first.bytes }); return }
    void req.continue()
  })
  await failed.click('header button[title="导出"]')
  await failed.waitForSelector('iframe[title="PDF 预览"]')
  for (let n = 0; n < 100 && !parserFailed; n++) await new Promise(resolve => setTimeout(resolve, 100))
  assert.equal(parserFailed, true)
  await estimate(failed)
  assert.ok(await failed.$('iframe[title="PDF 预览"]'))
  passed('a parser network failure preserves the PDF preview and estimated feedback')
  await failed.close()

  const lab = await browser.newPage()
  await lab.setViewport({ width: 1440, height: 1000 })
  await lab.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2', timeout: 60000 })
  await lab.waitForSelector('[data-qa-preview-pdf]')
  const labResponse = lab.waitForResponse(res => res.url().endsWith('/next-api/generate-pdf'), { timeout: 90000 })
  await lab.click('[data-qa-preview-pdf]')
  const labPdf = await labResponse
  assert.equal(labPdf.status(), 200)
  const labFile = path.join(out, 'scenario-preview.pdf')
  await fs.writeFile(labFile, await previewBytes(lab))
  const labCount = pdfCount(labFile)
  await verified(lab, labCount)
  await closePreview(lab)
  await verified(lab, labCount)
  await lab.screenshot({ path: path.join(out, 'scenario-feedback.png') })
  passed('the current scenario review page offers the same real PDF count workflow', { actualPdfPages: labCount })
  await lab.close()
} catch (error) {
  results.push({ check: 'browser verification', pass: false, error: error.stack })
  await page?.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
