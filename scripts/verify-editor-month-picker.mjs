import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/month-picker')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const popup = '[role=dialog][aria-label="开始工作时间"]'
const passed = check => results.push({ check, pass: true })
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function button(text, scope = '') {
  const node = await page.evaluateHandle(({ text, scope }) => [...(scope ? document.querySelector(scope) : document).querySelectorAll('button')].find(el => el.textContent.trim() === text || el.getAttribute('aria-label') === text), { text, scope })
  await node.click()
}
async function openBase() {
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#name')
  await button('更多信息（选填）')
}
async function openMonth() {
  await page.click('#workStartTime')
  await page.waitForSelector(popup)
  await settle()
}
async function value() { return page.$eval('#workStartTime', el => el.textContent.trim()) }
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForFunction(() => document.querySelector('[data-scenario-active-template]')?.textContent.includes('李小满'))
  await openBase()
  assert.equal(await value(), '2025.07')
  await page.focus('#workStartTime')
  await page.keyboard.press('Space')
  await page.waitForSelector(popup)
  await button('2024年', popup)
  assert.equal(await value(), '2025.07')
  await button('3月', popup)
  assert.equal(await value(), '2024.03')
  await button('取消')
  await openBase()
  assert.equal(await value(), '2025.07')
  passed('Space opens the calendar; year selection is provisional and cancelling the form retains the original month')

  await openMonth()
  await button('上一组年份', popup)
  await button('2010年', popup)
  await button('9月', popup)
  await button('确定')
  assert.ok(await page.$eval('[data-template-base-info-key="workStartTime"]', el => el.textContent.includes('2010.09')))
  await openBase()
  assert.equal(await value(), '2010.09')
  passed('distant year selection survives saving and reopening, with dotted resume formatting in the header')

  await openMonth()
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.activeElement?.id === 'workStartTime')
  assert.ok(await page.$('#name'))
  assert.equal(await value(), '2010.09')
  await openMonth()
  await button('清除', popup)
  await button('确定')
  assert.equal(await page.$('[data-template-base-info-key="workStartTime"]'), null)
  await openBase()
  assert.equal(await value(), '请选择年月')
  passed('Escape returns focus without closing the form; clearing removes the saved header field')

  await openMonth()
  await button('本月', popup)
  const current = await page.evaluate(() => { const date = new Date(); return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}` })
  assert.equal(await value(), current)
  await button('确定')
  await openBase()
  assert.equal(await value(), current)
  passed('current-month shortcut saves and reopens as the actual client month')

  for (const [width, height] of [[1400, 900], [375, 700], [320, 440]]) {
    await page.setViewport({ width, height })
    await openMonth()
    const geometry = await page.$eval(popup, el => ({ rect: el.getBoundingClientRect().toJSON(), overflowX: el.scrollWidth > el.clientWidth + 1, scrollable: el.scrollHeight > el.clientHeight + 1 }))
    assert.ok(geometry.rect.left >= 11 && geometry.rect.right <= width - 11)
    assert.ok(geometry.rect.top >= 11 && geometry.rect.bottom <= height - 11)
    assert.equal(geometry.overflowX, false)
    if (geometry.scrollable) {
      const before = await page.$eval('#name', el => el.closest('[role=dialog]').scrollTop)
      await page.mouse.move(geometry.rect.x + geometry.rect.width / 2, geometry.rect.y + geometry.rect.height / 2)
      await page.mouse.wheel({ deltaY: 500 })
      await page.waitForFunction(selector => document.querySelector(selector).scrollTop > 10, {}, popup)
      assert.equal(await page.$eval('#name', el => el.closest('[role=dialog]').scrollTop), before)
    }
    await page.screenshot({ path: path.join(out, `calendar-${width}x${height}.png`) })
    await button('清除', popup)
    assert.equal(await value(), '请选择年月')
    passed(`calendar stays within ${width}x${height}, scrolls independently when needed and its clear action remains reachable`)
  }
  await page.setViewport({ width: 1400, height: 1000 })
  await button('取消')
  await page.click('[data-qa-export]')
  const html = await page.$eval('[data-qa-export-html]', el => el.value)
  assert.ok(html.includes(current))
  assert.equal(html.includes('点击选择年月'), false)
  assert.equal(html.includes('上一组年份'), false)
  passed('the saved month is exported as content; the calendar interface is excluded')
  console.log(JSON.stringify({ pass: true, results }, null, 2))
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') })
  console.error(error)
  process.exitCode = 1
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, pass: !process.exitCode }, null, 2))
  await browser.close()
}
