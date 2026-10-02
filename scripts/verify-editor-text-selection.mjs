import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3011'
const out = path.resolve('test-artifacts/editor-text-selection')
await fs.mkdir(out, { recursive: true })
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage()
const results = []
await page.setViewport({ width: 1400, height: 1000 })

async function open() {
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=qingning&avatar=%2Favatar.jpg`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => document.querySelector('[data-scenario-active-template]')?.textContent.includes('李小满'))
  await page.evaluate(async () => { await document.fonts.ready })
  const rich = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('GPA')))
  await rich.evaluate(el => el.scrollIntoView({ block: 'center' }))
  return rich
}

async function textPoint(root, offset) {
  return root.evaluate((el, offset) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let remaining = offset
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (remaining <= node.textContent.length) {
        const range = document.createRange()
        range.setStart(node, remaining)
        range.collapse(true)
        const rect = range.getBoundingClientRect()
        return { x: rect.left + 0.1, y: rect.top + rect.height / 2 }
      }
      remaining -= node.textContent.length
    }
    throw new Error('Text offset outside field')
  }, offset)
}

async function drag(root, start, end) {
  const a = await textPoint(root, start)
  const b = await textPoint(root, end)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 16 })
  const native = await page.evaluate(() => {
    const selection = getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    return { text: selection?.toString(), backward: Boolean(range && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset) }
  })
  assert.ok(native.text?.length > 2, `Native drag did not select text: ${JSON.stringify(native)}`)
  await page.mouse.up()
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  const restored = await page.evaluate(() => {
    const selection = getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    return { text: selection?.toString(), collapsed: selection?.isCollapsed,
      backward: Boolean(range && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset) }
  })
  assert.equal(restored.text, native.text)
  assert.equal(restored.collapsed, false)
  assert.equal(restored.backward, native.backward)
  return native.text
}

try {
  let rich = await open()
  const forward = await drag(rich, 8, 42)
  await page.click('[data-resume-inline-toolbar] button[aria-label="加粗"]')
  assert.equal(await page.evaluate(() => getSelection()?.toString()), forward)
  assert.ok(await page.$eval('[contenteditable="true"]', el => [...el.querySelectorAll('.font-bold')].some(span => span.textContent === getSelection()?.toString())))
  results.push({ check: 'first native drag selects text, survives entering edit, and formats the same selection from the top toolbar', pass: true, text: forward })
  await page.screenshot({ path: path.join(out, 'top-format-selection.png') })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  rich = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('GPA')))
  await drag(rich, 60, 4)
  await page.keyboard.down('Control')
  await page.keyboard.press('i')
  await page.keyboard.up('Control')
  assert.ok(await page.$eval('[contenteditable="true"]', el => el.querySelector('.italic')))
  results.push({ check: 'reverse native drag across formatted spans retains selection; Ctrl+I works', pass: true })

  rich = await open()
  const end = await rich.evaluate(el => el.textContent.length - 5)
  const startPoint = await textPoint(rich, 3)
  const endPoint = await textPoint(rich, end)
  assert.ok(endPoint.y - startPoint.y > 10, 'Fixture must wrap across lines')
  const multiline = await drag(rich, 3, end)
  assert.ok(multiline.length > 60)
  results.push({ check: 'first drag across wrapped lines preserves the entire selected text', pass: true, characters: multiline.length })

  rich = await open()
  const word = await textPoint(rich, 1)
  await page.mouse.click(word.x, word.y)
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  await page.mouse.click(word.x, word.y, { clickCount: 2 })
  await page.waitForFunction(() => getSelection()?.toString() === 'GPA')
  results.push({ check: 'double-click from display mode selects the native word', pass: true })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  await page.keyboard.down('Alt')
  await page.keyboard.press('F10')
  await page.keyboard.up('Alt')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '加粗')
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '斜体')
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('contenteditable')), 'true')
  results.push({ check: 'Alt+F10 enters format controls; arrows navigate; Escape returns to text', pass: true })

  await page.keyboard.down('Control')
  await page.keyboard.press('a')
  await page.keyboard.up('Control')
  const original = await page.$eval('[contenteditable="true"]', el => el.textContent)
  assert.equal(await page.evaluate(() => getSelection()?.toString()), original)
  await page.keyboard.type('PC editing regression content', { delay: 10 })
  await page.waitForFunction(() => document.querySelector('[contenteditable="true"]')?.textContent === 'PC editing regression content')
  await page.keyboard.down('Control')
  await page.keyboard.press('z')
  await page.keyboard.up('Control')
  await page.waitForFunction(() => {
    const editor = document.querySelector('[contenteditable="true"]')
    return editor && editor.textContent !== 'PC editing regression content'
  })
  await page.keyboard.down('Control')
  await page.keyboard.press('y')
  await page.keyboard.up('Control')
  await page.waitForFunction(() => document.querySelector('[contenteditable="true"]')?.textContent === 'PC editing regression content')
  await page.click('[data-resume-field-name="school"]')
  await page.waitForSelector('input[data-resume-field-name="school"]')
  assert.equal(await page.$('[contenteditable="true"]'), null)
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.qingning-rich')].some(el => el.textContent === 'PC editing regression content')))
  assert.equal(await page.$eval('[data-resume-format-dock] button[aria-label="加粗"]', el => el.disabled), true)
  results.push({ check: 'Ctrl+A/Z/Y work; clicking another field retains typed changes and disables formats without a Done step', pass: true })

  rich = await open()
  await rich.click()
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  await page.keyboard.down('Shift')
  await page.keyboard.press('Tab')
  await page.keyboard.up('Shift')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-resume-edit-field')))
  assert.equal(await page.$eval('[data-resume-format-dock] button[aria-label="加粗"]', el => el.disabled), true)
  results.push({ check: 'keyboard Tab out of text naturally ends editing and preserves focus on the adjacent field', pass: true })

  await open()
  const project = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('项目概述')))
  await project.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await project.click()
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  await page.keyboard.down('Control')
  await page.keyboard.press('End')
  await page.keyboard.up('Control')
  await page.keyboard.type(' PC block action verification', { delay: 10 })
  await page.click('[data-resume-action-dock] button[title="下移"]')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]'))
  const moved = await page.evaluate(() => {
    const section = [...document.querySelectorAll('[data-resume-edit-region="section"]')]
      .find(el => el.querySelector('h2')?.textContent === '项目经历')
    return [...section.querySelectorAll('[data-resume-edit-region="block"]')].map(el => el.textContent)
  })
  assert.ok(moved[1].includes('校园社交应用MVP') && moved[1].includes('PC block action verification'))
  assert.equal(await page.$eval('.resume-action-context', el => el.textContent), '项目经历 · 校园社交应用MVP')
  results.push({ check: 'one Move click while typing ends text editing, retains changes, and moves the selected row', pass: true })

  const movedRich = await page.evaluateHandle(() => [...document.querySelectorAll('.qingning-rich')].find(el => el.textContent.includes('PC block action verification')))
  await movedRich.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await movedRich.click()
  await page.waitForFunction(() => document.activeElement?.getAttribute('contenteditable') === 'true')
  await page.click('[data-resume-action-dock] button[title="删除"]')
  await page.waitForFunction(() => !document.querySelector('[contenteditable="true"]') && !document.querySelector('[data-resume-action-dock] button'))
  const remaining = await page.evaluate(() => [...document.querySelectorAll('[data-resume-edit-region="section"]')]
    .find(el => el.querySelector('h2')?.textContent === '项目经历')?.textContent)
  assert.ok(!remaining.includes('校园社交应用MVP') && remaining.includes('AI简历优化助手'))
  assert.equal(await page.$eval('[data-resume-format-dock] button[aria-label="加粗"]', el => el.disabled), true)
  results.push({ check: 'one Delete click from an active editor removes only the selected synthetic row and clears both toolbars', pass: true })
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  console.log('Completed checks:', JSON.stringify(results))
  console.log('Selection:', await page.evaluate(() => ({ selected: getSelection()?.toString(), anchor: getSelection()?.anchorOffset, focus: getSelection()?.focusOffset, active: document.activeElement?.outerHTML.slice(0, 180) })))
  await page.screenshot({ path: path.join(out, 'failure.png') })
  throw error
} finally { await browser.close() }
