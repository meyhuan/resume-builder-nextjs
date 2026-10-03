import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.env.TEMPLATE_TEST_URL || 'http://127.0.0.1:3012'
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const expectedPublicIds = [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)]
  .filter(([, , block]) => /editor: true/.test(block) && /catalog: true/.test(block))
  .map(([, id]) => id).sort()
assert.equal(expectedPublicIds.length, 50, 'Release catalog must have exactly 50 public templates')
assert.equal(new Set(expectedPublicIds).size, 50, 'Public template IDs must be unique')
const artifacts = path.resolve('test-artifacts/template-taxonomy')
fs.mkdirSync(artifacts, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const results = []
const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
async function clickText(text) {
  await page.waitForFunction((target) => {
    return Array.from(document.querySelectorAll('[data-template-browser] button')).some((button) => button.textContent.trim().startsWith(target))
  }, { timeout: 20000 }, text)
  const handle = await page.evaluateHandle((target) => {
    const buttons = [...document.querySelectorAll('[data-template-browser] button')]
    return buttons.find((item) => item.textContent.trim().startsWith(target)) ?? null
  }, text)
  const button = handle.asElement()
  assert.ok(button, 'Missing button: ' + text)
  // Server-rendered cards may appear before React hydrates on a busy dev server.
  // Confirm the real control state, not merely that a DOM click was dispatched.
  for (let attempt = 0; attempt < 3; attempt++) {
    await button.click()
    const activated = await page.waitForFunction((target) => {
      const node = Array.from(document.querySelectorAll('[data-template-browser] button')).find((item) => item.textContent.trim().startsWith(target))
      return !node || node.getAttribute('aria-pressed') === 'true'
    }, { timeout: 10000 }, text).then(() => true, () => false)
    if (activated) { await handle.dispose(); return }
  }
  await handle.dispose()
  assert.fail('Control did not activate: ' + text)
}
async function count(expected) {
  await page.waitForFunction(() => document.querySelectorAll('[data-template-browser] [data-template-id]').length > 0, { timeout: 60000 })
  await page.waitForFunction((n) => document.querySelectorAll('[data-template-browser] [data-template-id]').length === n, { timeout: 60000 }, expected)
  if (expected === 50) {
    const actualIds = await page.$$eval('[data-template-browser] [data-template-id]', (nodes) => nodes.map((node) => node.dataset.templateId).sort())
    assert.deepEqual(actualIds, expectedPublicIds, 'Rendered public IDs differ from metadata')
  }
}
async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow')
}
try {
  await page.setViewport({ width: 1440, height: 1000 })
  await page.goto(baseUrl + '/templates', { waitUntil: 'networkidle2', timeout: 120000 })
  await count(50)
  await clickText('英文简历')
  await count(1)
  assert.equal(await page.$eval('[data-template-id]', (el) => el.getAttribute('data-template-id')), 'moxu')
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-template-id="moxu"] img')
    return image?.complete && image.naturalWidth > 0
  })
  await page.screenshot({ path: path.join(artifacts, 'desktop-english.png') })
  await clickText('清除筛选')
  await count(50)
  results.push('PASS: exact 50 public IDs match metadata; English quick filter and reset')
  await page.setViewport({ width: 390, height: 844, isMobile: true })
  await noOverflow()
  await page.screenshot({ path: path.join(artifacts, 'mobile-catalog.png') })
  results.push('PASS: mobile public catalog has no horizontal overflow')
  await page.goto(baseUrl + '/m', { waitUntil: 'networkidle2', timeout: 120000 })
  await count(50)
  await clickText('英文简历')
  await count(1)
  await page.$eval('[data-template-browser]', (el) => el.scrollIntoView())
  await noOverflow()
  await page.screenshot({ path: path.join(artifacts, 'mobile-home.png') })
  results.push('PASS: mobile home uses the same public set and shared filters')
  await page.setViewport({ width: 1440, height: 1000 })
  await page.goto(baseUrl + '/dev/scenario-loader?tpl=qingning&scenario=full', { waitUntil: 'networkidle2', timeout: 120000 })
  await page.waitForSelector('[data-scenario-preview] .resume-container', { timeout: 60000 })
  await count(50)
  const before = await page.$eval('[data-scenario-preview]', (el) => el.textContent)
  await clickText('英文简历')
  await count(1)
  assert.equal(await page.$eval('[data-scenario-preview]', (el) => el.textContent), before, 'Filtering changed resume')
  await page.click('[data-template-id="moxu"]')
  await page.waitForFunction(() => document.querySelector('[data-template-id="moxu"]')?.getAttribute('aria-pressed') === 'true')
  await clickText('清除筛选')
  await count(50)
  await page.click('[data-template-id="qingning"]')
  await page.waitForFunction(() => document.querySelector('[data-template-id="qingning"]')?.getAttribute('aria-pressed') === 'true')
  await page.waitForFunction((text) => document.querySelector('[data-scenario-preview]')?.textContent === text, {}, before)
  await page.$eval('[data-template-browser]', (el) => el.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: path.join(artifacts, 'editor-filter-switch.png') })
  results.push('PASS: editor filters preserve content; switching away/back restores same preview content')
  assert.deepEqual(errors, [], 'Uncaught browser errors')
} finally {
  fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ baseUrl, results, errors }, null, 2))
  await browser.close()
}
console.log(results.join('\n'))
