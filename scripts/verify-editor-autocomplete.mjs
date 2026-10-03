import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-autocomplete')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const passed = (check, details = {}) => results.push({ check, pass: true, ...details })
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function type(selector, value) {
  await page.click(selector, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type(selector, value)
  await settle()
}
async function textClick(selector, text) {
  const element = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === text), selector, text)
  await element.click()
}
const fieldSelector = name => `[data-resume-edit-field][data-resume-field-name="${name}"]`
async function inline(name, value) {
  await page.click(`${fieldSelector(name)}[role=button]`)
  await page.waitForSelector(`input${fieldSelector(name)}`)
  await type(`input${fieldSelector(name)}`, value)
}
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-job-intention-key="city"]')
  await page.click('[data-template-job-intention-key="city"]')
  const originalCity = await page.$eval('#city', el => el.value)
  for (const query of ['shanghai', 'SH', '上']) {
    await type('#city', query)
    assert.ok(await page.$('[role=option][aria-label="上海"]'))
    assert.equal(await page.$eval('#city', el => document.activeElement === el), true)
    await page.keyboard.press('Enter')
    assert.equal(await page.$eval('#city', el => el.value), query)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    assert.equal(await page.$eval('#city', el => el.value), '上海')
    assert.equal(await page.$('[role=listbox]'), null)
    passed(`city accepts ${query}, keeps the original input focused, and selects only on explicit confirmation`)
  }
  await type('#city', 'sz')
  assert.deepEqual(await page.$$eval('[role=option]', els => els.slice(0, 2).map(el => el.getAttribute('aria-label'))), ['深圳 广东', '苏州 江苏'])
  assert.ok(await page.$('[role=option][aria-label="随州 湖北"]'))
  await page.screenshot({ path: path.join(out, 'city-initials.png') })
  await page.click('[role=option][aria-label="苏州 江苏"]')
  assert.equal(await page.$eval('#city', el => el.value), '苏州')
  assert.equal(await page.$eval('#city', el => document.activeElement === el), true)
  passed('ambiguous city initials remain separate choices; mouse selection preserves focus')
  for (const [query, label, city] of [['kunshan', '昆山 江苏 · 苏州', '昆山'], ['义乌市', '义乌 浙江 · 金华', '义乌'], ['chongqing', '重庆', '重庆']]) {
    await type('#city', query)
    await page.click(`[role=option][aria-label="${label}"]`)
    assert.equal(await page.$eval('#city', el => el.value), city)
  }
  await type('#city', '海外远程')
  await page.click('[role=option][aria-label="使用“海外远程” 自定义填写"]')
  assert.equal(await page.$eval('#city', el => el.value), '海外远程')
  assert.equal(await page.$eval('#city', el => document.activeElement === el), true)
  passed('county-level cities and polyphonic pinyin are selectable; explicit custom entry preserves focus')
  await textClick('button', '取消')
  await page.click('[data-template-job-intention-key="city"]')
  assert.equal(await page.$eval('#city', el => el.value), originalCity)
  await type('#city', '海外 / 景德镇')
  await page.keyboard.press('Tab')
  assert.equal(await page.$('[role=listbox]'), null)
  await textClick('button', '确定')
  await page.click('[data-template-job-intention-key="city"]')
  assert.equal(await page.$eval('#city', el => el.value), '海外 / 景德镇')
  await type('#city', '')
  await page.keyboard.press('Tab')
  await textClick('button', '确定')
  assert.equal(await page.$('[data-template-job-intention-key="city"]'), null)
  passed('cancel preserves the saved city; custom/multiple-city text survives save and clearing removes the field')

  const originalSchool = await page.$eval(`${fieldSelector('school')}[role=button]`, el => el.textContent)
  await inline('school', '北大')
  assert.ok(await page.$('[role=option][aria-label="北京大学 北京市"]'))
  await page.screenshot({ path: path.join(out, 'school-suggestions.png') })
  await page.click('[role=option][aria-label="北京大学 北京市"]')
  assert.equal(await page.$eval(`input${fieldSelector('school')}`, el => el.value), '北京大学')
  assert.equal(await page.$eval(`input${fieldSelector('school')}`, el => document.activeElement === el), true)
  assert.equal(await page.$('[role=listbox]'), null)
  // Clicking another editable field must save the selected school, not the search abbreviation.
  await page.click(`${fieldSelector('major')}[role=button]`)
  assert.equal(await page.$eval(`${fieldSelector('school')}[role=button]`, el => el.textContent), '北京大学')
  await type(`input${fieldSelector('major')}`, '计算机')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval(`input${fieldSelector('major')}`, el => el.value), '计算机科学与技术')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval(`${fieldSelector('major')}[role=button]`, el => el.textContent), '计算机科学与技术')
  passed('school mouse selection and major keyboard selection commit full names when switching fields or confirming')

  await inline('school', '海外自定义大学')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval(`${fieldSelector('school')}[role=button]`, el => el.textContent), '海外自定义大学')
  await inline('school', '南大')
  assert.ok(await page.$('[role=option][aria-label="南京大学 南京市"]'))
  assert.ok(await page.$('[role=option][aria-label="南昌大学 南昌市"]'))
  await page.keyboard.press('Escape')
  assert.ok(await page.$(`input${fieldSelector('school')}`))
  await page.keyboard.press('Escape')
  assert.equal(await page.$eval(`${fieldSelector('school')}[role=button]`, el => el.textContent), '海外自定义大学')
  passed('custom school names remain writable; ambiguous school aliases show cities; Escape dismisses suggestions then cancels editing')

  await inline('major', '具身智能')
  await page.click('[role=option][aria-label="具身智能 本科 · 交叉学科"]')
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval(`${fieldSelector('major')}[role=button]`, el => el.textContent), '具身智能')
  passed('a major beyond the previous common list can be selected and saved from the full official catalogue')

  await inline('school', '')
  const list = await page.$('[role=listbox]'), rect = await list.boundingBox()
  assert.equal(await page.$$eval('[role=option]', els => els.length), 80)
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  const paperScroll = await page.$eval('[data-editor-canvas]', el => el.scrollTop)
  await page.mouse.wheel({ deltaY: 400 })
  await page.waitForFunction(() => document.querySelector('[role=listbox]').scrollTop > 100)
  assert.equal(await page.$eval('[data-editor-canvas]', el => el.scrollTop), paperScroll)
  await page.keyboard.press('ArrowUp')
  await settle()
  const lastVisible = await page.evaluate(() => {
    const input = document.querySelector('input[data-resume-field-name=school]'), option = document.getElementById(input.getAttribute('aria-activedescendant'))
    const a = option.getBoundingClientRect(), l = document.querySelector('[role=listbox]').getBoundingClientRect()
    return a.top >= l.top - 1 && a.bottom <= l.bottom + 1
  })
  assert.equal(lastVisible, true)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  passed('large school suggestions accept native wheel and keyboard scrolling without moving the resume')

  // The fixture uses a fixed desktop canvas plus a 360px sidebar. Narrow dialog
  // behavior is covered separately; inline editing is tested in usable PC viewports.
  for (const width of [1024, 1400]) {
    await page.setViewport({ width, height: 800 })
    await inline('major', '计算')
    const geometry = await page.$eval('[role=listbox]', el => {
      const p = el.closest('[data-side]'), rect = p.getBoundingClientRect()
      return { ...rect.toJSON(), overflow: p.scrollWidth > p.clientWidth + 1, reachable: Boolean(document.elementFromPoint(rect.left + rect.width / 2, rect.top + 12)?.closest('[data-side]')) }
    })
    assert.ok(geometry.left >= 11 && geometry.right <= width - 11, JSON.stringify(geometry))
    assert.equal(geometry.overflow, false)
    assert.equal(geometry.reachable, true)
    await page.screenshot({ path: path.join(out, `major-${width}.png`) })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    passed(`inline major suggestions fit at ${width}px`, geometry)
  }
  await page.setViewport({ width: 1400, height: 1000 })
  await inline('school', originalSchool)
  await page.keyboard.press('Enter')
  await textClick('button', '生成导出 HTML（QA）')
  const html = await page.$eval('[data-qa-export-html]', el => el.value)
  assert.equal(html.includes('学校建议'), false)
  assert.equal(html.includes('专业建议'), false)
  assert.equal(html.includes('未找到学校建议'), false)
  passed('suggestion UI is absent from export HTML')
} catch (error) {
  results.push({ check: 'autocomplete verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results.map(({ check, pass }) => ({ check, pass })), null, 2))
}
