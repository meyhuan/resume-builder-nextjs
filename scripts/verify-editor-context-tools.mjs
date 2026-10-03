import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-context-tools')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
const passed = (check, evidence = {}) => results.push({ check, pass: true, ...evidence })
const nextFrame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

async function open(width = 1400) {
  await page.setViewport({ width, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => document.querySelector('[data-scenario-active-template]')?.textContent.includes('李小满'))
  await page.evaluate(async () => { await document.fonts.ready })
}
async function field(text) {
  const handle = await page.evaluateHandle(text => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes(text)), text)
  await handle.evaluate(el => el.scrollIntoView({ block: 'center' }))
  return handle
}
async function geometry() {
  await nextFrame()
  return page.evaluate(() => {
    const toolbar = document.querySelector('[data-resume-inline-toolbar]')
    const editor = document.querySelector('[contenteditable="true"]')
    const canvas = document.querySelector('[data-editor-canvas]')
    const t = toolbar.getBoundingClientRect(), e = editor.getBoundingClientRect(), c = canvas.getBoundingClientRect()
    return { toolbar: t.toJSON(), editor: e.toJSON(), canvas: c.toJSON(), visibility: getComputedStyle(toolbar).visibility,
      inPaper: Boolean(toolbar.closest('.resume-container')),
      buttonsReachable: [...toolbar.querySelectorAll('button')].filter(button => !button.disabled).every(button => {
        const r = button.getBoundingClientRect()
        return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      }) }
  })
}

try {
  await open()
  assert.equal(await page.$('[data-resume-format-dock], [data-resume-action-dock], [data-resume-inline-toolbar]'), null)
  passed('idle canvas has no permanently reserved format or action bars')
  const rich = await field('GPA')
  const row = await rich.evaluateHandle(el => el.closest('[data-resume-edit-region="block"]'))
  const originalRowHeight = await row.evaluate(el => el.getBoundingClientRect().height)
  await row.hover()
  const deleteButton = await row.$('button[title="删除"]')
  assert.ok(deleteButton)
  assert.equal(await row.evaluate(el => el.getBoundingClientRect().height), originalRowHeight)
  await deleteButton.hover()
  await new Promise(resolve => setTimeout(resolve, 250))
  assert.ok(await row.$('button[title="删除"]'))
  await page.mouse.move(5, 5)
  await new Promise(resolve => setTimeout(resolve, 70))
  await deleteButton.hover()
  await new Promise(resolve => setTimeout(resolve, 250))
  assert.ok(await row.$('button[title="删除"]'))
  await page.screenshot({ path: path.join(out, 'row-hover.png') })
  passed('local actions do not change row height and remain stable across pointer transfers and rapid re-entry')

  const before = await rich.evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.x + r.width * 0.35, y = r.y + 12
    const caret = document.caretRangeFromPoint(x, y)
    return { x, y, text: caret?.startContainer.textContent, offset: caret?.startOffset,
      paperHeight: el.closest('.resume-container').getBoundingClientRect().height }
  })
  await page.mouse.click(before.x, before.y)
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  const caret = await page.evaluate(() => ({ text: getSelection()?.anchorNode.textContent, offset: getSelection()?.anchorOffset, collapsed: getSelection()?.isCollapsed }))
  assert.deepEqual(caret, { text: before.text, offset: before.offset, collapsed: true })
  const first = await geometry()
  assert.equal(first.visibility, 'visible')
  assert.ok(first.toolbar.bottom <= first.editor.top)
  assert.ok(first.toolbar.left >= first.canvas.left && first.toolbar.right <= first.canvas.right)
  assert.equal(first.inPaper, false)
  assert.equal(first.buttonsReachable, true)
  assert.equal(await page.$eval('[contenteditable="true"]', el => el.closest('[data-resume-edit-region="block"]').querySelector('[data-resume-block-actions]')), null)
  assert.equal(await page.$eval('[contenteditable="true"]', el => el.closest('.resume-container').getBoundingClientRect().height), before.paperHeight)
  assert.equal(await page.$('[aria-label="完成正文编辑"]'), null)
  await page.screenshot({ path: path.join(out, 'paragraph-format.png') })
  passed('one click retains caret; formats sit above their paragraph; row actions retract during typing; no paper reflow', first)

  await page.$eval('[data-editor-canvas]', el => el.scrollBy(0, 70))
  const scrolled = await geometry()
  assert.ok(Math.abs((scrolled.toolbar.top - first.toolbar.top) - (scrolled.editor.top - first.editor.top)) < 1)
  passed('format toolbar follows its paragraph when scrolling')
  await page.$eval('[data-editor-canvas]', el => el.scrollBy(0, 700))
  await nextFrame()
  assert.equal(await page.$eval('[data-resume-inline-toolbar]', el => getComputedStyle(el).visibility), 'hidden')
  passed('scrolling the paragraph away hides its tools instead of pinning them over another paragraph')
  await page.keyboard.down('Alt'); await page.keyboard.press('F10'); await page.keyboard.up('Alt')
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '加粗')
  assert.equal(await page.$eval('[data-resume-inline-toolbar]', el => getComputedStyle(el).visibility), 'visible')
  await page.keyboard.press('Escape')
  passed('Alt+F10 brings offscreen paragraph formats into view and Escape restores text focus')
  await nextFrame()
  for (const width of [1024, 1400]) {
    await page.setViewport({ width, height: 1000 })
    await page.$eval('[contenteditable="true"]', el => el.scrollIntoView({ block: 'center' }))
    const layout = await geometry()
    assert.equal(layout.visibility, 'visible')
    assert.equal(layout.buttonsReachable, true)
    assert.ok(layout.toolbar.left >= layout.canvas.left && layout.toolbar.right <= layout.canvas.right)
    passed(`context formats remain reachable inside the canvas at ${width}px`, layout)
  }
  await page.$eval('[data-scenario-preview]', el => { el.style.zoom = 0.8 })
  await page.$eval('[contenteditable="true"]', el => el.scrollIntoView({ block: 'center' }))
  const zoomed = await geometry()
  assert.equal(zoomed.visibility, 'visible')
  assert.equal(zoomed.buttonsReachable, true)
  assert.ok(zoomed.toolbar.bottom <= zoomed.editor.top)
  assert.ok(zoomed.toolbar.left >= zoomed.canvas.left && zoomed.toolbar.right <= zoomed.canvas.right)
  passed('paragraph formats stay correctly anchored and reachable with CSS paper zoom 0.8', zoomed)
  await page.$eval('[data-scenario-preview]', el => { el.style.zoom = 1 })
  await page.$eval('[contenteditable="true"]', el => el.scrollIntoView({ block: 'center' }))
  await nextFrame()
  await page.click('[data-resume-inline-toolbar] button[aria-label="加粗"]')
  await page.waitForFunction(() => document.querySelector('[data-resume-inline-toolbar] [aria-label="加粗"]')?.getAttribute('aria-pressed') === 'true')
  await page.keyboard.down('Alt'); await page.keyboard.press('F10'); await page.keyboard.up('Alt')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '加粗')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '斜体')
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('contenteditable')), 'true')
  passed('mouse formats and Alt+F10/arrow/Escape keyboard path keep text editing usable')
  await page.click('[data-resume-field-name="degree"]')
  await page.waitForSelector('input[data-resume-field-name="degree"]')
  assert.equal(await page.$('[data-resume-inline-toolbar]'), null)
  assert.equal(await page.$('[contenteditable="true"]'), null)
  await page.keyboard.press('Escape')
  passed('clicking another field naturally closes the contextual formats and keeps the new field focus')

  for (const [key, id] of [['city', 'city'], ['industry', 'industry'], ['currentStatus', 'currentStatus'], ['custom_方向', 'job-custom-0']]) {
    await page.click(`[data-template-job-intention-key="${key}"]`)
    await page.waitForFunction(id => document.activeElement?.id === id, {}, id)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
  }
  passed('job intention clicks still focus their own required, optional, and custom fields')

  const project = await field('项目概述')
  await project.click()
  await page.waitForSelector('[data-resume-inline-toolbar] button[aria-label="AI润色"]')
  await page.screenshot({ path: path.join(out, 'project-format.png') })
  await page.emulateMediaType('print')
  assert.equal(await page.$eval('[data-resume-inline-toolbar]', el => getComputedStyle(el).display), 'none')
  assert.ok(await page.$eval('[contenteditable="true"]', el => el.textContent.includes('项目概述')))
  await page.emulateMediaType('screen')
  await nextFrame()
  passed('print hides paragraph formats and AI controls while retaining current text')
  await page.click('[data-resume-inline-toolbar] button[aria-label="AI润色"]')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  passed('AI polish entry is reachable from paragraph formats and leaves text editing; callback ownership is covered by component tests')

  for (const width of [320, 375, 414, 768]) {
    await page.setViewport({ width, height: 900, isMobile: true, hasTouch: true })
    await page.goto(`${baseUrl}/dev/template-lab?tpl=qingning&fixture=full&viewport=mobile`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('[data-template-lab="ready"] .resume-container')
    await nextFrame()
    const mobile = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      editMarkers: document.querySelectorAll('[data-resume-edit-region], [data-resume-inline-toolbar]').length,
      paperWidth: document.querySelector('[data-template-root]').getBoundingClientRect().width,
    }))
    assert.ok(mobile.scrollWidth <= mobile.width + 1)
    assert.equal(mobile.editMarkers, 0)
    assert.ok(mobile.paperWidth > 100 && mobile.paperWidth <= width)
    await page.screenshot({ path: path.join(out, `mobile-${width}.png`) })
    passed(`readonly mobile preview remains visible without editing chrome or overflow at ${width}px`, mobile)
  }
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  console.log('Completed checks:', JSON.stringify(results))
  console.log('Failure state:', await page.evaluate(() => ({
    activeElement: document.activeElement?.outerHTML.slice(0, 1000),
    toolbarStyle: document.querySelector('[data-resume-inline-toolbar]')?.getAttribute('style'),
    editor: document.querySelector('[contenteditable="true"]')?.getBoundingClientRect().toJSON(),
    canvas: document.querySelector('[data-editor-canvas]')?.getBoundingClientRect().toJSON(),
  })))
  await page.screenshot({ path: path.join(out, 'failure.png') })
  throw error
} finally { await browser.close() }
