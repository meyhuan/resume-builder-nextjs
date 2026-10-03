import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-choice-pagination')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const passed = (check, evidence = {}) => results.push({ check, pass: true, ...evidence })
async function textClick(selector, text) {
  const handle = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(el => el.textContent.trim() === text), selector, text)
  await handle.click()
}
async function setValue(selector, value) {
  await page.click(selector, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type(selector, value)
}
async function choice(id, value) {
  await page.click(`#${id}`)
  await page.waitForSelector('input[role="combobox"]')
  await page.type('input[role="combobox"]', value)
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => !document.querySelector('input[role="combobox"]'))
}
async function salary(value) {
  await page.click('#salary')
  await page.waitForSelector('[role="option"]')
  await textClick('[role="option"]', value)
}
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-job-intention-key="city"]')
  await page.click('[data-template-job-intention-key="city"]')
  await page.waitForSelector('#city')
  await page.waitForFunction(() => document.activeElement?.id === 'city')
  assert.equal(await page.$('#job-more-fields'), null)
  assert.equal(await page.$$eval('#currentStatus input[type=radio]', els => els.filter(el => el.checked).length), 1)
  await page.click('label:has(input[aria-label="求职状态：离职，可快速到岗"])')
  await page.keyboard.press('ArrowDown')
  assert.equal(await page.$eval('#currentStatus input:checked', el => el.value), '在职，考虑好的机会')
  passed('status choices are visible without disclosure, preserve imported status, and use native radio arrow keys')
  assert.ok((await page.$eval('#job-more-summary', el => el.textContent)).includes('互联网'))
  await page.hover('#city')
  await page.waitForFunction(() => {
    const style = getComputedStyle(document.querySelector('#city'))
    const reference = document.createElement('span')
    reference.style.color = style.getPropertyValue('--color-foreground')
    document.body.appendChild(reference)
    const foreground = getComputedStyle(reference).color
    reference.remove()
    return style.color === foreground && style.backgroundColor !== 'rgb(139, 92, 246)'
  })
  passed('city hover uses a light field background and keeps the label readable')
  await choice('city', '杭州')
  await salary('10-20k')
  await page.click('label:has(input[aria-label="工作性质：实习"])')
  await page.click('label:has(input[aria-label="招聘类型：校招"])')
  await textClick('button', '更多信息（选填）')
  await choice('industry', '教育/培训')
  await page.click('label:has(input[aria-label="求职状态：应届，求职中"])')
  await page.screenshot({ path: path.join(out, 'choice-form-desktop.png') })
  await textClick('button', '确定')
  await page.waitForFunction(() => ['杭州', '10-20k', '工作性质：', '实习', '招聘类型：', '校招', '应届，求职中'].every(text => document.querySelector('[data-scenario-preview]')?.textContent.includes(text)))
  passed('city/industry/status/preset salary and separate employment/recruitment persist into the template')

  await page.click('[data-template-job-intention-key="city"]')
  await choice('city', '景德镇')
  await salary('自定义')
  await page.waitForSelector('#salary-custom')
  await setValue('#salary-custom', '200-300元/天')
  await textClick('button', '确定')
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview]')?.textContent.includes('200-300元/天'))
  await page.click('[data-template-job-intention-key="city"]')
  assert.ok((await page.$eval('#city', el => el.textContent)).includes('景德镇'))
  assert.equal(await page.$eval('#salary-custom', el => el.value), '200-300元/天')
  passed('custom city and daily salary survive save/reopen')
  for (const preset of ['面议', '10-20k', '暂不填写']) {
    await salary(preset)
    assert.equal(await page.$('#salary-custom'), null)
    await salary('自定义')
    await page.waitForSelector('#salary-custom')
    assert.equal(await page.$eval('#salary-custom', el => el.value), '200-300元/天')
    await page.waitForFunction(() => document.activeElement?.id === 'salary-custom')
  }
  passed('custom salary survives preset/negotiable/blank round trips with input focus restored')
  await salary('面议')
  assert.equal(await page.$('#salary-custom'), null)
  await textClick('button', '取消')
  assert.ok(await page.$('[data-template-job-intention-key="salary"]'))
  assert.ok((await page.$eval('[data-scenario-preview]', el => el.textContent)).includes('200-300元/天'))
  passed('negotiable salary uses one click; cancel leaves saved salary intact')

  await page.click('[data-template-job-intention-key="industry"]')
  await page.waitForFunction(() => document.activeElement?.id === 'industry')
  await page.click('#industry')
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'combobox')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('input[role="combobox"]'))
  assert.ok(await page.$('#industry'))
  await page.waitForFunction(() => document.activeElement?.id === 'industry')
  passed('Escape closes only the search menu and returns focus to the source field')

  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 900 })
    await page.click('#city')
    await page.waitForSelector('input[role="combobox"]')
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector('#position').closest('[role="dialog"]')
      const popup = document.querySelector('input[role="combobox"]').closest('[data-radix-popper-content-wrapper]')
      const d = dialog.getBoundingClientRect(), p = popup.getBoundingClientRect()
      return { dialog: d.toJSON(), popup: p.toJSON(), overflow: dialog.scrollWidth > dialog.clientWidth + 1, reachable: Boolean(document.elementFromPoint(p.x + p.width / 2, p.y + 20)?.closest('[data-radix-popper-content-wrapper]')) }
    })
    assert.equal(geometry.overflow, false)
    assert.ok(geometry.dialog.left >= 0 && geometry.dialog.right <= width)
    const statusGeometry = await page.$$eval('#currentStatus label', els => els.map(el => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      overflow: el.scrollWidth > el.clientWidth + 1,
    })))
    assert.ok(statusGeometry.every(item => item.height >= 44 && !item.overflow))
    assert.ok(geometry.popup.left >= 0 && geometry.popup.right <= width + 1)
    assert.equal(geometry.reachable, true)
    await page.screenshot({ path: path.join(out, `choice-form-${width}.png`) })
    await page.keyboard.press('Escape')
    passed(`form and searchable popup fit at ${width}px`, geometry)
  }
  await page.setViewport({ width: 1400, height: 1000 })
  await page.keyboard.press('Escape')
  await page.click('[data-template-base-info-trigger]')
  await page.waitForSelector('#phone')
  await textClick('button', '更多信息（选填）')
  await choice('currentLocation', '成都')
  await textClick('button', '确定')
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview]')?.textContent.includes('成都'))
  passed('base-info current city shares the searchable choice and persists')

  // Editing-time page feedback follows saved content rather than fixed canvas height.
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&fixture=sparse`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => document.querySelector('[data-resume-page-feedback] [role=status]')?.textContent.includes('预计 1 页'))
  assert.equal(await page.$('[data-resume-page-boundary]'), null)
  passed('sparse resume reports one page despite the A4 canvas minimum')

  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&fixture=long`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => Number(document.querySelector('[data-resume-page-feedback] [role=status]')?.textContent.match(/预计 (\d+) 页/)?.[1]) > 1)
  await page.waitForSelector('[data-resume-page-boundary="1"]')
  const initialPageCount = await page.$eval('[data-resume-page-feedback] [role=status]', el => Number(el.textContent.match(/预计 (\d+) 页/)[1]))
  const initialTheme = await page.$eval('[data-qa-theme]', el => JSON.parse(el.dataset.qaTheme))
  const heightBefore = await page.$eval('.resume-document-main', el => el.getBoundingClientRect().height)
  await page.click('[data-resume-page-feedback] input[type=checkbox]')
  assert.equal(await page.$('[data-resume-page-guides]'), null)
  assert.equal(await page.$eval('.resume-document-main', el => el.getBoundingClientRect().height), heightBefore)
  await textClick('button', '定位跨页内容')
  await page.waitForFunction(() => document.querySelector('[data-editor-canvas]').scrollTop > 100)
  await page.waitForSelector('[data-resume-page-guides]')
  await page.screenshot({ path: path.join(out, 'live-page-boundary.png') })
  passed('long resume shows page count and boundaries; locating overflow scrolls there; guides do not change layout', { initialPageCount })

  await textClick('button', '生成导出 HTML（QA）')
  const html = await page.$eval('[data-qa-export-html]', el => el.value)
  assert.ok(!html.includes('data-resume-page-guides'))
  assert.ok(!html.includes('跨页位置：'))
  passed('page guides and overflow annotations are absent from export HTML')

  await textClick('[role=tab]', '样式设置')
  await page.waitForSelector('button[aria-pressed]')
  const toggle = await page.evaluateHandle(() => [...document.querySelectorAll('button[aria-pressed]')].find(el => el.textContent.includes('一页模式')))
  await toggle.click()
  await page.waitForFunction(() => ['fit', 'overflow'].includes(document.querySelector('[data-one-page-status]')?.dataset.onePageStatus), { timeout: 15000 })
  const fit = await page.$eval('[data-one-page-status]', el => ({ status: el.dataset.onePageStatus, onePage: el.dataset.onePage, theme: JSON.parse(el.dataset.qaTheme) }))
  assert.equal(fit.status, 'overflow')
  assert.equal(fit.theme.lineHeight, 1.4)
  assert.equal(fit.theme.fontSize, 12)
  assert.equal(fit.theme.spacingScale, 0.4)
  assert.equal(fit.onePage, 'false')
  const explanation = await page.$eval('[data-one-page-adjustments]', el => el.textContent)
  assert.ok(explanation.includes('模块间距') && explanation.includes('行高') && explanation.includes('字号') && explanation.includes('可读性下限'))
  const bodyReadability = await page.$$eval('.qingning-rich p, .qingning-rich li', elements => elements.map(el => {
    const style = getComputedStyle(el)
    return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) / parseFloat(style.fontSize) }
  }))
  assert.ok(bodyReadability.every(style => style.fontSize >= 12 && style.lineHeight >= 1.399))
  await textClick('button', '定位超出一页的内容')
  await page.screenshot({ path: path.join(out, 'one-page-overflow.png') })
  passed('one-page adjustment explains exact changes and stops at Chinese readability limits without clipping overflow', { fit, bodyReadability: bodyReadability[0] })
  await toggle.click()
  await page.waitForFunction(() => document.querySelector('[data-one-page-status]')?.dataset.onePageStatus === 'idle')
  const restored = await page.$eval('[data-qa-theme]', el => JSON.parse(el.dataset.qaTheme))
  for (const key of ['spacingScale', 'lineHeight', 'fontSize']) assert.equal(restored[key], initialTheme[key])
  passed('disabling one-page restores all three original parameters')

  const rich = await page.$('.qingning-rich')
  await rich.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await rich.click()
  await page.waitForSelector('[contenteditable="true"]')
  await page.keyboard.down('Control')
  await page.keyboard.press('End')
  await page.keyboard.up('Control')
  await page.keyboard.sendCharacter('这是用于测试实时分页的中文正文，编辑时应即时看到跨页内容。'.repeat(100))
  await page.waitForFunction(before => Number(document.querySelector('[data-resume-page-feedback] [role=status]')?.textContent.match(/预计 (\d+) 页/)?.[1]) > before, { timeout: 10000 }, initialPageCount)
  await page.keyboard.press('Escape')
  passed('typing Chinese body text updates page count during editing')

} catch (error) {
  results.push({ check: 'browser verification', pass: false, error: error.stack })
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results.map(({ check, pass }) => ({ check, pass })), null, 2))
}
