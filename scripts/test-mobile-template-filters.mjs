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
assert.equal(expectedPublicIds.length, 50, 'Release catalog must have exactly 50 public templates')
assert.equal(new Set(expectedPublicIds).size, 50, 'Public template IDs must be unique')
const artifacts = path.resolve('test-artifacts/mobile-template-filters')
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
const results = []
const errors = []
const saves = []
const contrast = {}
let failNextSave = false
let holdNextSave = false
let releaseSave
let failure
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
async function count(page, n) {
  if (n > 0) await page.waitForFunction(() => document.querySelectorAll('[data-template-id]').length > 0, { timeout: 60000 })
  await page.waitForFunction((expected) => document.querySelectorAll('[data-template-id]').length === expected, { timeout: 60000 }, n)
  if (n === 50) {
    const actualIds = await page.$$eval('[data-template-id]', (nodes) => nodes.map((node) => node.dataset.templateId).sort())
    assert.deepEqual(actualIds, expectedPublicIds, 'Mobile preview public IDs differ from metadata')
  }
}
async function preview(page, template) {
  await page.waitForSelector(`#m-preview-scope-${template} .resume-container`)
  await page.waitForFunction(() => document.querySelector('.resume-document-main')?.textContent.includes('移动端体验改版'))
}
async function openSettings(page) {
  await clickText(page, '样式')
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getBoundingClientRect().bottom <= innerHeight + 1)
}
async function english(page) {
  await page.select('[aria-label="模板分类"]', 'english')
  await count(page, 1)
}
async function closed(page) {
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
}
try {
  let page = await newPage()
  await page.goto(`${baseUrl}/m/preview?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await preview(page, 'qingning')
  await openSettings(page)
  await count(page, 50)
  const original = await page.$eval('.resume-document-main', (el) => el.textContent)
  const originalStyle = await page.$eval('.resume-container', (el) => el.getAttribute('style'))
  await english(page)
  await count(page, 1)
  assert.equal(await page.$eval('.resume-document-main', (el) => el.textContent), original)
  assert.equal(await page.$eval('.resume-container', (el) => el.getAttribute('style')), originalStyle)
  assert.equal(await page.$eval('[data-template-id]', (el) => el.dataset.templateId), 'moxu')
  for (const width of [320, 375, 390, 414, 768]) {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    assert.ok(await page.$eval('[role="dialog"]', (el) => el.scrollWidth <= el.clientWidth + 1))
    assert.ok(await page.$eval('[data-template-id]', (el) => el.getBoundingClientRect().bottom <= document.querySelector('[data-settings-scroll]').getBoundingClientRect().bottom), `First template completely visible at ${width}px`)
    await page.screenshot({ path: path.join(artifacts, `mobile-filter-${width}.png`) })
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await page.screenshot({ path: path.join(artifacts, 'mobile-preview-filter.png') })
  const applyButton = await page.evaluateHandle(() => [...document.querySelectorAll('[role="dialog"] button')].find((el) => el.textContent.includes('应用并保存')))
  const apply = applyButton.asElement()
  await apply.hover()
  await page.screenshot({ path: path.join(artifacts, 'state-hover.png') })
  await page.keyboard.press('Tab')
  await apply.focus()
  await page.screenshot({ path: path.join(artifacts, 'state-focus.png') })
  const rect = await apply.boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.screenshot({ path: path.join(artifacts, 'state-active.png') })
  await page.mouse.move(100, 140)
  await page.mouse.up()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), 'Focus is trapped in dialog')
  }
  Object.assign(contrast, await page.evaluate(() => {
    function luminance(color) {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const channels = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
        const c = v / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const button = [...document.querySelectorAll('[role="dialog"] button')].find((el) => el.textContent.includes('应用并保存'))
    const pairs = {
      primary: [getComputedStyle(button).color, getComputedStyle(button).backgroundColor],
      resultText: [getComputedStyle(document.querySelector('[data-template-browser] [role="status"]')).color, 'white'],
    }
    return Object.fromEntries(Object.entries(pairs).map(([key, colors]) => {
      const [a, b] = colors.map(luminance)
      return [key, Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2))]
    }))
  }))
  assert.ok(Object.values(contrast).every((ratio) => ratio >= 4.5), JSON.stringify(contrast))
  await page.click('[data-template-id="moxu"]')
  await preview(page, 'moxu')
  await clickText(page, '清除筛选', '[data-template-browser] button')
  await count(page, 50)
  await page.click('[data-template-id="qingning"]')
  await preview(page, 'qingning')
  assert.equal(await page.$eval('.resume-document-main', (el) => el.textContent), original)
  results.push('PASS: real mobile preview filters without changing content/theme; explicit switching away/back preserves content')

  await clickText(page, '筛选', '[data-template-browser] button')
  for (const label of ['英文', '双栏']) {
    const checkbox = await page.evaluateHandle((text) => [...document.querySelectorAll('[data-template-browser] label')].find((el) => el.textContent.trim() === text)?.querySelector('input'), label)
    await checkbox.asElement().click()
  }
  await count(page, 0)
  await page.screenshot({ path: path.join(artifacts, 'mobile-filters-expanded.png') })
  await clickText(page, '查看全部模板', '[data-template-browser] button')
  await count(page, 50)
  results.push('PASS: combined filters, empty-state recovery, complete first card at 320/375/390/414/768px widths')

  // Selection and theme changes remain a trial until explicitly saved.
  await english(page)
  await page.click('[data-template-id="moxu"]')
  await preview(page, 'moxu')
  await clickText(page, '外观', '[role="tab"]')
  await page.click('button[aria-label="选择颜色 #2563eb"]')
  const savesBeforeTrial = saves.length
  await new Promise((resolve) => setTimeout(resolve, 2000))
  assert.equal(saves.length, savesBeforeTrial, 'No thumbnail/content writes during trial')
  await clickText(page, '取消', '[role="dialog"] button:not([aria-label])')
  await closed(page)
  await preview(page, 'qingning')
  assert.equal(await page.$eval('.resume-container', (el) => el.getAttribute('style')), originalStyle)
  assert.ok(await page.evaluate(() => document.activeElement?.textContent.includes('样式')), 'Focus returns to opener')
  await openSettings(page)
  await clickText(page, '模板', '[role="tab"]')
  await english(page)
  await page.click('[data-template-id="moxu"]')
  await clickText(page, '外观', '[role="tab"]')
  assert.notEqual(await page.$eval('input[type="color"]', (el) => el.value), '#2563eb', 'Trial theme for other template rolled back')
  await page.click('button[aria-label="取消并关闭"]')
  await closed(page)
  await preview(page, 'qingning')

  // One-page changes also roll back; Escape and the backdrop are cancellation.
  await openSettings(page)
  await clickText(page, '单页', '[role="tab"]')
  await page.click('button[aria-label="单页模式"]')
  await page.waitForFunction(() => document.querySelector('button[aria-label="单页模式"]')?.getAttribute('aria-pressed') === 'true')
  await page.keyboard.press('Escape')
  await closed(page)
  assert.equal(await page.$eval('.resume-container', (el) => el.getAttribute('style')), originalStyle)
  await openSettings(page)
  assert.equal(await page.$eval('button[aria-label="单页模式"]', (el) => el.getAttribute('aria-pressed')), 'false')
  await page.mouse.click(10, 20)
  await closed(page)
  results.push('PASS: cancel, close, Escape and backdrop restore template/theme/one-page; trials never write; focus restored')

  await openSettings(page)
  await clickText(page, '模板', '[role="tab"]')
  await english(page)
  await page.click('[data-template-id="moxu"]')
  await clickText(page, '外观', '[role="tab"]')
  await page.click('button[aria-label="选择颜色 #2563eb"]')
  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true })
    assert.ok(await page.$eval('[role="dialog"]', (el) => el.scrollWidth <= el.clientWidth + 1))
    await page.screenshot({ path: path.join(artifacts, `mobile-appearance-${width}.png`) })
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await clickText(page, '模板', '[role="tab"]')
  await english(page)
  failNextSave = true
  await clickText(page, '应用并保存', '[role="dialog"] button')
  await page.waitForSelector('[role="dialog"] [role="alert"]')
  assert.equal(saved.template, 'qingning')
  await page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'))
  await page.screenshot({ path: path.join(artifacts, 'mobile-save-error.png') })
  holdNextSave = true
  const beforeSave = saves.filter((item) => !item.thumbnail).length
  await clickText(page, '应用并保存', '[role="dialog"] button')
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'true')
  assert.ok(await page.$eval('button[aria-label="取消并关闭"]', (el) => el.disabled))
  assert.ok(await page.$('[role="dialog"] [inert]'))
  await page.keyboard.press('Escape')
  assert.ok(await page.$('[role="dialog"]'))
  await page.screenshot({ path: path.join(artifacts, 'mobile-saving.png') })
  assert.equal(typeof releaseSave, 'function')
  await releaseSave()
  await closed(page)
  assert.equal(saves.filter((item) => !item.thumbnail).length, beforeSave + 1)
  await page.waitForFunction(() => document.body.textContent.includes('样式已保存'))
  await page.screenshot({ path: path.join(artifacts, 'state-success.png') })
  assert.ok(saves.some((item) => item.template === 'moxu' && item.content?.__editorMeta))
  assert.deepEqual(saved.content.sections[0].blocks[0].name, '移动端体验改版（模拟案例）')
  await new Promise((resolve) => setTimeout(resolve, 2500))
  assert.ok(saved.content.__editorMeta?.themes.moxu, 'Background thumbnail preserves committed editor metadata')
  assert.equal(saved.content.__editorMeta.themes.moxu.primaryColor, '#2563eb')
  assert.ok(saves.filter((item) => item.thumbnail).every((item) => item.content?.__editorMeta), 'All thumbnail requests include metadata')
  results.push('PASS: failed save stays open with inline retry; saving blocks edits/close; retry commits once; thumbnail preserves metadata')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await preview(page, 'moxu')
  await openSettings(page)
  await clickText(page, '外观', '[role="tab"]')
  assert.equal(await page.$eval('input[type="color"]', (el) => el.value), '#2563eb', 'Same-browser reload restores saved color')
  await page.click('button[aria-label="取消并关闭"]')
  await closed(page)
  // A fresh context rules out persisted browser drafts masking the API result.
  await page.close()
  // Use a new isolated browser context, with the same in-memory mock server.
  const context = await browser.createBrowserContext()
  page = await newPage(context)
  await page.goto(`${baseUrl}/m/preview?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await preview(page, 'moxu')
  await openSettings(page)
  await clickText(page, '外观', '[role="tab"]')
  assert.equal(await page.$eval('input[type="color"]', (el) => el.value), '#2563eb', 'Fresh-context reload restores saved color')
  await clickText(page, '模板', '[role="tab"]')
  await page.click('button[aria-label="取消并关闭"]')
  await closed(page)
  results.push('PASS: completion sends selected template/editor metadata; fresh-context reload restores it (mock API only)')

  for (const template of ['ziji', 'jingrui']) {
    await openSettings(page)
    await page.click(`[data-template-id="${template}"]`)
    await preview(page, template)
    await clickText(page, '应用并保存', '[role="dialog"] button')
    await closed(page)
    assert.deepEqual(await page.$$eval('.portfolio-item__caption', (items) => items.map((el) => el.textContent)), ['案例 B', '案例 A'])
    await page.waitForFunction(() => [...document.querySelectorAll('.portfolio-item__image')].every((img) => img.complete && img.naturalWidth > 0))
    await page.screenshot({ path: path.join(artifacts, `mobile-${template}-preview.png`) })
    await page.$eval('.portfolio-appendix', (el) => el.scrollIntoView({ block: 'start' }))
    await page.screenshot({ path: path.join(artifacts, `mobile-${template}-portfolio.png`) })
    results.push(`PASS: ${template} renders project text and preserves saved portfolio order with loaded images`)
  }
  for (const template of ['yunbai', 'qihang', 'zhanxu', 'zixunhui', 'fawujian']) {
    await openSettings(page)
    await page.click(`[data-template-id="${template}"]`)
    await preview(page, template)
    await clickText(page, '应用并保存', '[role="dialog"] button')
    await closed(page)
    assert.equal(saved.template, template)
    assert.ok(await page.$eval('.resume-document-main', (el) => el.textContent.includes('移动端体验改版')))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${template} overflows mobile viewport`)
    await page.screenshot({ path: path.join(artifacts, `mobile-${template}-preview.png`) })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await preview(page, template)
    results.push(`PASS: ${template} mobile preview switches, saves, and reloads without overflow`)
  }
  assert.deepEqual(errors, [])
} catch (error) {
  failure = error.stack || String(error)
  throw error
} finally {
  fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ baseUrl, results, contrast, errors, failure, limitations: ['Mock API, no authentication/database/upload/export verification'] }, null, 2))
  await browser.close()
}
console.log(results.join('\n'))
