#!/usr/bin/env node
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

const flags = new Map()
for (let index = 2; index < process.argv.length; index += 2) flags.set(process.argv[index], process.argv[index + 1])
const baseUrl = flags.get('--base-url') || 'http://127.0.0.1:3012'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname), 'Use an isolated local fixture server')
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const publicIds = [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)]
  .filter(([, , block]) => /editor: true/.test(block) && /catalog: true/.test(block)).map(([, id]) => id)
assert.equal(publicIds.length, 50)
const ids = flags.has('--ids') ? flags.get('--ids').split(',') : publicIds
assert.ok(ids.length && new Set(ids).size === ids.length && ids.every((id) => publicIds.includes(id)))
const concurrency = Number(flags.get('--concurrency') || 2)
assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 3)
const scope = flags.get('--scope') || 'spacing'
assert.ok(['spacing', 'one-page', 'all'].includes(scope))
const buildId = fs.readFileSync('.next/BUILD_ID', 'utf8').trim()
const output = path.resolve('test-artifacts', 'template-controls', new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(output, { recursive: true })
const qaSource = fs.readFileSync('scripts/verify-template.mjs', 'utf8')
const parsed = ts.createSourceFile('verify-template.mjs', qaSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const layoutDeclaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'checkGeneralVisualLayout')
assert.ok(layoutDeclaration)
const checkLayout = vm.runInNewContext(`(${layoutDeclaration.getText(parsed)})`)
const pdfDeclaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'analyzePdfPages')
const analyzePdf = vm.runInNewContext(`(${pdfDeclaration.getText(parsed)})`, {
  fs, pdfjsPath: path.resolve('public/libs/pdfjs/pdf.min.js'), pdfjsWorkerPath: path.resolve('public/libs/pdfjs/pdf.worker.min.js'),
})
const sourceSnapshot = () => {
  const files = []
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else files.push({ path: file.replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })
    }
  }
  visit('src')
  for (const file of ['next.config.ts', 'package.json', 'pnpm-lock.yaml', 'scripts/verify-template.mjs', 'scripts/verify-template-controls.mjs']) {
    files.push({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, digest: crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex') }
}
const initialSource = sourceSnapshot()
fs.writeFileSync(path.join(output, 'source-snapshot.json'), JSON.stringify(initialSource, null, 2))
const served = await fetch(`${baseUrl}/templates`, { signal: AbortSignal.timeout(15000) })
assert.ok(served.ok && (await served.text()).includes(buildId), 'Restart the preview after building')
const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)
const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
const launchBrowser = () => puppeteer.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })
const results = []
let nextIndex = 0

async function readSpacing(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-template-root="true"] .resume-container')
    if (!root) throw new Error('Missing rendered resume')
    const scale = root.getBoundingClientRect().width / root.offsetWidth
    const visible = (node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden'
    }
    const rect = (node) => {
      const box = node.getBoundingClientRect()
      return { left: box.left / scale, right: box.right / scale, top: box.top / scale, bottom: box.bottom / scale, width: box.width / scale }
    }
    const sectionNodes = Array.from(root.querySelectorAll('[data-template-section="true"], section'))
      .filter((node) => visible(node) && (node.matches('[data-template-section="true"]') || (node.querySelector('h2') && !node.closest('[data-template-section="true"]')))
        && !node.matches('[data-template-job-intention-trigger="true"]') && !node.querySelector('[data-template-job-intention-trigger="true"]'))
      .filter((node, _, all) => !all.some((child) => child !== node && node.contains(child)))
    const sections = sectionNodes.map((node, index) => ({ key: node.getAttribute('data-template-section-title') || node.querySelector('h2')?.textContent.trim() || String(index), node, rect: rect(node) }))
    const sameColumn = (a, b) => Math.abs(a.left - b.left) < 2 && Math.abs(a.width - b.width) < 2
    const pairs = (items) => items.flatMap((item, index) => {
      const next = items.slice(index + 1).filter((candidate) => sameColumn(item.rect, candidate.rect) && candidate.rect.top >= item.rect.bottom - 1)
        .sort((a, b) => a.rect.top - b.rect.top)[0]
      return next ? [{ key: `${item.key} -> ${next.key}`, gap: next.rect.top - item.rect.bottom }] : []
    })
    // Table rows intentionally share a border: their spacing control changes cell padding.
    const sectionPairs = root.classList.contains('tablegrid-resume') || root.querySelector('.group\\/table-section')
      ? sections.map((section) => {
        const content = section.node.querySelector('[data-template-section-content="true"]')
        const style = getComputedStyle(content)
        return { key: `${section.key} cell vertical padding`, gap: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) }
      }) : pairs(sections)
    const blockPairs = sections.flatMap((section) => {
      const blocks = Array.from(section.node.querySelectorAll('[data-resume-block]')).filter(visible)
        .map((node, index) => ({ key: `${section.key} block ${index}`, rect: rect(node) }))
      return pairs(blocks)
    })
    const probe = root.querySelector('[data-template-padding-probe="true"]') || root
    const style = getComputedStyle(probe)
    return {
      sectionCount: sections.length,
      sectionPairs,
      blockPairs,
      jobVisible: Array.from(root.querySelectorAll('[data-template-job-intention-trigger="true"]')).some(visible),
      // Full-bleed designs use the content panel's top padding as hero-to-section spacing.
      // Its physical page gutter is represented by left/right/bottom, not that internal gap.
      pagePadding: [style.paddingRight, style.paddingBottom, style.paddingLeft],
      rootWidth: root.offsetWidth,
      horizontalOverflow: root.scrollWidth - root.clientWidth,
    }
  })
}

function auditSeries(series, name, failures) {
  const byScale = new Map(series.map((item) => [item.spacing, item]))
  for (const kind of ['sectionPairs', 'blockPairs']) {
    const basePairs = byScale.get(1).metrics[kind]
    if (kind === 'sectionPairs' && !basePairs.length) failures.push(`${name}: no measurable same-column section pairs`)
    for (const base of basePairs) {
      const zero = byScale.get(0).metrics[kind].find((pair) => pair.key === base.key)
      const large = byScale.get(3).metrics[kind].find((pair) => pair.key === base.key)
      if (!zero || !large) { failures.push(`${name} ${base.key}: pair missing at a spacing boundary`); continue }
      if (zero.gap < -1 || zero.gap > 2.5) failures.push(`${name} ${base.key}: spacing=0 gap=${zero.gap.toFixed(2)}px`)
      if (base.gap - zero.gap <= 0.5 || large.gap - base.gap <= 0.5) failures.push(`${name} ${base.key}: gap does not increase at 0/1/3: ${[zero.gap, base.gap, large.gap].map((n) => n.toFixed(2))}`)
      if (Math.abs((large.gap - zero.gap) - 3 * (base.gap - zero.gap)) > 3) failures.push(`${name} ${base.key}: nonlinear spacing response: ${[zero.gap, base.gap, large.gap].map((n) => n.toFixed(2))}`)
    }
  }
  if (new Set(series.map((item) => JSON.stringify(item.metrics.pagePadding))).size !== 1) failures.push(`${name}: module spacing unexpectedly changes page padding`)
}

async function verifySpacing(page, id, directory) {
  const cases = []
  const failures = []
  for (const viewport of ['pc', 'mobile']) {
    await page.setViewport(viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 1000 })
    for (const job of ['shown', 'hidden']) {
      for (const spacing of [0, 1, 3]) {
        await page.emulateMediaType('screen')
        const url = `${baseUrl}/dev/template-lab?tpl=${id}&fixture=full&spacing=${spacing}&job=${job}&viewport=${viewport}`
        await page.bringToFront()
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        assert.ok(response?.ok(), url)
        await page.waitForSelector('[data-template-lab="ready"] .resume-container', { timeout: 30000 })
        await page.waitForFunction(() => !document.querySelector('[data-template-loading]'))
        await page.evaluate(() => document.fonts.ready)
        for (const media of ['screen', 'print']) {
          await page.emulateMediaType(media)
          const metrics = await readSpacing(page)
          const layoutError = await checkLayout(page, {})
          cases.push({ viewport, job, spacing, media, metrics, layoutError })
          if (metrics.jobVisible !== (job === 'shown')) failures.push(`${viewport} ${media} ${job} spacing=${spacing}: job visibility mismatch`)
          if (metrics.horizontalOverflow > 2) failures.push(`${viewport} ${media} ${job} spacing=${spacing}: horizontal overflow ${metrics.horizontalOverflow}px`)
          if (layoutError) failures.push(`${viewport} ${media} ${job} spacing=${spacing}: ${layoutError}`)
          if (media === 'screen' && spacing !== 1) await page.screenshot({ path: path.join(directory, `${viewport}-${job}-${spacing}.png`), fullPage: true })
        }
      }
      for (const media of ['screen', 'print']) auditSeries(cases.filter((item) => item.viewport === viewport && item.job === job && item.media === media), `${viewport}/${media}/${job}`, failures)
    }
  }
  return { cases, failures: [...new Set(failures)] }
}

async function verifyOnePage(page, id, directory) {
  const cases = []
  const failures = []
  for (const viewport of ['pc', 'mobile']) {
    await page.setViewport(viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 1000 })
    for (const fixture of ['sparse', 'full', 'long']) {
      await page.emulateMediaType('screen')
      await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${id}&fixture=${fixture}&readonly=1`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-scenario-preview] .resume-container')
      await page.evaluate(() => document.fonts.ready)
      const before = await page.$eval('[data-qa-theme]', (node) => JSON.parse(node.dataset.qaTheme))
      await page.click('[data-layout-tab="settings"]')
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button[aria-pressed]')).some((node) => node.textContent.includes('一页模式')))
      await page.evaluate(() => Array.from(document.querySelectorAll('button[aria-pressed]')).find((node) => node.textContent.includes('一页模式')).click())
      await page.waitForFunction(() => ['fit', 'overflow'].includes(document.querySelector('[data-one-page-status]')?.dataset.onePageStatus), { timeout: 30000 })
      const metrics = await page.$eval('[data-one-page-status]', (node) => ({
        status: node.dataset.onePageStatus, forcedOnePage: node.dataset.onePage === 'true', height: node.scrollHeight,
        theme: JSON.parse(node.dataset.qaTheme), text: node.innerText.replace(/\s/g, ''),
      }))
      if (fixture === 'sparse' && metrics.status !== 'fit') failures.push(`${viewport}/${fixture}: sparse resume could not fit`)
      if (metrics.status === 'fit' && metrics.height > 1123) failures.push(`${viewport}/${fixture}: falsely reports fit (${metrics.height}px)`)
      if (metrics.forcedOnePage !== (metrics.status === 'fit')) failures.push(`${viewport}/${fixture}: overflow/fitting content would be clipped`)
      if (metrics.theme.fontSize < 12 || metrics.theme.spacingScale < 0 || metrics.theme.lineHeight < 1.4) failures.push(`${viewport}/${fixture}: readability floor violated`)
      metrics.layoutError = await checkLayout(page, {})
      if (metrics.layoutError) failures.push(`${viewport}/${fixture}: ${metrics.layoutError}`)
      metrics.bodyLineIssues = await page.evaluate(() => Array.from(document.querySelectorAll('.resume-container p, .resume-container li'))
        .filter((node) => node.innerText?.trim() && node.getBoundingClientRect().height > 0)
        .map((node) => ({ text: node.innerText.slice(0, 40), font: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight) }))
        .filter((item) => Number.isFinite(item.line) && item.line < item.font * 1.2 - 0.1))
      if (metrics.bodyLineIssues.length) failures.push(`${viewport}/${fixture}: crowded body line height ${JSON.stringify(metrics.bodyLineIssues.slice(0, 3))}`)
      await page.screenshot({ path: path.join(directory, `${viewport}-${fixture}-one-page.png`), fullPage: true })
      await page.click('[data-qa-export="true"]')
      await page.waitForFunction(() => document.querySelector('[data-qa-export-html]').value.length > 1000)
      const html = await page.$eval('[data-qa-export-html]', (node) => node.value)
      fs.writeFileSync(path.join(directory, `${viewport}-${fixture}-one-page.html`), html)
      const exportPage = await page.browser().newPage()
      try {
        // Never reuse a hydrated app document: its still-running React tree can overwrite setContent.
        await exportPage.goto('about:blank')
        await exportPage.setContent(html.replace('<head>', `<head><base href="${baseUrl}/">`), { waitUntil: 'load' })
        await exportPage.evaluate(() => document.fonts.ready)
        const pdf = Buffer.from(await exportPage.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true }))
        fs.writeFileSync(path.join(directory, `${viewport}-${fixture}-one-page.pdf`), pdf)
        const analysis = await analyzePdf(exportPage, pdf)
        metrics.pdfPages = analysis.pages.map(({ pageNumber, textChars }) => ({ pageNumber, textChars }))
        const pdfText = analysis.pages.map((item) => item.text).join('').replace(/\s/g, '')
        // Every printed character in the source must survive export, including repeated paragraphs.
        // Compare against printable content; editing-only controls are deliberately absent.
        await page.emulateMediaType('print')
        metrics.printText = await page.$eval('[data-one-page-status]', (node) => node.innerText.replace(/\s/g, ''))
        await page.emulateMediaType('screen')
        const missing = [...new Set(metrics.printText)].filter((character) => pdfText.split(character).length < metrics.printText.split(character).length)
        if (missing.length) failures.push(`${viewport}/${fixture}: PDF lost character occurrences: ${missing.slice(0, 20).join('')}`)
        if (metrics.status === 'fit' && analysis.pages.length !== 1) failures.push(`${viewport}/${fixture}: fit exported ${analysis.pages.length} pages`)
        // Print-only floats/gutters may naturally fit overflow screen content on one page.
        // Safety means no forced crop and no lost text, not a minimum PDF page count.
      } finally { await exportPage.close() }
      await page.evaluate(() => Array.from(document.querySelectorAll('button[aria-pressed]')).find((node) => node.textContent.includes('一页模式')).click())
      await page.waitForFunction((expected) => {
        const node = document.querySelector('[data-qa-theme]')
        const theme = JSON.parse(node.dataset.qaTheme)
        return node.dataset.onePageStatus === 'idle' && ['fontSize', 'lineHeight', 'spacingScale'].every((key) => theme[key] === expected[key])
      }, { timeout: 10000 }, before)
      cases.push({ viewport, fixture, ...metrics })
    }
  }
  return { cases, failures }
}

function persist() {
  const sourceUnchanged = sourceSnapshot().digest === initialSource.digest && fs.readFileSync('.next/BUILD_ID', 'utf8').trim() === buildId
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ baseUrl, scope, ids, buildId, sourceDigest: initialSource.digest, sourceUnchanged, complete: results.length === ids.length, allPassed: results.length === ids.length && sourceUnchanged && results.every((r) => r.failures.length === 0), results }, null, 2))
}

try {
  async function worker() {
    // Separate browsers prevent background requestAnimationFrame starvation and shared QA store state.
    const browser = await launchBrowser()
    const page = await browser.newPage()
    try {
      while (nextIndex < ids.length) {
        const id = ids[nextIndex++]
        const directory = path.join(output, id)
        fs.mkdirSync(directory, { recursive: true })
        const startedAt = new Date().toISOString()
        try {
          const spacing = scope !== 'one-page' ? await verifySpacing(page, id, directory) : { cases: [], failures: [] }
          const onePage = scope !== 'spacing' ? await verifyOnePage(page, id, directory) : { cases: [], failures: [] }
          const result = { cases: spacing.cases, onePageCases: onePage.cases, failures: [...spacing.failures, ...onePage.failures] }
          results.push({ id, startedAt, finishedAt: new Date().toISOString(), ...result })
          console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${id}: ${result.cases.length} spacing / ${result.onePageCases.length} one-page cases, ${result.failures.length} failures`)
          for (const message of result.failures.slice(0, 5)) console.log(`  ${message}`)
        } catch (error) {
          results.push({ id, startedAt, finishedAt: new Date().toISOString(), cases: [], failures: [error.stack || String(error)] })
          console.log(`ERROR ${id}: ${error.message}`)
        }
        persist()
      }
    } finally { await browser.close() }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
} finally {
  persist()
}
console.log(`Results: ${path.join(output, 'results.json')}`)
if (results.some((r) => r.failures.length) || sourceSnapshot().digest !== initialSource.digest) process.exitCode = 1
