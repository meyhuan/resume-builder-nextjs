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
    id, name: '林悦 · 产品运营',
    baseInfo: { name: '林悦', fullName: '林悦', title: '产品运营', email: 'linyue@example.com', phone: '138****6280' },
    jobIntention: { position: '产品运营', city: '杭州' },
    sections: [
      { id: 'summary', title: '个人优势', columns: 1, blocks: [{ id: 'summary-text', type: 'text', html: '<p>3 年互联网产品运营经验，熟悉用户调研、活动策划与数据分析。能够从用户反馈中识别问题，协同产品与设计团队推动体验优化。</p>' }] },
      { id: 'work', title: '工作经历', columns: 1, blocks: [{ id: 'work-text', type: 'text', html: '<p><strong>杭州某科技公司 ｜ 产品运营</strong>　2022.07—2025.06</p><ul><li>负责用户成长体系的日常运营，梳理新用户注册、首次使用和持续活跃的关键路径。</li><li>通过访谈与行为数据整理使用障碍，协同设计团队优化新手引导，并持续跟踪上线反馈。</li><li>独立策划月度主题活动，完成需求沟通、内容制作、上线检查与复盘，建立可复用的执行清单。</li></ul>' }] },
      { id: 'projects', title: '项目经历', columns: 1, blocks: [{ id: 'project-1', type: 'project', name: '移动端体验改版（模拟案例）', role: '运营负责人', startDate: '2024-03', endDate: '2024-06', contentHtml: '<p>针对用户难以发现核心功能的问题，整理客服反馈与用户访谈记录，归纳高频场景。</p><ul><li>与产品经理共同制定改版目标，明确入口层级、引导文案与关键事件埋点。</li><li>组织原型体验和分批验证，记录问题并跟进修复；上线后结合数据与反馈复盘。</li></ul>' }] },
      { id: 'education', title: '教育经历', columns: 1, blocks: [{ id: 'edu-text', type: 'text', html: '<p><strong>浙江某大学 ｜ 新闻传播学 ｜ 本科</strong>　2018.09—2022.06</p><p>主修传播学、市场调研、统计学。参与校园媒体运营，负责选题策划与内容编辑。</p>' }] },
      { id: 'skills', title: '专业技能', columns: 1, blocks: [{ id: 'skill-text', type: 'text', html: '<p>数据分析：Excel、SQL 基础、用户漏斗分析与活动复盘。</p><p>协作工具：Figma、飞书文档；能够清晰表达需求、记录决策并跟进交付。</p><p>语言能力：英语 CET-6，能够阅读英文产品资料。</p>' }] },
    ],
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
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
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
    assert.ok(Math.abs(dimensions.ratio - 0.5) < 0.02)
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
  assert.equal(await page.$$eval('[data-layout-controls] [role="slider"]', els => els.filter(el => el.getClientRects().length > 0).length), 5)
  await clickText(page, '标准', '[data-layout-controls] button')
  assert.ok(await page.$('[data-layout-controls] button[aria-pressed="true"]'))
  await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = 0 })
  await page.screenshot({ path: path.join(artifacts, 'layout-standard.png') })
  const slider = await page.$('[data-layout-controls] [role="slider"]')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => [...document.querySelectorAll('[data-layout-controls] output')].some(el => el.textContent === '16px'))
  await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = 0 })
  await page.screenshot({ path: path.join(artifacts, 'layout-live.png') })
  const handle = await page.$('[aria-label="调整面板高度"]')
  const rect = await handle.boundingBox()
  await page.mouse.move(rect.x + 20, rect.y + 20)
  await page.mouse.down()
  await page.mouse.move(rect.x + 20, rect.y - 80, { steps: 8 })
  await page.mouse.up()
  const dragged = await handle.evaluate(el => Number(el.getAttribute('aria-valuenow')))
  assert.ok(dragged > 55 && dragged < 70, 'Dragging continuously adjusts the height')
  await page.click('[aria-label="收起调整面板"]')
  assert.equal(await handle.evaluate(el => el.getAttribute('aria-valuenow')), '30')
  await page.click('[aria-label="展开调整面板"]')
  assert.equal(await handle.evaluate(el => el.getAttribute('aria-valuenow')), '75')
  await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = el.scrollHeight })
  assert.ok(await page.$eval('[data-mobile-preview-stage]', el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 2))
  await page.$eval('[data-mobile-preview-stage]', el => { el.scrollTop = 0 })
  await page.screenshot({ path: path.join(artifacts, 'resized-layout.png') })
  await clickText(page, '完成')
  await closed(page)
  await page.waitForFunction(() => !document.querySelector('[aria-label="撤销本次调整"]')?.disabled)
  assert.equal(saved.template, 'simple')
  await page.click('[aria-label="撤销本次调整"]')
  await preview(page, 'qingning')
  await page.waitForFunction(() => !document.body.textContent.includes('正在保存样式'))
  assert.equal(saved.template, 'qingning')
  await clickText(page, '样式')
  await clickText(page, '模板', '[role="tab"]')
  await page.click('[data-template-id="simple"]')
  await clickText(page, '完成')
  await closed(page)
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent.startsWith('已切换为'))
  const noticeStarted = Date.now()
  await page.waitForFunction(() => ![...document.querySelectorAll('[role="status"]')].some(el => el.textContent.startsWith('已切换为')), { timeout: 5000 })
  assert.ok(Date.now() - noticeStarted >= 2500, 'Success notice remains visible for about three seconds')
  assert.equal(saved.template, 'simple', 'Hiding the notice preserves the selected template')
  assert.deepEqual(errors, [])
  console.log('PASS: 4 widths; no overlap; default 50%; continuous drag; expand/collapse; preview scrolls to bottom; live template/color; all layout controls visible; close/save/undo')
} finally {
  await browser.close()
}
