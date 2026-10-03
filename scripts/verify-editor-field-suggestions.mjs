import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/field-suggestions')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const passed = check => results.push({ check, pass: true })
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function type(selector, value) {
  await page.click(selector, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type(selector, value)
  await settle()
}
async function button(text) {
  const node = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text), text)
  await node.click()
}
async function openJob() {
  await page.click('[data-template-job-intention-key="city"]')
  await page.waitForSelector('#position')
}
async function openBase() {
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#name')
}
async function geometry(selector) {
  return page.$eval(selector, input => {
    const list = document.getElementById(input.getAttribute('aria-controls'))
    const panel = list.closest('[data-side]'), rect = panel.getBoundingClientRect()
    return { side: panel.dataset.side, rect: rect.toJSON(), inputY: input.getBoundingClientRect().y,
      overflow: panel.scrollWidth > panel.clientWidth + 1, focused: document.activeElement === input }
  })
}
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-job-intention-key="city"]')
  await openJob()
  await type('#position', '产品')
  assert.ok(await page.$('[role=option][aria-label="产品助理 产品"]'))
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval('#position', el => el.value), '产品')
  await page.screenshot({ path: path.join(out, 'job-position.png') })
  await page.click('[role=option][aria-label="产品助理 产品"]')
  assert.equal(await page.$eval('#position', el => document.activeElement === el), true)
  await button('确定')
  await openBase()
  assert.equal(await page.$eval('#title', el => el.value), '产品助理')
  await button('取消')
  passed('job suggestions require explicit selection and sync the saved title with the base-info entry')

  await openJob()
  await type('#position', 'PM')
  assert.deepEqual(await page.$$eval('[role=option]', els => els.slice(0, 2).map(el => el.getAttribute('aria-label'))), ['产品经理 产品', '项目经理 项目管理'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval('#position', el => el.value), '项目经理')
  await button('取消')
  await openJob()
  assert.equal(await page.$eval('#position', el => el.value), '产品助理')
  await type('#position', '医疗器械产品经理（实习）')
  await page.click('[role=option][aria-label="使用“医疗器械产品经理（实习）” 自定义填写"]')
  await button('确定')
  await openJob()
  assert.equal(await page.$eval('#position', el => el.value), '医疗器械产品经理（实习）')
  await button('取消')
  passed('ambiguous aliases remain separate; cancellation preserves the original and custom full titles survive save/reopen')

  await openBase()
  await type('#title', '界面设计')
  await page.click('[role=option][aria-label="UI 设计师 设计"]')
  await button('更多信息（选填）')
  await type('#politicalStatus', '民盟盟员')
  await page.keyboard.press('Tab')
  await button('确定')
  await openJob()
  assert.equal(await page.$eval('#position', el => el.value), 'UI 设计师')
  await button('取消')
  await openBase()
  await button('更多信息（选填）')
  assert.equal(await page.$eval('#politicalStatus', el => el.value), '民盟盟员')
  await type('#politicalStatus', '党员')
  await page.click('[role=option][aria-label="中共党员"]')
  await button('确定')
  passed('base-info job completion syncs back to job intention; specific/custom political status and presets remain writable')

  for (const [width, height] of [[1400, 900], [375, 700], [320, 440]]) {
    await page.setViewport({ width: 1400, height: 900 })
    await openJob()
    await page.setViewport({ width, height })
    await type('#position', '')
    const before = await geometry('#position')
    const modalScroll = await page.$eval('#position', el => el.closest('[role=dialog]').scrollTop)
    const box = await (await page.$('[role=listbox]')).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel({ deltaY: 320 })
    await page.waitForFunction(() => document.querySelector('[role=listbox]').scrollTop > 60)
    assert.equal(await page.$eval('#position', el => el.closest('[role=dialog]').scrollTop), modalScroll)
    for (const query of ['产品', '未匹配的自定义岗位名称', '']) {
      await type('#position', query)
      const after = await geometry('#position')
      assert.equal(after.side, before.side)
      assert.ok(Math.abs(after.inputY - before.inputY) < 1)
      assert.ok(after.rect.left >= 0 && after.rect.right <= width + 1)
      assert.ok(after.rect.top >= 11 && after.rect.bottom <= height - 11)
      assert.equal(after.overflow, false)
      assert.equal(after.focused, true)
    }
    await page.keyboard.press('Escape')
    assert.ok(await page.$('#position'))
    await button('取消')
    passed(`job suggestions accept native wheel without modal scrolling and keep placement stable at ${width}x${height}`)
  }

  await page.setViewport({ width: 1400, height: 1000 })
  for (const [kindField, field, query, label, saved] of [
    ['company', 'position', '产品', '产品助理 产品', '产品助理'],
    ['name', 'role', '前端', '前端负责人', '前端负责人'],
    ['organization', 'position', '部长', '部长', '部长'],
    ['school', 'degree', '硕', '硕士', '硕士'],
  ]) {
    const display = `[data-resume-block]:has([data-resume-field-name="${kindField}"]) [data-resume-field-name="${field}"][role=button]`
    await page.click(display)
    const input = `input[data-resume-field-name="${field}"]`
    await page.waitForSelector(input)
    await type(input, query)
    if (kindField === 'organization') {
      await type(input, '')
      assert.equal(await page.$('[role=option][aria-label="产品经理 产品"]'), null)
      await type(input, query)
    }
    await page.click(`[role=option][aria-label="${label}"]`)
    assert.equal(await page.$eval(input, el => el.value), saved)
    assert.equal(await page.$eval(input, el => document.activeElement === el), true)
    await page.keyboard.press('Enter')
    assert.equal(await page.$eval(display, el => el.textContent), saved)
    passed(`${kindField}/${field} uses context-specific suggestions and saves the selected name in the resume`)
  }
  await page.screenshot({ path: path.join(out, 'saved-fields.png') })
  await button('生成导出 HTML（QA）')
  const html = await page.$eval('[data-qa-export-html]', el => el.value)
  for (const text of ['岗位建议', '校园职务建议', '项目角色建议', '学历建议', '政治面貌建议', '自定义填写']) assert.equal(html.includes(text), false)
  for (const text of ['UI 设计师', '产品助理', '前端负责人', '部长', '硕士']) assert.equal(html.includes(text), true)
  passed('export contains selected values and excludes every new suggestion UI')
} catch (error) {
  results.push({ check: 'field suggestion verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}
