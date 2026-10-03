// Keep the existing QA entry point; row tools now live next to their owner.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/action-dock')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const pause = () => new Promise(resolve => setTimeout(resolve, 250))
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => [...document.querySelectorAll('.qingning-rich')].some(el => el.textContent.includes('项目概述')))
  await page.evaluate(async () => { await document.fonts.ready })
  const field = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('项目概述')))
  const block = await field.evaluateHandle(el => el.closest('[data-resume-edit-region="block"]'))
  await field.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await page.mouse.move(8, 8)
  await pause()
  const geometry = () => block.evaluate(el => [el.closest('[data-resume-edit-region="section"]'), el, el.querySelector('.qingning-rich')]
    .map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height } }))
  const idleGeometry = await geometry()
  await field.hover()
  assert.deepEqual(await geometry(), idleGeometry)
  assert.ok(await block.$('[data-resume-block-actions]'))
  assert.equal(await page.$('[data-resume-action-dock]'), null)
  const date = await block.$('[data-resume-edit-field]')
  await date.click()
  await page.keyboard.press('Escape')
  await pause()
  assert.equal(await block.evaluate(el => el.getAttribute('data-resume-edit-selected')), 'true')
  assert.deepEqual(await geometry(), idleGeometry)
  results.push({ check: 'field click selects its row; local actions appear without resume layout shift', pass: true })

  const second = await page.evaluateHandle(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')].find(el => el.textContent.includes('负责岗位画像')))
  await second.hover()
  await pause()
  assert.equal(await block.evaluate(el => el.getAttribute('data-resume-edit-selected')), 'true')
  assert.equal(await second.evaluate(el => el.getAttribute('data-resume-edit-selected')), null)
  assert.ok(await second.$('[data-resume-block-actions]'))
  await field.hover()
  await (await block.$('button[title="AI润色"]')).hover()
  await pause()
  assert.equal(await block.evaluate(el => el.getAttribute('data-resume-edit-selected')), 'true')
  results.push({ check: 'hovering other rows keeps explicit selection; each local toolbar belongs to its own row', pass: true })
  await page.screenshot({ path: path.join(out, 'final-context-actions.png') })

  await (await block.$('button[title="下移"]')).click()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')]
    .filter(el => el.closest('section')?.textContent.includes('项目经历'))[1]?.textContent.includes('校园社交应用MVP'))
  assert.equal(await block.evaluate(el => el.getAttribute('data-resume-edit-selected')), 'true')
  await block.hover()
  await (await block.$('button[title="上移"]')).click()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')]
    .filter(el => el.closest('section')?.textContent.includes('项目经历'))[0]?.textContent.includes('校园社交应用MVP'))
  results.push({ check: 'local move callbacks reorder the actual row and preserve selection', pass: true })

  for (const [width, zoom] of [[1024, 1], [1024, 0.8], [1400, 1]]) {
    await page.setViewport({ width, height: 1000 })
    await page.$eval('[data-scenario-preview]', (el, zoom) => { el.style.zoom = zoom }, zoom)
    await block.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await block.hover()
    await pause()
    const layout = await block.evaluate(el => {
      const actions = el.querySelector('[data-resume-block-actions]'), r = actions.getBoundingClientRect(), owner = el.getBoundingClientRect()
      return { width: r.width, clientWidth: actions.clientWidth, scrollWidth: actions.scrollWidth, belowOwner: r.top >= owner.bottom,
        buttons: [...actions.querySelectorAll('button')].map(button => {
          const b = button.getBoundingClientRect()
          return { reachable: button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)),
            clipped: b.left < r.left || b.right > r.right || b.top < r.top || b.bottom > r.bottom }
        }) }
    })
    assert.ok(layout.belowOwner)
    assert.ok(layout.buttons.every(button => button.reachable && !button.clipped))
    assert.ok(layout.scrollWidth <= layout.clientWidth + 1)
    results.push({ check: `all local row actions remain reachable at ${width}px with paper zoom ${zoom}`, pass: true, ...layout })
  }
  await (await block.$('button[title="删除"]')).click()
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-resume-edit-region="block"]')].some(el => el.textContent.includes('校园社交应用MVP')))
  const text = await page.evaluate(() => [...document.querySelectorAll('[data-resume-edit-region="section"]')]
    .find(el => el.querySelector('h2')?.textContent === '项目经历')?.textContent)
  assert.ok(text.includes('AI简历优化助手'))
  results.push({ check: 'local Delete removes only its synthetic row', pass: true })

  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 900, isMobile: true, hasTouch: true })
    await page.goto(`${baseUrl}/dev/template-lab?tpl=qingning&fixture=full&viewport=mobile`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-template-lab="ready"] .resume-container')
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-template-root]'), r = root.getBoundingClientRect()
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, paperWidth: r.width,
        visualHeight: r.height, wrapperHeight: root.parentElement.getBoundingClientRect().height,
        editMarkers: document.querySelectorAll('[data-resume-edit-field], [data-resume-edit-region], [data-resume-inline-toolbar]').length,
        hover: matchMedia('(hover: hover)').matches }
    })
    assert.equal(metrics.viewport, width)
    assert.ok(metrics.scrollWidth <= width)
    assert.ok(metrics.paperWidth <= width - 24 + 1)
    assert.ok(Math.abs(metrics.visualHeight - metrics.wrapperHeight) <= 1)
    assert.equal(metrics.editMarkers, 0)
    assert.equal(metrics.hover, false)
    results.push({ check: `mobile preview ${width}`, pass: true, ...metrics })
    await page.screenshot({ path: path.join(out, `mobile-${width}.png`) })
  }
  await page.setViewport({ width: 320, height: 900, isMobile: true, hasTouch: true })
  await pause()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320))
  results.push({ check: 'mobile resize without reloading', pass: true })
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  await page.screenshot({ path: path.join(out, 'failure.png') })
  throw error
} finally { await browser.close() }
