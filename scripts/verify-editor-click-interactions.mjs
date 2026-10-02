import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-click')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
try {
  await page.setViewport({ width: 1400, height: 1000 })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => document.querySelector('[data-scenario-active-template]')?.textContent.includes('李小满'))
  await page.evaluate(async () => { await document.fonts.ready })
  const rich = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('GPA')))
  await rich.evaluate(el => el.scrollIntoView({ block: 'center' }))
  const before = await rich.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const x = rect.x + rect.width * 0.35
    const y = rect.y + 12
    const caret = document.caretRangeFromPoint(x, y)
    return { x, y, caretText: caret?.startContainer.textContent, caretOffset: caret?.startOffset,
      paperHeight: el.closest('.resume-container').getBoundingClientRect().height,
      nextTitleTop: [...document.querySelectorAll('h2')].find(title => title.textContent === '实习经历').getBoundingClientRect().top }
  })
  await page.mouse.click(before.x, before.y)
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  const after = await page.evaluate(() => {
    const editor = document.querySelector('[contenteditable="true"]')
    const toolbar = document.querySelector('[data-resume-inline-toolbar]')
    const dock = toolbar.closest('[data-resume-action-dock]')
    const canvas = document.querySelector('[data-editor-canvas]')
    const selection = getSelection()
    return { caretText: selection.anchorNode.textContent, caretOffset: selection.anchorOffset, collapsed: selection.isCollapsed,
      paperHeight: editor.closest('.resume-container').getBoundingClientRect().height,
      nextTitleTop: [...document.querySelectorAll('h2')].find(title => title.textContent === '实习经历').getBoundingClientRect().top,
      docked: Boolean(dock), toolbarInPaper: Boolean(toolbar.closest('.resume-container')),
      toolbarTop: toolbar.getBoundingClientRect().top, canvasBottom: canvas.getBoundingClientRect().bottom }
  })
  assert.equal(after.caretText, before.caretText)
  assert.equal(after.caretOffset, before.caretOffset)
  assert.equal(after.collapsed, true)
  assert.equal(after.docked, true)
  assert.equal(after.toolbarInPaper, false)
  assert.ok(after.toolbarTop >= after.canvasBottom - 1)
  assert.ok(Math.abs(after.paperHeight - before.paperHeight) <= 1)
  assert.ok(Math.abs(after.nextTitleTop - before.nextTitleTop) <= 1)
  results.push({ check: 'one click focuses rich text at the clicked caret; dock does not overlap or shift resume', pass: true, ...after })
  await page.screenshot({ path: path.join(out, 'rich-text-dock.png') })

  await page.hover('[data-resume-inline-toolbar] button[aria-label="加粗"]')
  assert.ok(await page.$('[contenteditable="true"]'))
  await page.$eval('[data-resume-inline-toolbar] button[aria-label="加粗"]', el => el.focus())
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('[aria-label="加粗"]')?.getAttribute('aria-pressed') === 'true')
  await page.$eval('[data-resume-inline-toolbar] button[aria-label="加粗"]', el => el.focus())
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('[aria-label="加粗"]')?.getAttribute('aria-pressed') === 'false')
  await page.click('[data-resume-inline-toolbar] button[aria-label="加粗"]')
  await page.waitForFunction(() => document.querySelector('[aria-label="加粗"]')?.getAttribute('aria-pressed') === 'true')
  await page.click('[data-resume-inline-toolbar] button[aria-label="加粗"]')
  await page.waitForFunction(() => document.querySelector('[aria-label="加粗"]')?.getAttribute('aria-pressed') === 'false')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('contenteditable')), 'true')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-resume-edit-field')), 'rich-text')
  results.push({ check: 'toolbar remains reachable; mouse/keyboard formatting works; Escape returns to rich-text trigger', pass: true })
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  assert.equal(await page.evaluate(() => getSelection()?.isCollapsed && getSelection()?.anchorOffset === 0), true)
  for (const width of [1024, 1400]) {
    await page.setViewport({ width, height: 1000 })
    const layout = await page.$eval('[data-resume-inline-toolbar]', el => {
      const rect = el.closest('[data-resume-action-dock]').getBoundingClientRect()
      return { clipped: [...el.querySelectorAll('button')].some(button => { const r = button.getBoundingClientRect(); return r.left < rect.left || r.right > rect.right || r.bottom > rect.bottom }) }
    })
    assert.equal(layout.clipped, false)
  }
  await page.click('[aria-label="完成正文编辑"]')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-resume-edit-field')), 'rich-text')
  results.push({ check: 'keyboard opens at the start; explicit Done returns focus; rich-text toolbar fits at 1024/1400', pass: true })

  const school = '[data-resume-field-name="school"]'
  await page.click(school)
  await page.waitForSelector(`input${school}`)
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-resume-field-name')), 'school')
  await page.click(school)
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-resume-field-name')), 'school')
  assert.equal(await page.$eval(school, el => el.textContent), '夸克大学')
  results.push({ check: 'short-field Enter and Escape return focus without changing the value', pass: true })

  for (const [key, expectedId] of [['city', 'city'], ['industry', 'industry'], ['currentStatus', 'currentStatus'], ['custom_方向', 'job-custom-0']]) {
    await page.click(`[data-template-job-intention-key="${key}"]`)
    await page.waitForSelector('[role="dialog"]')
    await page.waitForFunction(id => document.activeElement?.id === id, {}, expectedId)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'))
    results.push({ check: `click ${key} opens/focuses its own field, including optional/custom fields`, pass: true })
  }

  const project = await page.evaluateHandle(() => [...document.querySelectorAll('[data-resume-field-name="name"]')].find(el => el.textContent.includes('校园社交应用MVP')))
  await project.click()
  await page.keyboard.press('Escape')
  await page.mouse.move(5, 5)
  await page.waitForFunction(() => document.querySelector('.resume-action-context')?.textContent === '项目经历 · 校园社交应用MVP')
  const selected = await page.$eval('[data-resume-edit-selected="true"]', el => ({ background: getComputedStyle(el).backgroundColor, markerContent: getComputedStyle(el, '::before').content }))
  assert.notEqual(selected.background, 'rgba(0, 0, 0, 0)')
  assert.equal(selected.markerContent, 'none')
  await page.screenshot({ path: path.join(out, 'selected-project.png') })
  for (const width of [1024, 1400]) {
    await page.setViewport({ width, height: 1000 })
    await page.click('[data-resume-field-name="name"]')
    await page.keyboard.press('Escape')
    const layout = await page.$eval('[data-resume-action-dock]', el => {
      const rect = el.getBoundingClientRect()
      return { scrollWidth: el.scrollWidth, width: rect.width,
        clipped: [...el.querySelectorAll('button')].some(button => { const r = button.getBoundingClientRect(); return r.left < rect.left || r.right > rect.right || r.bottom > rect.bottom }) }
    })
    assert.equal(layout.clipped, false)
    assert.ok(layout.scrollWidth <= layout.width + 1)
    results.push({ check: `named action context and persistent selection fit at ${width}`, pass: true, ...layout })
  }
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  console.log('Completed checks:', JSON.stringify(results))
  console.log('Failure state:', JSON.stringify(await page.evaluate(() => ({ active: document.activeElement?.outerHTML.slice(0, 200), editors: document.querySelectorAll('[contenteditable]').length, dock: document.querySelector('[data-resume-action-dock]')?.textContent }))))
  await page.screenshot({ path: path.join(out, 'failure.png') })
  throw error
} finally { await browser.close() }
