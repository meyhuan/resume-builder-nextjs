#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3012'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname), 'Local fixtures only')
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const ids = process.argv.includes('--flows-only') ? [] : (process.argv.find((arg) => arg.startsWith('--ids='))?.slice(6).split(',') ??
  [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)].filter(([, , block]) => /editor: true/.test(block) && /catalog: true/.test(block)).map(([, id]) => id))
const output = path.resolve('test-artifacts/avatar-size', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(output, { recursive: true })
const parsed = ts.createSourceFile('qa.mjs', fs.readFileSync('scripts/verify-template.mjs', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const declaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'checkGeneralVisualLayout')
const checkLayout = vm.runInNewContext(`(${declaration.getText(parsed)})`)
const fixed = new Set(['jingrui', 'shanglan', 'shaoniangan'])
const results = { templates: [], flows: [], failures: [], runtimeErrors: [] }
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })
const settle = (page) => page.evaluate(async () => {
  await Promise.race([Promise.all([
    document.fonts.ready,
    ...[...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve })),
  ]), new Promise((resolve) => setTimeout(resolve, 8000))])
  await new Promise((resolve) => setTimeout(resolve, 100))
})
const metrics = (page) => page.evaluate(() => {
  const root = document.querySelector('.resume-container')
  const scale = root.getBoundingClientRect().width / root.offsetWidth
  const img = root.querySelector('[data-resume-avatar] img')
  if (!img) return null
  const box = img.getBoundingClientRect()
  const boundary = root.getBoundingClientRect()
  const overlaps = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim() || node.parentElement.closest('button, svg, style, [aria-hidden="true"], [data-resume-avatar], [data-export-hide]')) continue
    const range = document.createRange(); range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      if (Math.min(rect.right, box.right) - Math.max(rect.left, box.left) > 2 && Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top) > 2) overlaps.push(node.textContent.trim().slice(0, 70))
    }
  }
  return { width: box.width / scale, height: box.height / scale, overlaps: [...new Set(overlaps)], outside: box.left < boundary.left - 2 || box.right > boundary.right + 2 }
})
async function visit(page, id, size, viewport = 'pc', fixture = 'long') {
  await page.bringToFront()
  await page.setViewport(viewport === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1400, height: 1100 })
  await page.goto(`${baseUrl}/dev/template-lab?tpl=${id}&fixture=${fixture}&avatar=/avatar.jpg&avatarSize=${size}&viewport=${viewport}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-template-lab="ready"] [data-resume-avatar] img', { timeout: 60000 })
  await settle(page)
  const geometry = await metrics(page)
  return { ...geometry, layout: await checkLayout(page, { fixture, viewport: { isMobile: viewport === 'mobile' } }) }
}
async function hiddenPhotoLayout(page, id, size) {
  await page.setViewport({ width: 1400, height: 1100 })
  await page.goto(`${baseUrl}/dev/template-lab?tpl=${id}&fixture=full&avatarSize=${size}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-template-lab="ready"] .resume-container')
  await settle(page)
  return page.evaluate(() => {
    const root = document.querySelector('.resume-container')
    if (root.querySelector('[data-resume-avatar]')) throw new Error('Hidden photo remains visible')
    const box = root.getBoundingClientRect()
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const rects = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || node.parentElement.closest('style, svg, button, [aria-hidden="true"]')) continue
      const range = document.createRange(); range.selectNodeContents(node)
      for (const rect of range.getClientRects()) rects.push([rect.x - box.x, rect.y - box.y, rect.width, rect.height].map(Math.round))
    }
    return { height: Math.round(box.height), rects }
  })
}
let next = 0
async function matrixWorker() {
  const page = await browser.newPage()
  page.on('pageerror', (error) => results.runtimeErrors.push(error.message))
  while (next < ids.length) {
    const id = ids[next++]
    const entry = { id }
    try {
      entry.default = await visit(page, id, 'default')
      for (const size of ['large', 'max']) {
        entry[size] = await visit(page, id, size)
        assert.ok(!entry[size].outside, `${id}/${size}: photo exceeds page`)
        assert.deepEqual(entry[size].overlaps.filter((text) => !entry.default.overlaps.includes(text)), [], `${id}/${size}: photo covers text`)
        assert.ok(!entry[size].layout || entry[size].layout === entry.default.layout, `${id}/${size}: ${entry[size].layout}`)
        if (fixed.has(id)) assert.ok(Math.abs(entry[size].width - entry.default.width) < 2, `${id}: fixed sidebar changed`)
        else assert.ok(entry[size].width > entry.default.width + 3, `${id}/${size}: photo did not grow`)
        // Borders and polaroid padding stay fixed, so allow a small ratio difference.
        assert.ok(Math.abs(entry[size].width / entry[size].height - entry.default.width / entry.default.height) < .06, `${id}/${size}: distorted aspect ratio`)
      }
      await (await page.$('.resume-container')).screenshot({ path: path.join(output, `${id}-max.png`) })
      await page.emulateMediaType('print')
      await settle(page)
      entry.print = await metrics(page)
      assert.ok(Math.abs(entry.print.width - entry.max.width) < 2, `${id}: print photo size differs`)
      await page.emulateMediaType('screen')
      entry.mobile = await visit(page, id, 'max', 'mobile')
      if (fixed.has(id)) {
        const mobileDefault = await visit(page, id, 'default', 'mobile')
        assert.ok(Math.abs(entry.mobile.width - mobileDefault.width) < 2, `${id}: mobile fixed sidebar changed`)
      } else assert.ok(Math.abs(entry.mobile.width - entry.max.width) < 2, `${id}: mobile photo size differs`)
      assert.ok(!entry.mobile.outside, `${id}: mobile overflow`)
      if (['lanying', 'jinhang', 'lanzix', 'lanzhe', 'lanmu', 'ziji', 'dense'].includes(id)) {
        const sparseDefault = await visit(page, id, 'default', 'pc', 'sparse')
        entry.sparse = await visit(page, id, 'max', 'pc', 'sparse')
        assert.deepEqual(entry.sparse.overlaps.filter((text) => !sparseDefault.overlaps.includes(text)), [], `${id}: sparse photo covers next section`)
      }
      const hiddenDefault = await hiddenPhotoLayout(page, id, 'default')
      assert.deepEqual(await hiddenPhotoLayout(page, id, 'max'), hiddenDefault, `${id}: hidden photo size still changes layout`)
      entry.hiddenPhotoLayoutUnchanged = true
      entry.passed = true
    } catch (error) {
      entry.error = error.message
      results.failures.push(error.message)
      await page.emulateMediaType('screen')
      await page.screenshot({ path: path.join(output, `${id}-failure.png`) }).catch(() => {})
    }
    results.templates.push(entry)
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
    console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${id}${entry.error ? `: ${entry.error}` : ''}`)
  }
  await page.close()
}
async function clickText(page, text) {
  const handle = await page.waitForFunction((label) => [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === label), {}, text)
  await handle.asElement().click()
}
async function desktopFlow() {
  const page = await browser.newPage()
  await page.bringToFront()
  await page.setViewport({ width: 1600, height: 1200 })
  for (const id of ['simple', 'dense', 'warm', 'lanzhe', 'tablegrid', 'xingmiao', 'jingrui']) {
    await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${id}&avatar=/avatar.jpg`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('button[aria-label="调整照片大小"]')
    const before = await metrics(page)
    await page.click('button[aria-label="调整照片大小"]')
    await page.waitForSelector('[data-avatar-size="max"]')
    if (fixed.has(id)) {
      assert.ok(await page.$eval('[data-avatar-size="max"]', (node) => node.disabled))
      await page.keyboard.press('Escape')
    } else {
      await page.click('[data-avatar-size="max"]')
      await settle(page)
      assert.ok((await metrics(page)).width > before.width + 3)
      assert.equal(await page.$('input[placeholder="请输入姓名"]'), null, 'Photo control opened base-info editor')
      await page.screenshot({ path: path.join(output, `${id}-desktop-controls.png`) })
      await page.keyboard.press('Escape')
      await page.waitForSelector('[data-avatar-size-control]', { hidden: true })
      if (id === 'simple') {
        await page.click('button[data-template-id="timeline"]')
        await page.waitForSelector('[data-scenario-active-template="timeline"]')
        await page.click('button[data-template-id="simple"]')
        await page.waitForSelector('[data-scenario-active-template="simple"]')
        assert.ok((await metrics(page)).width > before.width + 3, 'Switching templates lost photo size')
      }
      await page.click('[data-qa-export="true"]')
      const html = await page.$eval('[data-qa-export-html]', (node) => node.value)
      assert.ok(!html.includes('data-avatar-actions'), 'Photo controls leaked into export HTML')
      const exported = await browser.newPage()
      await exported.setViewport({ width: 794, height: 1123 })
      await exported.setContent(html.replaceAll('src="/avatar.jpg"', `src="${baseUrl}/avatar.jpg"`), { waitUntil: 'load' })
      await exported.emulateMediaType('print')
      await settle(exported)
      assert.ok(Math.abs((await metrics(exported)).width - (await metrics(page)).width) < 2, `${id}: export size differs`)
      await exported.pdf({ path: path.join(output, `${id}-max.pdf`), printBackground: true, preferCSSPageSize: true })
      await exported.close()
      await page.click('button[aria-label="调整照片大小"]')
      await clickText(page, '恢复模板默认')
      await settle(page)
      assert.ok(Math.abs((await metrics(page)).width - before.width) < 1, 'Reset failed')
      await page.keyboard.press('Escape')
    }
    results.flows.push(`desktop ${id}: presets, reset, export / fixed limit`)
  }
  await page.close()
}
async function mobileFlow() {
  const page = await browser.newPage()
  await page.bringToFront()
  page.on('pageerror', (error) => results.runtimeErrors.push(error.message))
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await page.setCookie({ name: 'auth_uid', value: 'avatar-size-local-fixture', url: baseUrl })
  let saved
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/next-api/') || url.pathname.startsWith('/api/')) {
      if (request.method() === 'PUT' && url.pathname === '/next-api/resumes/avatar-size-fixture') saved = JSON.parse(request.postData()).content
      void request.respond({ status: 200, contentType: 'application/json', body: '{}' })
    } else void request.continue()
  })
  await page.goto(`${baseUrl}/dev/scenario-loader?tpl=simple`, { waitUntil: 'networkidle2' })
  const resume = { id: 'avatar-size-fixture', name: '本地测试', baseInfo: { phone: '13800001234', email: 'avatar@example.com', avatarUrl: '/avatar.jpg', showAvatar: true, customFields: [{ label: '测试字段', value: '保持不变' }] }, sections: [] }
  await page.evaluate(async (resume) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('keyval')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, transaction = db.transaction('keyval', 'readwrite')
        transaction.objectStore('keyval').put(JSON.stringify({ state: { resumeId: resume.id, draft: resume, templateId: 'simple', dirtyPaths: [], celebratedMilestones: [], hiddenSectionIds: [] }, version: 0 }), 'resume-draft-v1')
        transaction.oncomplete = () => { db.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, resume)
  await page.goto(`${baseUrl}/m/edit/base?source=web&mini=0`, { waitUntil: 'networkidle2' })
  await clickText(page, '调整大小')
  await page.waitForSelector('[aria-label="简历顶部预览"] [data-resume-avatar] img')
  const before = await metrics(page)
  await page.click('[data-avatar-size="max"]')
  await settle(page)
  assert.ok((await metrics(page)).width > before.width + 3)
  assert.ok(await page.$eval('[aria-label="简历顶部预览"]', (node) => Math.abs(node.clientWidth - node.firstElementChild.getBoundingClientRect().width) < 2), 'Mobile preview did not fit the sheet width')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: path.join(output, 'mobile-size-sheet.png') })
  await clickText(page, '完成')
  await page.click('button[aria-label="保存"]')
  await page.waitForFunction(() => !document.body.textContent.includes('保存中'))
  assert.equal(saved.baseInfo.avatarSize, 'max')
  assert.equal(saved.baseInfo.avatarUrl, '/avatar.jpg')
  assert.deepEqual(saved.baseInfo.customFields, resume.baseInfo.customFields)
  await page.goto(`${baseUrl}/m/edit/base?source=web&mini=0`, { waitUntil: 'networkidle2' })
  await clickText(page, '调整大小')
  await page.waitForSelector('[data-avatar-size="max"][aria-pressed="true"]')
  results.flows.push('mobile: live template preview, no overflow, mock save preserves fields, IndexedDB reload')
  await page.close()
}
try {
  await matrixWorker()
  for (const [name, flow] of [['desktop', desktopFlow], ['mobile', mobileFlow]]) {
    try { await flow() } catch (error) { results.failures.push(`${name}: ${error.stack}`) }
  }
} finally {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ output, templates: results.templates.length, flows: results.flows, failures: results.failures, runtimeErrors: results.runtimeErrors }, null, 2))
process.exitCode = results.failures.length || results.runtimeErrors.length ? 1 : 0
