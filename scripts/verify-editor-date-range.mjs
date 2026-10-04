import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/date-range-picker')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const popup = '[role="dialog"][aria-label="经历起止时间"]'
const passed = check => results.push({ check, pass: true })
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function clickText(name, scope = popup) {
  const handle = await page.evaluateHandle(({ name, scope }) => [...document.querySelector(scope).querySelectorAll('button')].find(el => el.textContent.trim() === name || el.getAttribute('aria-label') === name), { name, scope })
  await handle.click()
  await settle()
}
async function open(field = 'startDate', index = 0) {
  const handles = await page.$$(`[data-resume-date-field="${field}"]`)
  await handles[index].click()
  await page.waitForSelector(popup)
  await page.waitForFunction(selector => document.querySelector(selector)?.textContent.includes('12月'), {}, popup)
  await settle()
}
async function range(index = 0) {
  return page.evaluate(index => ['startDate', 'endDate'].map(field => document.querySelectorAll(`[data-resume-date-field="${field}"]`)[index].textContent.trim()), index)
}
async function year(value) {
  const name = await page.$eval(popup, el => [...el.querySelectorAll('button')].find(btn => btn.getAttribute('aria-label')?.startsWith('选择年份'))?.getAttribute('aria-label'))
  await clickText(name)
  await clickText(`${value}年`)
}
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForFunction(() => document.querySelector('[data-scenario-active-template]')?.textContent.includes('李小满'))
  await open()
  const geometry = await page.$eval(popup, el => ({ height: el.getBoundingClientRect().height, scrollable: el.scrollHeight > el.clientHeight + 1, button: [...el.querySelectorAll('button')].find(btn => btn.textContent === '9月').getBoundingClientRect().height }))
  assert.ok(geometry.height < 400)
  assert.equal(geometry.scrollable, false)
  assert.ok(geometry.button >= 35)
  assert.ok(await page.$eval(popup, el => el.textContent.includes('2020年 · 选择月份')))
  assert.equal(await page.$(`${popup} button[aria-label="上一组年份"]`), null)
  await page.screenshot({ path: path.join(out, 'start-panel.png') })
  passed('existing dates open directly at months; compact desktop panel fits without scrolling and month targets are at least 36px')

  await clickText('结束时间 2024.06')
  assert.ok(await page.$eval(popup, el => el.textContent.includes('2024年 · 选择月份')))
  await year(2020)
  assert.equal(await page.$eval(popup, el => [...el.querySelectorAll('button')].find(btn => btn.textContent === '8月').disabled), true)
  await clickText('10月')
  await page.waitForSelector(popup, { hidden: true })
  assert.deepEqual(await range(), ['2020.09', '2020.10'])
  passed('start/end tabs retain their year; an earlier end month is disabled and a valid end saves immediately')

  await open()
  await year(2021)
  await clickText('9月')
  assert.deepEqual(await range(), ['2020.09', '2020.10'])
  assert.ok(await page.$eval(popup, el => el.textContent.includes('开始时间暂未保存')))
  await page.keyboard.press('Escape')
  await page.waitForSelector(popup, { hidden: true })
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-resume-date-field') === 'startDate')
  assert.deepEqual(await range(), ['2020.09', '2020.10'])
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-resume-date-field')), 'startDate')
  passed('incompatible new starts remain a draft; Escape discards that draft and returns focus to the original date')

  await open()
  await year(2021)
  await clickText('9月')
  await clickText('10月')
  await page.waitForSelector(popup, { hidden: true })
  assert.deepEqual(await range(), ['2021.09', '2021.10'])
  passed('choosing a compatible end commits both dates together and closes the panel')

  await open('endDate')
  await clickText('至今')
  assert.deepEqual(await range(), ['2021.09', '至今'])
  await open('endDate')
  await clickText('清除结束时间')
  assert.deepEqual(await range(), ['2021.09', '结束时间'])
  await open()
  await clickText('10月')
  assert.equal(await page.$eval(`${popup} [role="tab"][aria-selected="true"]`, el => el.getAttribute('aria-label')), '结束时间 未填写')
  await clickText('至今')
  assert.deepEqual(await range(), ['2021.10', '至今'])
  passed('present, clear and automatic continuation for an incomplete range keep the counterpart date intact')

  await open('endDate')
  await page.keyboard.press('Home')
  assert.equal(await page.$eval(`${popup} [role="tab"][aria-selected="true"]`, el => el.getAttribute('aria-label')), '开始时间 2021.10')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.$eval(`${popup} [role="tab"][aria-selected="true"]`, el => el.getAttribute('aria-label')), '结束时间 至今')
  await page.keyboard.press('Escape')
  passed('keyboard Home and arrows navigate the two tabs, and Escape closes the panel')

  // This fixture has a fixed desktop sidebar; exercise compact PC windows.
  // Mobile's independent date sheet is outside the scope of this regression.
  for (const [width, height] of [[1024, 700], [900, 440]]) {
    await page.setViewport({ width, height })
    await open('endDate')
    await settle()
    await page.waitForFunction(({ popup, width, height }) => {
      const rect = document.querySelector(popup)?.getBoundingClientRect()
      return rect && rect.left >= 11 && rect.right <= width - 11 && rect.top >= 11 && rect.bottom <= height - 11
    }, { timeout: 3000 }, { popup, width, height })
    const bounds = await page.$eval(popup, el => ({ rect: el.getBoundingClientRect().toJSON(), overflowX: el.scrollWidth > el.clientWidth + 1 }))
    assert.ok(bounds.rect.left >= 11 && bounds.rect.right <= width - 11)
    assert.ok(bounds.rect.top >= 11 && bounds.rect.bottom <= height - 11)
    assert.equal(bounds.overflowX, false)
    await page.hover(popup)
    await page.mouse.wheel({ deltaY: 700 })
    await settle()
    const present = await page.$eval(popup, el => [...el.querySelectorAll('button')].find(btn => btn.textContent === '至今').getBoundingClientRect().toJSON())
    assert.ok(present.top >= bounds.rect.top && present.bottom <= bounds.rect.bottom)
    await page.screenshot({ path: path.join(out, `end-panel-${width}x${height}.png`) })
    await page.keyboard.press('Escape')
    passed(`range panel fits ${width}x${height}; its present action stays reachable without horizontal overflow`)
  }

  await page.setViewport({ width: 1400, height: 1000 })
  await page.click('[data-qa-export]')
  const html = await page.$eval('[data-qa-export-html]', el => el.value)
  assert.ok(html.includes('2021.10'))
  assert.ok(html.includes('至今'))
  assert.equal(html.includes('经历起止时间'), false)
  assert.equal(html.includes('选择月份'), false)
  passed('export includes the saved dates and present label, without calendar controls')
  console.log(JSON.stringify({ pass: true, results }, null, 2))
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') })
  console.error(error)
  process.exitCode = 1
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, pass: !process.exitCode }, null, 2))
  await browser.close()
}
