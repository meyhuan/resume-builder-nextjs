import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/choice-scroll')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function more() {
  const button = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === '更多信息（选填）'))
  await button.click()
}
async function snapshot() {
  return page.evaluate(() => ({
    list: document.querySelector('[role=listbox]').scrollTop,
    dialog: document.querySelector('#name, #position').closest('[role=dialog]').scrollTop,
    page: window.scrollY,
    lock: document.body.getAttribute('data-scroll-locked'),
  }))
}
async function open(modal, id, width = 1400) {
  // The scenario page shows the desktop editor; resize after opening to test the responsive dialog.
  await page.setViewport({ width: 1400, height: 900, hasTouch: true })
  if (modal === 'base') {
    await page.click('[data-template-base-info-trigger]')
    await page.waitForSelector('#name')
    await page.setViewport({ width, height: 900, hasTouch: true })
    await more()
  } else {
    await page.click('[data-template-job-intention-key="city"]')
    await page.waitForSelector('#position')
    await page.setViewport({ width, height: 900, hasTouch: true })
    if (id === 'industry') await more()
  }
  if (id === 'industry') await page.click(`#${id}`)
  else {
    if (await page.$eval(`#${id}`, el => el.getAttribute('aria-expanded') === 'true')) await page.keyboard.press('Escape')
    await page.click(`#${id} + button`)
  }
  await page.waitForSelector('[role=listbox]')
  await settle()
}
async function scrollCase(modal, id, width) {
  await open(modal, id, width)
  const box = await (await page.$('[role=listbox]')).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const before = await snapshot()
  await page.mouse.wheel({ deltaY: 320 })
  await page.waitForFunction(top => document.querySelector('[role=listbox]').scrollTop > top + 40, { timeout: 4000 }, before.list)
  const down = await snapshot()
  await page.mouse.wheel({ deltaY: -160 })
  await page.waitForFunction(top => document.querySelector('[role=listbox]').scrollTop < top - 20, { timeout: 4000 }, down.list)
  await page.mouse.wheel({ deltaY: 100000 })
  await page.waitForFunction(() => {
    const list = document.querySelector('[role=listbox]')
    return list.scrollTop >= list.scrollHeight - list.clientHeight - 2
  }, { timeout: 4000 })
  await page.mouse.wheel({ deltaY: 500 })
  await settle()
  const bottom = await snapshot()
  assert.equal(bottom.dialog, before.dialog)
  assert.equal(bottom.page, before.page)
  assert.equal(bottom.lock, before.lock)
  assert.ok(bottom.lock)
  if (width === 1400) await page.screenshot({ path: path.join(out, `${id}-scrolled.png`) })
  await page.keyboard.press('Escape')
  await page.waitForFunction(id => document.activeElement?.id === id && !document.querySelector('[role=listbox]'), {}, id)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('#name, #position'))
  results.push({ check: `${id} wheel down/up/boundary and Escape focus at ${width}px`, pass: true, before, down, bottom })
}
try {
  await page.setViewport({ width: 1400, height: 900, hasTouch: true })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-base-info-trigger]')
  for (const [modal, id] of [['base', 'currentLocation'], ['base', 'household'], ['job', 'city'], ['job', 'industry']]) {
    await scrollCase(modal, id, 1400)
  }
  for (const width of [320, 375, 414, 768]) {
    await scrollCase('base', 'currentLocation', width)
    await scrollCase('job', 'city', width)
  }

  await open('job', 'city')
  const box = await (await page.$('[role=listbox]')).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel({ deltaY: 500 })
  await page.waitForFunction(() => document.querySelector('[role=listbox]').scrollTop > 200)
  const option = await page.evaluateHandle(() => {
    const list = document.querySelector('[role=listbox]'), rect = list.getBoundingClientRect()
    return [...list.children].find(el => { const r = el.getBoundingClientRect(); return r.top > rect.top + 4 && r.bottom < rect.bottom - 4 })
  })
  const value = await option.evaluate(el => el.textContent.trim())
  await option.click()
  assert.equal(await page.$('[role=listbox]'), null)
  assert.equal(await page.$eval('#city', el => el.value), value)
  results.push({ check: 'clicking a city reached by wheel scrolling selects it', pass: true, value })
  await page.keyboard.press('Escape')

  await open('base', 'currentLocation', 375)
  const touchBox = await (await page.$('[role=listbox]')).boundingBox()
  const cdp = await page.createCDPSession()
  const x = touchBox.x + touchBox.width / 2, y = touchBox.y + touchBox.height - 20
  const beforeTouch = await snapshot()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 5; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 24 }] })
    await settle()
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForFunction(top => document.querySelector('[role=listbox]').scrollTop > top + 30, { timeout: 4000 }, beforeTouch.list)
  const afterTouch = await snapshot()
  assert.equal(afterTouch.dialog, beforeTouch.dialog)
  assert.equal(afterTouch.page, beforeTouch.page)
  results.push({ check: 'touch swipe scrolls the options without moving the dialog at 375px', pass: true, beforeTouch, afterTouch })
} catch (error) {
  results.push({ check: 'choice scroll verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results.map(({ check, pass }) => ({ check, pass })), null, 2))
}
