import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-email')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const passed = (check, evidence = {}) => results.push({ check, pass: true, ...evidence })
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function textClick(selector, text) {
  const handle = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === text), selector, text)
  await handle.click()
}
async function email(value) {
  await page.click('#email', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type('#email', value)
  await settle()
}
async function openBase() {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#email')
}
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-base-info-trigger]')
  const alignment = await page.evaluate(() => {
    const chip = [...document.querySelectorAll('[data-template-base-info-field]')].find(el => el.textContent.includes('到岗时间'))
    const icon = chip.children[0].getBoundingClientRect(), text = chip.children[1].getBoundingClientRect(), cell = chip.getBoundingClientRect()
    return { cell: cell.toJSON(), text: text.toJSON(), icon: icon.toJSON(), align: getComputedStyle(chip).alignItems }
  })
  assert.equal(alignment.align, 'center')
  assert.ok(alignment.cell.height > alignment.text.height + 10, 'fixture includes a two-line neighboring homepage')
  const center = rect => (rect.top + rect.bottom) / 2
  assert.ok(Math.abs(center(alignment.cell) - center(alignment.text)) < 1)
  assert.ok(Math.abs(center(alignment.cell) - center(alignment.icon)) < 1)
  const chip = await page.evaluateHandle(() => [...document.querySelectorAll('[data-template-base-info-field]')].find(el => el.textContent.includes('到岗时间')))
  await chip.hover()
  await page.screenshot({ path: path.join(out, 'arrival-alignment.png') })
  passed('arrival text and icon are centered in a row stretched by the two-line homepage', alignment)
  await page.emulateMediaType('print')
  assert.equal(await chip.evaluate(el => getComputedStyle(el).alignItems), 'center')
  await page.emulateMediaType('screen')
  passed('arrival alignment also applies to print')

  await openBase()
  await email('xiaoman')
  await page.waitForSelector('[role=listbox][aria-label="常用邮箱后缀"]')
  assert.equal(await page.$eval('#email', el => document.activeElement === el), true)
  assert.deepEqual(await page.$$eval('[role=option]', els => els.slice(0, 3).map(el => el.textContent)), ['xiaoman@qq.com', 'xiaoman@163.com', 'xiaoman@126.com'])
  await page.keyboard.press('Enter')
  assert.equal(await page.$eval('#email', el => el.value), 'xiaoman')
  assert.ok(await page.$('[role=listbox]'))
  await page.click('#email')
  assert.ok(await page.$('[role=listbox]'))
  passed('common domains appear while typing; focus/caret stay in input and Enter without a choice does not overwrite it')
  await page.screenshot({ path: path.join(out, 'email-suggestions.png') })

  const box = await (await page.$('[role=listbox]')).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const dialogTop = await page.$eval('#email', el => el.closest('[role=dialog]').scrollTop)
  await page.mouse.wheel({ deltaY: 320 })
  await page.waitForFunction(() => document.querySelector('[role=listbox]').scrollTop > 40)
  assert.equal(await page.$eval('#email', el => el.closest('[role=dialog]').scrollTop), dialogTop)
  passed('email suggestions accept native wheel scrolling without moving the dialog')

  await email('Xiao.Man+cv@o')
  assert.deepEqual(await page.$$eval('[role=option]', els => els.map(el => el.textContent)), ['Xiao.Man+cv@outlook.com'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => !document.querySelector('[role=listbox]'))
  assert.equal(await page.$eval('#email', el => el.value), 'Xiao.Man+cv@outlook.com')
  assert.equal(await page.$eval('#email', el => document.activeElement === el), true)
  await textClick('button', '确定')
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview]').textContent.includes('Xiao.Man+cv@outlook.com'))
  await openBase()
  assert.equal(await page.$eval('#email', el => el.value), 'Xiao.Man+cv@outlook.com')
  passed('prefix filtering and arrow/Enter selection preserve local part and survive save/reopen')

  await email('xiaoman@q')
  await textClick('[role=option]', 'xiaoman@qq.com')
  assert.equal(await page.$eval('#email', el => el.value), 'xiaoman@qq.com')
  assert.equal(await page.$('[role=listbox]'), null)
  passed('mouse selection inserts @qq.com and closes suggestions')

  await email('xiaoman@company.cn')
  assert.equal(await page.$('[role=listbox]'), null)
  await email('xiaoman')
  await page.keyboard.press('Escape')
  assert.equal(await page.$('[role=listbox]'), null)
  assert.ok(await page.$('#email'))
  assert.equal(await page.$eval('#email', el => el.value), 'xiaoman')
  await email('xiaoman@q')
  await page.keyboard.press('Tab')
  await page.waitForFunction(() => document.activeElement?.id === 'phone')
  assert.equal(await page.$('[role=listbox]'), null)
  assert.equal(await page.$eval('#email', el => el.value), 'xiaoman@q')
  await textClick('button', '取消')
  assert.ok((await page.$eval('[data-scenario-preview]', el => el.textContent)).includes('Xiao.Man+cv@outlook.com'))
  passed('custom company domains, Escape, Tab and cancel preserve user input and saved value')

  for (const width of [320, 375, 414, 768]) {
    await openBase()
    await page.setViewport({ width, height: 900 })
    await email('a-long-local-part.for.job-applications')
    await page.waitForSelector('[role=listbox]')
    const geometry = await page.evaluate(() => {
      const list = document.querySelector('[role=listbox]'), popup = list.closest('[data-radix-popper-content-wrapper]'), dialog = document.querySelector('#email').closest('[role=dialog]')
      const rect = popup.getBoundingClientRect()
      return { popup: rect.toJSON(), popupOverflow: list.scrollWidth > list.clientWidth + 1, dialogOverflow: dialog.scrollWidth > dialog.clientWidth + 1,
        reachable: Boolean(document.elementFromPoint(rect.left + rect.width / 2, rect.top + 20)?.closest('[data-radix-popper-content-wrapper]')) }
    })
    assert.ok(geometry.popup.left >= 0 && geometry.popup.right <= width + 1)
    assert.equal(geometry.popupOverflow, false)
    assert.equal(geometry.dialogOverflow, false)
    assert.equal(geometry.reachable, true)
    await page.screenshot({ path: path.join(out, `email-${width}.png`) })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    passed(`long email suggestions fit and remain reachable at ${width}px`, geometry)
  }
} catch (error) {
  results.push({ check: 'email and alignment verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results.map(({ check, pass }) => ({ check, pass })), null, 2))
}
