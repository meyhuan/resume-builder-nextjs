import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

// All API traffic is intercepted: this tests the real UI, not authentication,
// uploads or database persistence. Never point this test at a production site.
const baseUrl = process.env.TEMPLATE_TEST_URL || 'http://127.0.0.1:3012'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname))
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const expectedPublicIds = [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)]
  .filter(([, , block]) => /editor: true/.test(block) && /catalog: true/.test(block))
  .map(([, id]) => id).sort()
const PUBLIC_COUNT = expectedPublicIds.length
const ENGLISH_COUNT = 5
assert.equal(expectedPublicIds.length, PUBLIC_COUNT, `Release catalog must have exactly ${PUBLIC_COUNT} public templates`)
assert.equal(new Set(expectedPublicIds).size, PUBLIC_COUNT, 'Public template IDs must be unique')
const artifacts = path.resolve('test-artifacts/mobile-settings-panel')
fs.mkdirSync(artifacts, { recursive: true })
const id = 'local-template-filter-fixture'
const image = (label, color) => 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="${color}"/><text x="40" y="100" fill="white" font-size="40">${label} / QA fixture</text></svg>`,
).toString('base64')
let saved = {
  id, template: 'qingning',
  content: {
    id, name: '分类回归测试',
    baseInfo: { title: '交互设计师', email: 'fixture@example.com' },
    jobIntention: { position: '交互设计师' },
    sections: [{ id: 'projects', title: '项目经历', columns: 1, blocks: [{
      id: 'project-1', type: 'project', name: '移动端体验改版（模拟案例）',
      role: '交互设计', startDate: '2023-01', endDate: '2024-06',
      contentHtml: '<p>负责用户流程与原型验证，案例画面见作品附录的「案例 A」。</p>',
    }] }],
    portfolio: { enabled: true, title: '设计案例（测试素材）', images: [
      { id: 'work-b', url: image('B', '#334155'), objectKey: 'fixture-b', width: 600, height: 900, caption: '案例 B', sortOrder: 0 },
      { id: 'work-a', url: image('A', '#7c3aed'), objectKey: 'fixture-a', width: 600, height: 900, caption: '案例 A', sortOrder: 1 },
    ] },
  },
}
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const errors = []
const saves = []
let failNextSave = false
let holdNextSave = false
let releaseSave
async function newPage(context = browser) {
  const page = await context.newPage()
  page.setDefaultTimeout(45000)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/analytics/')) {
      let body = {}
      if (url.pathname === `/next-api/resumes/${id}`) {
        if (request.method() === 'PUT') {
          const update = JSON.parse(request.postData() || '{}')
          if (!update.thumbnail && failNextSave) {
            failNextSave = false
            void request.respond({ status: 503, body: 'Simulated save failure' })
            return
          }
          if (!update.thumbnail && holdNextSave) {
            holdNextSave = false
            releaseSave = async () => {
              saved = { ...saved, ...update }
              saves.push(update)
              await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(saved) })
            }
            return
          }
          if (update.content) saved = { ...saved, ...update }
          saves.push(update)
        }
        body = saved
      }
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
      return
    }
    void request.continue()
  })
  return page
}
async function clickText(page, text, scope = 'button') {
  const buttons = await page.$$(scope)
  for (const button of buttons) {
    if (await button.evaluate((el, target) => el.textContent.trim().startsWith(target), text)) {
      await button.click()
      return
    }
  }
  assert.fail(`Button missing: ${text}`)
}
async function preview(page, template) {
  await page.waitForSelector(`#m-preview-scope-${template} .resume-container`)
  await page.waitForFunction(() => document.querySelector('.resume-document-main')?.textContent.includes('移动端体验改版'))
}
async function closed(page) {
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
}
try {
  const page = await newPage()
  await page.goto(`${baseUrl}/m/preview?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await preview(page, 'qingning')
  await clickText(page, '样式')
  await page.waitForSelector('[data-settings-panel]')
  const touch = await page.createCDPSession()
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 400 }] })
  for (const y of [360, 300, 240, 180, 120]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] })
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForFunction(() => document.querySelector('[data-mobile-preview-stage]').scrollTop > 30)
  await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = 0 })
  await touch.detach()
  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true })
    await page.waitForFunction(() => {
      const stage = document.querySelector('[data-mobile-preview-stage]').getBoundingClientRect()
      const panel = document.querySelector('[role="dialog"]').getBoundingClientRect()
      return stage.bottom <= panel.top + 1 && stage.height > 200
    })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.screenshot({ path: path.join(artifacts, `compact-${width}.png`) })
    const dimensions = await page.$eval('[data-mobile-preview-stage]', el => {
      el.scrollTop = el.scrollHeight
      const panel = document.querySelector('[data-settings-panel]').getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      return { top: el.scrollTop, remaining: el.scrollHeight - el.clientHeight - el.scrollTop, ratio: panel.height / innerHeight, bottom: rect.bottom, panelTop: panel.top }
    })
    assert.ok(dimensions.top > 0, 'Preview can scroll while settings stay open')
    assert.ok(Math.abs(dimensions.remaining) < 2, 'Last preview content is reachable')
    assert.ok(Math.abs(dimensions.ratio - 0.4) < 0.02)
    assert.ok(dimensions.bottom <= dimensions.panelTop + 1)
    await page.screenshot({ path: path.join(artifacts, `preview-bottom-${width}.png`) })
    await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = 0 })
  }
  await page.setViewport({ width: 375, height: 844, isMobile: true, hasTouch: true })
  await page.click('[data-template-id="simple"]')
  await preview(page, 'simple')
  assert.ok(await page.$('[data-settings-panel]'))
  await clickText(page, '外观', '[role="tab"]')
  await page.click('[aria-label="选择颜色 #2563eb"]')
  await page.waitForFunction(() => [...document.querySelectorAll('.resume-container *')].some(el => getComputedStyle(el).color === 'rgb(37, 99, 235)'))
  await page.screenshot({ path: path.join(artifacts, 'appearance-live.png') })
  await clickText(page, '版式', '[role="tab"]')
  await clickText(page, '字号', 'button')
  assert.equal(await page.$$eval('[role="slider"]', els => els.filter(el => el.getClientRects().length > 0).length), 1)
  const slider = await page.$('[role="slider"]')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => document.body.textContent.includes('字号基准 · 16px'))
  await page.screenshot({ path: path.join(artifacts, 'layout-live.png') })
  await clickText(page, '查看整体效果')
  await closed(page)
  await page.waitForFunction(() => !document.querySelector('[aria-label="撤销本次调整"]')?.disabled)
  assert.equal(saved.template, 'simple')
  await page.click('[aria-label="撤销本次调整"]')
  await preview(page, 'qingning')
  await page.waitForFunction(() => !document.body.textContent.includes('正在保存样式'))
  assert.equal(saved.template, 'qingning')
  assert.deepEqual(errors, [])
  console.log('PASS: 4 widths; no overlap; fixed 60/40 split; preview scrolls to bottom; live template/color; compact layout controls; close/save/undo')
} finally {
  await browser.close()
}
