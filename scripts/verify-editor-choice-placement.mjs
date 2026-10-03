import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/choice-placement')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
let inputSelector = ''
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function more() {
  const button = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === '更多信息（选填）'))
  await button.click()
}
async function open(modal, id, width, height) {
  await page.setViewport({ width: 1400, height: 900 })
  await page.click(modal === 'base' ? '[data-template-base-info-trigger]' : '[data-template-job-intention-key="city"]')
  await page.waitForSelector(modal === 'base' ? '#name' : '#position')
  await page.setViewport({ width, height })
  if (modal === 'base' || id === 'industry') await more()
  inputSelector = id === 'industry' ? 'input[aria-label="搜索行业"]' : `#${id}`
  await page.click(`#${id}`)
  if (id !== 'industry') {
    if (await page.$eval(`#${id}`, el => el.getAttribute('aria-expanded') === 'true')) await page.keyboard.press('Escape')
    await page.click(`#${id} + button`)
  }
  await page.waitForSelector('[role=listbox]')
  await settle()
}
async function measure() {
  return page.evaluate(selector => {
    const input = document.querySelector(selector), list = document.getElementById(input.getAttribute('aria-controls')), panel = list.closest('[data-side]'), rect = panel.getBoundingClientRect(), field = input.getBoundingClientRect()
    const active = document.getElementById(input.getAttribute('aria-activedescendant'))
    const a = active?.getBoundingClientRect(), l = list.getBoundingClientRect()
    return { query: input.value, side: panel.dataset.side, panel: rect.toJSON(), inputY: field.y, inputHeight: field.height,
      focused: document.activeElement === input, horizontalOverflow: panel.scrollWidth > panel.clientWidth + 1,
      activeVisible: Boolean(a && a.top >= l.top - 1 && a.bottom <= l.bottom + 1) }
  }, inputSelector)
}
async function choiceCase(modal, id, width, height) {
  await open(modal, id, width, height)
  const initial = await measure(), states = []
  for (const query of [id === 'industry' ? '互' : '上', id === 'industry' ? '互联网' : '上海', 'zzzz', '一个很长的自定义城市名称用于验证列表换行', '']) {
    await page.click(inputSelector, { clickCount: 3 })
    await page.keyboard.press('Backspace')
    await page.type(inputSelector, query)
    await settle()
    const state = await measure()
    assert.equal(state.side, initial.side)
    assert.ok(Math.abs(state.inputY - initial.inputY) < 1, 'typing must not move the search input')
    if (id === 'industry') assert.ok(Math.abs(state.panel.height - initial.panel.height) < 1, 'result filtering must not resize the search panel')
    assert.ok(state.panel.top >= 11 && state.panel.bottom <= height - 11)
    assert.ok(state.panel.left >= 0 && state.panel.right <= width + 1)
    assert.equal(state.horizontalOverflow, false)
    assert.equal(state.focused, true)
    if (width === 1400 && height === 900 && query === (id === 'industry' ? '互联网' : '上海')) await page.screenshot({ path: path.join(out, `${id}-filtered.png`) })
    states.push(state)
  }
  await page.keyboard.press('ArrowUp')
  await settle()
  assert.equal((await measure()).activeVisible, true)
  if (width === 1400 && height === 900) await page.screenshot({ path: path.join(out, `${id}-stable.png`) })
  await page.keyboard.press('Escape')
  await page.waitForFunction(id => !document.querySelector('[role=listbox]') && document.activeElement?.id === id, {}, id)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('#name, #position'))
  results.push({ check: `${id} keeps side/input stable while filtering at ${width}x${height}`, pass: true, initial, states })
}
try {
  await page.setViewport({ width: 1400, height: 900 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-base-info-trigger]')
  for (const height of [900, 600]) {
    for (const [modal, id] of [['base', 'currentLocation'], ['base', 'household'], ['job', 'city'], ['job', 'industry']]) await choiceCase(modal, id, 1400, height)
  }
  for (const width of [320, 375, 414, 768]) {
    await choiceCase('base', 'currentLocation', width, 700)
    await choiceCase('job', 'city', width, 700)
  }
  await open('base', 'currentLocation', 1400, 900)
  await page.setViewport({ width: 375, height: 440 })
  await settle()
  const resized = await measure()
  assert.ok(resized.panel.top >= 11 && resized.panel.bottom <= 429)
  assert.ok(resized.panel.left >= 0 && resized.panel.right <= 376)
  assert.ok(resized.inputHeight >= 43)
  await page.click(inputSelector, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type(inputSelector, '成都')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => !document.querySelector('[role=listbox]'))
  assert.equal(await page.$eval('#currentLocation', el => el.value), '成都')
  await page.keyboard.press('Escape')
  results.push({ check: 'an open panel adapts its height after viewport resize and keyboard selection still works', pass: true, resized })

  await page.setViewport({ width: 1400, height: 900 })
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#email')
  await page.setViewport({ width: 375, height: 440 })
  await page.click('#email', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type('#email', 'xiaoman')
  await page.waitForSelector('[role=listbox][aria-label="常用邮箱后缀"]')
  const emailSide = await page.$eval('[role=listbox]', el => el.closest('[data-side]').dataset.side)
  await page.type('#email', '@q')
  await settle()
  assert.equal(await page.$eval('[role=listbox]', el => el.closest('[data-side]').dataset.side), emailSide)
  assert.equal(await page.$eval('#email', el => document.activeElement === el), true)
  results.push({ check: 'email suggestions also keep their initial side when domain filtering changes height', pass: true, side: emailSide })
} catch (error) {
  results.push({ check: 'stable choice placement verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results.map(({ check, pass }) => ({ check, pass })), null, 2))
}
