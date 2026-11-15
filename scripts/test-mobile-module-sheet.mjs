import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

// Run against the development-only review page; intercept every API write.
const base = process.env.TEMPLATE_TEST_URL || 'http://127.0.0.1:3012'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const out = path.resolve('test-artifacts/mobile-module-sheet')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const errors = []
const measurements = []
page.on('pageerror', error => errors.push(error.message))
page.setDefaultTimeout(15000)
await page.setViewport({ width: 375, height: 844, isMobile: true, hasTouch: true })
await page.setRequestInterception(true)
page.on('request', request => {
  const url = new URL(request.url())
  if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/api/')) void request.respond({ status: 200, contentType: 'application/json', body: '{}' })
  else void request.continue()
})
async function click(text) {
  const node = await page.waitForFunction(text => [...document.querySelectorAll('button')].find(el => {
    const props = Object.keys(el).find(key => key.startsWith('__reactProps$'))
    return el.textContent.trim() === text && props && typeof el[props]?.onClick === 'function'
  }), {}, text)
  await node.asElement().evaluate(el => el.click())
}
async function snap(value) {
  await page.waitForFunction(value => {
    const panel = document.querySelector('[data-resizable-mobile-sheet]')
    return panel && Number(panel.querySelector('[role=slider]').getAttribute('aria-valuenow')) === value && Math.abs(panel.getBoundingClientRect().height / innerHeight * 100 - value) < 0.3
  }, {}, value)
  measurements.push(await page.$eval('[data-resizable-mobile-sheet]', el => ({
    height: Math.round(el.getBoundingClientRect().height * 10) / 10,
    viewport: innerHeight,
    snap: Number(el.querySelector('[role=slider]').getAttribute('aria-valuenow')),
    scrollTop: document.querySelector('.react-modal-sheet-content-scroller').scrollTop,
  })))
}
async function gesture(x, start, delta, hold = 0) {
  const cdp = await page.createCDPSession()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] })
  if (hold) await new Promise(resolve => setTimeout(resolve, hold))
  for (let i = 1; i <= 20; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start + delta * i / 20 }] })
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  await new Promise(resolve => setTimeout(resolve, 180))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
async function contentSwipe(delta) {
  const y = await page.$eval('.react-modal-sheet-content-scroller', (el, delta) => {
    const r = el.getBoundingClientRect()
    return delta < 0 ? r.bottom - 20 : r.top + 15
  }, delta)
  // Use the list's actual content area, not the header or narrow outer gutter.
  await gesture(240, y, delta)
}
try {
  await page.goto(`${base}/dev/module-sheet-review`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.addStyleTag({ content: 'nextjs-portal {display:none!important}' })
  await click('模块管理')
  await snap(50)
  await page.screenshot({ path: path.join(out, 'module-50.png') })
  for (const width of [320, 414, 375]) {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true })
    await snap(50)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  }
  await contentSwipe(-211)
  await snap(75)
  await contentSwipe(-160)
  await page.waitForFunction(() => document.querySelector('.react-modal-sheet-content-scroller').scrollTop > 30)
  await snap(75)
  // Start at the first sortable row and reorder two real modules by touch.
  await page.$eval('.react-modal-sheet-content-scroller', el => { el.scrollTop = 0 })
  await new Promise(resolve => setTimeout(resolve, 150))
  const before = await page.$$eval('[aria-label^="拖动排序"]', els => els.map(el => el.getAttribute('aria-label')))
  const box = await (await page.$('[aria-label^="拖动排序"]')).boundingBox()
  await gesture(box.x + box.width / 2, box.y + box.height / 2, 80, 180)
  await snap(75)
  const after = await page.$$eval('[aria-label^="拖动排序"]', els => els.map(el => el.getAttribute('aria-label')))
  assert.notDeepEqual(after, before, 'Touch reorder changes module order without resizing')
  await page.screenshot({ path: path.join(out, 'module-75-sorting.png') })
  await page.$eval('.react-modal-sheet-content-scroller', el => { el.scrollTop = el.scrollHeight })
  await page.tap('[aria-label="隐藏证件照"]')
  await page.waitForSelector('[aria-label="显示证件照"]')
  await page.screenshot({ path: path.join(out, 'module-bottom-settings.png') })
  await contentSwipe(-80)
  await snap(75)
  await page.$eval('.react-modal-sheet-content-scroller', el => { el.scrollTop = 0 })
  await new Promise(resolve => setTimeout(resolve, 150))
  await contentSwipe(211)
  await snap(50)
  await contentSwipe(169)
  await snap(30)
  await page.screenshot({ path: path.join(out, 'module-30.png') })
  await contentSwipe(-169)
  await snap(50)
  await contentSwipe(169)
  await snap(30)
  // Background page can reach its final content with the panel still open.
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(el => el.textContent.includes('分享到') || el.textContent.includes('分享使用体验'))
    link.scrollIntoView({ block: 'start' })
  })
  await snap(30)
  assert.ok(await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(el => el.textContent.includes('分享使用体验'))
    const rect = link.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= document.querySelector('[data-resizable-mobile-sheet]').getBoundingClientRect().top
  }), 'Last home content is visible above the open panel')
  await page.screenshot({ path: path.join(out, 'home-bottom.png') })
  await click('完成')
  await page.waitForFunction(() => !document.querySelector('[data-resizable-mobile-sheet]'))
  await click('模块管理')
  await snap(50)
  assert.ok(await page.$('[aria-label="显示证件照"]'), 'Visibility change survives closing')
  assert.deepEqual(await page.$$eval('[aria-label^="拖动排序"]', els => els.map(el => el.getAttribute('aria-label'))), after)
  await page.tap('[aria-label="展开调整面板"]')
  await snap(75)
  await page.tap('[aria-label="收起调整面板"]')
  await snap(30)
  assert.deepEqual(errors, [])
  await fs.writeFile(path.join(out, 'interaction-report.json'), JSON.stringify({ passed: true, measurements, errors }, null, 2))
  console.log('PASS: 30/50/75 content gestures, scrolling, touch reorder, visibility, close/reopen, expand/collapse')
} catch (error) {
  console.log(await page.evaluate(() => ({ errors: document.body.innerText.slice(-1500), panel: document.querySelector('[data-resizable-mobile-sheet]')?.getBoundingClientRect().toJSON(), snap: document.querySelector('[aria-label="调整面板高度"]')?.getAttribute('aria-valuenow') })))
  await page.screenshot({ path: path.join(out, 'failure.png') })
  throw error
} finally { await browser.close() }
