import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) throw new Error('Local fixtures only')
const out = path.resolve('test-artifacts/mobile-choice-parity')
await fs.mkdir(out, { recursive: true })
const require = createRequire(import.meta.url)
const dir = (await fs.readdir('node_modules/.pnpm')).find(name => name.startsWith('esbuild@'))
const esbuild = require(path.resolve(`node_modules/.pnpm/${dir}/node_modules/esbuild/lib/main.js`))
const bundled = await esbuild.build({ stdin: { contents: 'export { getTemplateFixture } from "./src/lib/template-fixtures"', resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' })
const { getTemplateFixture } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const full = structuredClone(getTemplateFixture('full'))
full.id = 'mobile-parity-local'
full.baseInfo.phone = '13812345678'
full.baseInfo.email = 'li@company.cn'
full.baseInfo.currentLocation = '上海'
full.baseInfo.location = '旧城市'
full.baseInfo.workStartTime = '2025.01'
const work = full.sections.find(section => section.title === '工作经历').blocks[0]
work.startDate = '2025.01'; work.endDate = '2025.06'
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const results = [], runtimeErrors = [], requests = []
let savedContent, currentFixture = full, activePage
const pass = (check, evidence = {}) => { results.push({ check, pass: true, ...evidence }); console.log(`PASS ${check}`) }
async function seed(page, resume, dirtyPaths = []) {
  currentFixture = resume
  await page.evaluate(async ({ resume, dirtyPaths }) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('keyval')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('keyval', 'readwrite')
        tx.objectStore('keyval').put(JSON.stringify({ state: { resumeId: resume.id, draft: resume, server: resume, templateId: 'qingning', dirtyPaths, celebratedMilestones: [], hiddenSectionIds: [] }, version: 0 }), 'resume-draft-v1')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, { resume, dirtyPaths })
}
async function input(page, label) {
  const node = await page.waitForFunction(label => [...document.querySelectorAll('input')].find(el => {
    const linked = [...document.querySelectorAll('label')].find(l => l.htmlFor === el.id && el.id)
    return (linked?.textContent || el.closest('label')?.firstElementChild?.textContent || '').replace('*', '').trim() === label
  }), { timeout: 30000 }, label)
  assert.ok(node.asElement(), `Missing input ${label}`)
  return node.asElement()
}
async function type(page, label, text) {
  const node = await input(page, label)
  await node.tap(); await node.evaluate(el => el.select()); await node.press('Backspace'); await node.type(text)
  return node
}
async function tapText(page, selector, text) {
  const node = await page.waitForFunction(({ selector, text }) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === text), {}, { selector, text })
  await node.asElement().tap()
}
async function month(page, label) {
  const node = await page.waitForFunction(label => [...document.querySelectorAll('button[aria-haspopup=dialog]')].find(el => document.getElementById(el.getAttribute('aria-labelledby')?.split(' ')[0])?.textContent.replace('*', '').trim() === label), {}, label)
  await node.asElement().tap()
  await page.waitForSelector('[role=dialog]')
  await new Promise(resolve => setTimeout(resolve, 450))
}
async function safeWidth(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true) }
async function touchScroll(page, selector, distance = 110) {
  const rect = await page.$eval(selector, el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(r.height - 15, 150) } })
  const client = await page.createCDPSession()
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [rect] })
  for (let i = 1; i <= 6; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x, y: rect.y - distance * i / 6 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}
try {
  const page = await browser.newPage(); activePage = page
  page.setDefaultTimeout(30000)
  page.on('pageerror', error => runtimeErrors.push(error.message))
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await page.setCookie({ name: 'auth_uid', value: 'mobile-parity-local-fixture', url: baseUrl })
  await page.setRequestInterception(true)
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/next-api/generate-pdf') { requests.push(JSON.parse(request.postData() || '{}')); void request.continue(); return }
    if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/api/')) {
      if (request.method() === 'PUT' && request.postData()) { const body = JSON.parse(request.postData()); if (body.content) savedContent = body.content }
      const body = request.method() === 'GET' && url.pathname.startsWith('/next-api/resumes/') ? { id: currentFixture.id, content: currentFixture, template: 'qingning' } : {}
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    } else void request.continue()
  })
  await page.evaluateOnNewDocument(() => {
    const original = window.fetch
    window.fetch = async (...args) => {
      const response = await original(...args)
      if (String(args[0]).includes('/next-api/generate-pdf') && response.ok) window.__qaPdfBytes = [...new Uint8Array(await response.clone().arrayBuffer())]
      return response
    }
  })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await seed(page, full)
  await page.goto(`${baseUrl}/m/edit/base?source=web&mini=0`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  assert.equal(await (await input(page, '所在城市')).evaluate(el => el.value), '上海')
  await type(page, '邮箱', 'xiaoyu@q')
  await tapText(page, '[role=option]', 'xiaoyu@qq.com')
  assert.equal(await (await input(page, '邮箱')).evaluate(el => el.value), 'xiaoyu@qq.com')
  await page.screenshot({ path: path.join(out, 'mobile-base-375.png'), fullPage: true })
  pass('375px email suffix is touch selectable; existing PC city is displayed')
  await type(page, '所在城市', 'kunshan')
  const cityOption = await page.waitForSelector('[role=option]')
  assert.match(await cityOption.evaluate(el => el.textContent), /昆山/)
  await cityOption.tap()
  await month(page, '工作开始月份')
  assert.match(await page.$eval('[role=dialog] [role=status]', el => el.textContent), /2025年1月/)
  await touchScroll(page, '[data-month-column] .text-violet-700', 44)
  await page.waitForFunction(() => document.querySelector('[role=dialog] [role=status]')?.textContent === '已选择 2025年2月')
  await new Promise(resolve => setTimeout(resolve, 350))
  await page.screenshot({ path: path.join(out, 'mobile-month-375.png') })
  await tapText(page, '[role=dialog] button', '确定')
  await page.waitForSelector('[role=dialog]', { hidden: true })
  const saveResponse = page.waitForResponse(res => res.url().endsWith('/next-api/resumes/mobile-parity-local') && res.request().method() === 'PUT')
  await page.click('button[aria-label="保存"]')
  await saveResponse
  await page.waitForFunction(() => location.pathname !== '/m/edit/base')
  assert.equal(savedContent.baseInfo.currentLocation, '昆山')
  assert.equal(savedContent.baseInfo.workStartTime, '2025.02')
  assert.equal(savedContent.baseInfo.email, 'xiaoyu@qq.com')
  pass('mobile selections save to PC currentLocation/email/workStartTime fields with dotted date intact')
  await page.goto(`${baseUrl}/m/edit/base?source=web&mini=0`, { waitUntil: 'domcontentloaded' })
  await type(page, '所在城市', '')
  await page.waitForSelector('[role=listbox]')
  const beforeScroll = await page.$eval('[role=listbox]', el => el.scrollTop)
  await touchScroll(page, '[role=listbox]')
  await page.waitForFunction(before => document.querySelector('[role=listbox]')?.scrollTop > before, {}, beforeScroll)
  await page.screenshot({ path: path.join(out, 'mobile-city-scroll.png') })
  pass('city suggestions scroll with a touch gesture')
  await page.keyboard.press('Escape')
  await page.goto(`${baseUrl}/m/edit/work/0?source=web&mini=0`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await month(page, '结束时间')
  await tapText(page, '[role=dialog] button', '至今')
  await page.waitForSelector('[role=dialog]', { hidden: true })
  await safeWidth(page)
  await page.screenshot({ path: path.join(out, 'mobile-work-375.png'), fullPage: true })
  pass('experience dates accept present with a touch; closed sheets are absent')
  await page.setViewport({ width: 320, height: 568, isMobile: true, hasTouch: true })
  await month(page, '开始时间')
  const rect = await page.$eval('[role=dialog]', el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight } })
  assert.ok(rect.top >= 0 && rect.bottom <= rect.height + 1)
  await safeWidth(page)
  await page.screenshot({ path: path.join(out, 'mobile-month-320.png') })
  await page.tap('[role=dialog] button[aria-label="关闭"]')
  await page.waitForSelector('[role=dialog]', { hidden: true })
  pass('320px month sheet fits short viewport and closes without committing')
  const invalid = structuredClone(full)
  invalid.sections.find(section => section.title === '工作经历').blocks[0].startDate = '2030.01'
  invalid.sections.find(section => section.title === '工作经历').blocks[0].endDate = '2025.06'
  await seed(page, invalid, ['sections.section-work.blocks'])
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[role=alert]')
  assert.match(await page.$eval('[role=alert]', el => el.textContent), /结束月份不能早于开始月份/)
  await month(page, '结束时间')
  assert.equal(await page.$eval('[role=dialog] button:disabled', el => el.textContent.trim()), '至今')
  await page.tap('[role=dialog] button[aria-label="关闭"]')
  savedContent = undefined
  await page.tap('button[aria-label="保存"]')
  await page.waitForFunction(() => document.body.textContent.includes('结束月份不能早于开始月份'))
  assert.equal(savedContent, undefined)
  pass('invalid imported dates remain visible and are prevented from saving; future start disables present')
  const long = structuredClone(getTemplateFixture('long')); long.id = full.id
  await seed(page, long)
  await page.setViewport({ width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await page.goto(`${baseUrl}/m/preview?tpl=qingning&source=web&mini=0`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('[data-mobile-page-feedback] [role=status]')?.textContent.startsWith('预计 '))
  const estimated = await page.$eval('[data-mobile-page-feedback] [role=status]', el => Number(el.textContent.match(/\d+/)[0]))
  assert.ok(estimated > 1)
  assert.equal(await page.$('script[src="/libs/pdfjs/pdf.min.js"]'), null)
  await page.tap('[data-mobile-page-feedback] input[type=checkbox]')
  await page.waitForSelector('[data-resume-page-boundary]')
  await tapText(page, '[data-mobile-page-feedback] button', '定位预计跨页处')
  await page.waitForFunction(() => document.querySelector('[data-mobile-page-feedback]')?.nextElementSibling.scrollTop > 50)
  await safeWidth(page)
  await page.screenshot({ path: path.join(out, 'mobile-pagination-414.png') })
  pass('414px preview estimates pages and locates scaled reference boundaries without loading PDF.js', { estimated })
  const pdfResponse = page.waitForResponse(res => res.url().endsWith('/next-api/generate-pdf') && res.request().method() === 'POST', { timeout: 90000 })
  await tapText(page, '[data-mobile-page-feedback] button', '查看 PDF 分页')
  assert.equal((await pdfResponse).status(), 200, 'Local PDF generation failed')
  await page.waitForFunction(() => window.__qaPdfBytes?.length > 0, { timeout: 90000 })
  await page.waitForFunction(() => document.querySelector('[role=dialog] [role=status]')?.textContent.startsWith('PDF 实际 '), { timeout: 90000 })
  const file = path.join(out, 'mobile-preview.pdf')
  await fs.writeFile(file, Buffer.from(await page.evaluate(() => window.__qaPdfBytes)))
  const python = process.env.PDF_QA_PYTHON || 'C:/Users/62765/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
  const counted = spawnSync(python, ['-c', 'import sys,pdfplumber; p=pdfplumber.open(sys.argv[1]); print(len(p.pages)); p.close()', file], { encoding: 'utf8' })
  assert.equal(counted.status, 0, counted.stderr)
  const actual = Number(counted.stdout.trim())
  assert.ok(actual > 1)
  assert.equal(await page.$eval('[role=dialog] [role=status]', el => el.textContent), `PDF 实际 ${actual} 页`)
  assert.equal(requests.at(-1).preview, true)
  assert.ok(!requests.at(-1).html.includes('data-resume-page-guides'))
  assert.ok(requests.at(-1).html.includes('transform: none'))
  await page.screenshot({ path: path.join(out, 'mobile-pdf-first-page.png') })
  await tapText(page, '[role=dialog] button', '下一页')
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="PDF 第 2 页"]')?.style.visibility === 'visible')
  assert.equal(await page.$$eval('[role=dialog] canvas', nodes => nodes.length), 1)
  await page.screenshot({ path: path.join(out, 'mobile-pdf-second-page.png') })
  await tapText(page, '[role=dialog] button', '放大')
  await page.waitForFunction(() => document.querySelector('[role=dialog] canvas')?.style.width === '200%' && document.querySelector('[role=dialog] canvas')?.style.visibility === 'visible')
  await page.screenshot({ path: path.join(out, 'mobile-pdf-zoom.png') })
  await tapText(page, '[role=dialog] button', '适屏')
  await page.waitForFunction(() => document.querySelector('[role=dialog] canvas')?.style.visibility === 'visible')
  pass('real PDF canvas preview matches independent PDF page count, supports touch paging, excludes reference lines and phone scaling', { actual, estimated })
  await page.tap('button[aria-label="关闭 PDF 分页预览"]')
  await page.waitForSelector('[role=dialog]', { hidden: true })
  await page.waitForFunction(count => document.querySelector('[data-mobile-page-feedback] [role=status]')?.textContent === `PDF 实际 ${count} 页`, {}, actual)
  await tapText(page, 'button', '样式')
  await page.waitForSelector('[role=dialog]')
  await tapText(page, '[role=tab]', '单页')
  await page.waitForSelector('[role=tabpanel] button[aria-label="单页模式"]')
  await page.tap('[role=tabpanel] button[aria-label="单页模式"]')
  await page.waitForSelector('[data-one-page-adjustments]')
  assert.match(await page.$eval('[data-one-page-adjustments]', el => el.textContent), /1.4.*12px/)
  await page.waitForFunction(() => document.querySelector('[data-mobile-page-feedback] [role=status]')?.dataset.pageCountSource === 'estimate')
  await page.screenshot({ path: path.join(out, 'mobile-one-page-settings.png') })
  pass('single-page settings explain readability limits; changed layout invalidates actual PDF count')
  assert.deepEqual(runtimeErrors, [])
  pass('no client runtime exceptions')
} catch (error) {
  if (activePage) { await activePage.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); console.log(await activePage.evaluate(() => document.body.innerText)); console.log('savedContent', savedContent?.baseInfo); console.log(await activePage.evaluate(() => [...document.querySelectorAll('input')].map(el => ({id: el.id, value: el.value, label: [...document.querySelectorAll('label')].find(l => l.htmlFor === el.id && el.id)?.textContent, wrap: el.closest('label')?.firstElementChild?.textContent})))); }
  results.push({ check: 'browser scenario', pass: false, error: String(error) })
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ baseUrl, results, runtimeErrors, previewRequests: requests.length, limitations: ['Chromium mobile emulation; native iOS/Android keyboard and WeChat webview not verified', 'All resume/auth/billing APIs mocked; only local preview PDF generation uses the real route'] }, null, 2))
  await browser.close()
}
