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
const pause = () => new Promise((resolve) => setTimeout(resolve, 250))
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => [...document.querySelectorAll('.qingning-rich')].some((element) => element.textContent.includes('项目概述')))
  await page.evaluate(async () => { await document.fonts.ready })
  const field = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find((element) => element.textContent.includes('项目概述')))
  const block = await field.evaluateHandle((element) => element.closest('[data-resume-edit-region="block"]'))
  await field.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await page.mouse.move(8, 8)
  await pause()
  const geometry = () => block.evaluate((element) => {
    const section = element.closest('[data-resume-edit-region="section"]')
    return [section, element, element.querySelector('.qingning-rich')].map((node) => {
      const { width, height } = node.getBoundingClientRect()
      return { width, height }
    })
  })
  const idleGeometry = await geometry()
  await field.hover()
  assert.deepEqual(await geometry(), idleGeometry)
  assert.equal(await page.$('[data-resume-action-dock] button'), null)

  // A real field click selects the owner while preserving the existing editor.
  const date = await block.$('[data-resume-edit-field]')
  await date.click()
  await page.keyboard.press('Escape')
  await pause()
  assert.equal(await page.$eval('.resume-action-context', (element) => element.textContent), '项目经历 · 校园社交应用MVP')
  assert.deepEqual(await geometry(), idleGeometry)
  const dockMetrics = await page.$eval('[data-resume-action-dock]', (dock) => {
    const canvas = document.querySelector('[data-editor-canvas]')
    return {
      dockTop: dock.getBoundingClientRect().top,
      canvasBottom: canvas.getBoundingClientRect().bottom,
      inPaper: Boolean(dock.closest('.resume-container, [data-scenario-preview]')),
      buttons: [...dock.querySelectorAll('button')].map((button) => {
        const r = button.getBoundingClientRect()
        return { label: button.textContent || button.getAttribute('aria-label'), width: r.width, height: r.height,
          reachable: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }
      }),
    }
  })
  assert.equal(dockMetrics.inPaper, false)
  assert.ok(dockMetrics.dockTop >= dockMetrics.canvasBottom - 1)
  assert.ok(dockMetrics.buttons.every((button) => button.reachable && button.height >= 32))
  results.push({ check: 'real field click; independent dock; all action buttons reachable; no resume layout shift', ...dockMetrics })

  const second = await page.evaluateHandle(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')].find((element) => element.textContent.includes('负责岗位画像')))
  await second.hover()
  await pause()
  assert.equal(await page.$eval('.resume-action-context', (element) => element.textContent), '项目经历 · 校园社交应用MVP')
  await page.hover('[data-resume-action-dock] button[title="AI润色"]')
  await pause()
  assert.equal(await block.evaluate((element) => element.getAttribute('data-resume-edit-selected')), 'true')
  results.push({ check: 'crossing other rows does not change the AI/delete target', pass: true })

  await page.evaluate(() => document.activeElement?.blur())
  await field.hover()
  await pause()
  await page.screenshot({ path: path.join(out, 'final-dock.png') })
  await page.click('[data-resume-action-dock] button[title="下移"]')
  await page.waitForFunction(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')]
    .filter((element) => element.closest('section')?.textContent.includes('项目经历'))[1]?.textContent.includes('校园社交应用MVP'))
  assert.equal(await page.$eval('.resume-action-context', (element) => element.textContent), '项目经历 · 校园社交应用MVP')
  results.push({ check: 'move-down callback changes the real resume and updates the action context', pass: true })
  // The same selected component remains mounted after reorder.
  await page.click('[data-resume-action-dock] button[title="上移"]')
  await page.waitForFunction(() => [...document.querySelectorAll('[data-resume-edit-region="block"]')]
    .filter((element) => element.closest('section')?.textContent.includes('项目经历'))[0]?.textContent.includes('校园社交应用MVP'))

  for (const width of [1024, 1400]) {
    await page.setViewport({ width, height: 1000 })
    await pause()
    const layout = await page.$eval('[data-resume-action-dock]', (dock) => {
      const rect = dock.getBoundingClientRect()
      return { width: rect.width, height: rect.height, scrollWidth: dock.scrollWidth,
        clipped: [...dock.querySelectorAll('button')].some((button) => {
          const r = button.getBoundingClientRect()
          return r.left < rect.left || r.right > rect.right || r.top < rect.top || r.bottom > rect.bottom
        }) }
    })
    assert.equal(layout.clipped, false)
    assert.ok(layout.scrollWidth <= layout.width + 1)
    results.push({ check: `desktop action dock ${width}`, ...layout })
  }

  await page.click('[data-resume-action-dock] button[title="删除"]')
  await page.waitForFunction(() => !document.querySelector('[data-resume-action-dock] button'))
  const projectText = await page.evaluate(() => [...document.querySelectorAll('[data-resume-edit-region="section"]')]
    .find((element) => element.querySelector('h2')?.textContent === '项目经历')?.textContent)
  assert.ok(!projectText.includes('校园社交应用MVP'))
  assert.ok(projectText.includes('AI简历优化助手'))
  results.push({ check: 'delete affects only the selected synthetic row and clears the dock', pass: true })

  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 900, isMobile: true, hasTouch: true })
    await page.goto(`${baseUrl}/dev/template-lab?tpl=qingning&fixture=full&viewport=mobile`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-template-lab="ready"] .resume-container')
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-template-root]')
      const r = root.getBoundingClientRect()
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        paperWidth: r.width, visualHeight: r.height, wrapperHeight: root.parentElement.getBoundingClientRect().height,
        editMarkers: document.querySelectorAll('[data-resume-edit-field], [data-resume-edit-region], [data-resume-action-dock]').length,
        hover: matchMedia('(hover: hover)').matches }
    })
    assert.equal(metrics.viewport, width)
    assert.ok(metrics.scrollWidth <= width)
    assert.ok(metrics.paperWidth <= width - 24 + 1)
    assert.ok(Math.abs(metrics.visualHeight - metrics.wrapperHeight) <= 1)
    assert.equal(metrics.editMarkers, 0)
    assert.equal(metrics.hover, false)
    results.push({ check: `mobile preview ${width}`, ...metrics })
    await page.screenshot({ path: path.join(out, `mobile-${width}.png`) })
  }
  await page.setViewport({ width: 320, height: 900, isMobile: true, hasTouch: true })
  await pause()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320))
  results.push({ check: 'mobile resize without reloading', pass: true })
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
