import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import puppeteer from 'puppeteer'

// Exercise the actual QA function, not a duplicate of its geometry algorithm.
const source = fs.readFileSync(new URL('./verify-template.mjs', import.meta.url), 'utf8')
const parsed = ts.createSourceFile('verify-template.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const declaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'checkGeneralVisualLayout')
assert.ok(declaration, 'Layout QA function must exist')
const checkLayout = vm.runInNewContext(`(${declaration.getText(parsed)})`)
const metricsDeclaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'readThemeMetrics')
assert.ok(metricsDeclaration, 'Theme metrics QA function must exist')
const readMetrics = vm.runInNewContext(`(${metricsDeclaration.getText(parsed)})`)
const baseUrl = process.argv[2] || 'http://127.0.0.1:3012'
const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)
const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
const browser = await puppeteer.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  const response = await page.goto(`${baseUrl}/dev/template-lab?tpl=warm&fixture=full&theme=base&viewport=pc`, { waitUntil: 'networkidle2' })
  assert.ok(response?.ok(), 'Template lab must be accessible')
  await page.waitForSelector('.resume-container')
  assert.equal(await checkLayout(page, {}), '', 'Normal inline label/value wrapping must not be reported as overlap')
  await page.evaluate(() => {
    const scope = document.querySelector('.resume-container')
    scope.style.position = 'relative'
    for (const text of ['重叠探针 A', '重叠探针 B']) {
      const node = document.createElement('span')
      node.textContent = text
      Object.assign(node.style, { position: 'absolute', top: '20px', left: '20px', fontSize: '20px' })
      scope.append(node)
    }
  })
  assert.match(await checkLayout(page, {}), /Visible text overlap detected/, 'Real positioned text collisions must still fail QA')
  console.log('PASS: wrapped inline text accepted; real text collisions rejected by the actual QA function')

  for (const id of ['timeline', 'lanmu']) {
    await page.goto(`${baseUrl}/dev/template-lab?tpl=${id}&fixture=sparse&theme=base&viewport=pc`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.resume-container')
    const punctuation = await page.evaluate(() => Array.from(document.querySelectorAll('.resume-container span')).filter((node) => ['/', '|'].includes(node.innerText?.trim())).map((node) => node.innerText))
    assert.equal(punctuation.length, 0, `${id}: empty education fields must not leave visible separators`)
    console.log(`PASS: ${id} sparse education has no orphan separators`)
  }

  await page.goto(`${baseUrl}/dev/template-lab?tpl=lifeng&fixture=full&theme=base&viewport=pc`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-template-dark-sidebar="true"] h2')
  assert.equal(await checkLayout(page, {}), '', 'Dark sidebar headings must meet contrast checks')
  await page.evaluate(() => { document.querySelector('[data-template-dark-sidebar="true"] h2').style.color = '#7c3aed' })
  assert.match(await checkLayout(page, {}), /insufficient contrast/, 'Original unreadable sidebar heading must be rejected')
  console.log('PASS: dark sidebar contrast passes; original low-contrast color is rejected')

  const metrics = await readMetrics(browser, `${baseUrl}/dev/template-lab?tpl=tablegrid&fixture=full&theme=relaxed&viewport=pc`)
  assert.ok(metrics)
  assert.equal(metrics.wrappedTableLabels.length, 0, 'Large-font short table labels must stay on one line')
  await page.goto(`${baseUrl}/dev/template-lab?tpl=tablegrid&fixture=full&theme=relaxed&viewport=pc`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-tablegrid-header-label="true"]')
  const overflowLabels = await page.evaluate(() => Array.from(document.querySelectorAll('[data-tablegrid-header-label="true"]')).filter((node) => node.textContent.trim().length <= 2).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent))
  assert.equal(overflowLabels.length, 0, 'No nowrap label may overflow its cell')
  console.log('PASS: large-font table labels remain horizontal and within their cells')

  const colorMetrics = await readMetrics(browser, `${baseUrl}/dev/template-lab?tpl=fawujian&fixture=full&theme=color&viewport=pc`)
  assert.ok(colorMetrics?.hasLabPrimaryColor, 'Fawujian must actually render the configured primary color')
  console.log('PASS: fawujian configured color is present in the actual rendered page')
} finally {
  await browser.close()
}
