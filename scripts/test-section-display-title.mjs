import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import sharp from 'sharp'

const baseUrl = process.env.DISPLAY_TITLE_QA_URL || 'http://127.0.0.1:3013'
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...fs.readFileSync('src/templates/template-loader.ts', 'utf8').matchAll(/import\('@\/templates\/([^']+)'\)/g)].map((m) => m[1])
const output = 'test-artifacts/display-title'
fs.mkdirSync(`${output}/after`, { recursive: true })
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const results = process.argv.slice(2).length && fs.existsSync(`${output}/browser-results.json`)
  ? JSON.parse(fs.readFileSync(`${output}/browser-results.json`, 'utf8')).filter((result) => !ids.includes(result.id)) : []
try {
  for (const id of ids) {
    const result = { id, errors: [] }
    const page = await browser.newPage()
    page.on('pageerror', (error) => result.errors.push(error.message))
    try {
      await page.setViewport({ width: 1200, height: 1500 })
      await page.goto(`${baseUrl}/dev/template-lab?tpl=${id}`, { waitUntil: 'networkidle0', timeout: 120000 })
      const preview = await page.waitForSelector('.resume-container', { timeout: 60000 })
      await page.evaluate(() => document.fonts.ready)
      const after = `${output}/after/${id}.png`
      await preview.screenshot({ path: after })
      const before = `${output}/before/${id}.png`
      if (fs.existsSync(before)) {
        const a = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const b = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        result.baselineSameSize = a.info.width === b.info.width && a.info.height === b.info.height
        result.baselineExact = result.baselineSameSize && a.data.equals(b.data)
        if (result.baselineSameSize) {
          let changed = 0
          for (let i = 0; i < a.data.length; i += 4) if ([0, 1, 2].some((k) => Math.abs(a.data[i + k] - b.data[i + k]) > 8)) changed++
          result.changedPixelRatio = changed / (a.info.width * a.info.height)
        }
      }
      await page.setViewport({ width: 1600, height: 1600 })
      await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${id}&scenario=display-titles`, { waitUntil: 'networkidle0', timeout: 120000 })
      await page.waitForSelector('[data-section-display-title]', { timeout: 60000 })
      await page.waitForFunction(() => [...document.querySelectorAll('[data-section-display-title]')].some((node) => node.textContent === '职业履历'))
      const names = await page.$$eval('[data-section-display-title]', (nodes) => nodes.map((node) => node.textContent))
      result.names = names
      const first = await page.$('[data-section-title-editable="true"]')
      await first.click()
      const input = await page.waitForSelector('input[aria-label="模块名称"]')
      await input.click({ clickCount: 3 })
      await input.type('QA Career History')
      await input.press('Enter')
      await page.waitForFunction(() => [...document.querySelectorAll('[data-section-display-title]')].some((node) => node.textContent === 'QA Career History'))
      result.renameCount = await page.$$eval('[data-section-display-title]', (nodes) => nodes.filter((node) => node.textContent === 'QA Career History').length)
      if (result.renameCount !== 1) result.errors.push('Rename changed more than one section')
      if (id !== 'lanxin') {
        const other = id === 'simple' ? 'tablegrid' : 'simple'
        for (const target of [other, id]) {
          await page.click(`[data-template-id="${target}"]`)
          await page.waitForSelector(`[data-scenario-active-template="${target}"]`)
          await page.waitForFunction(() => [...document.querySelectorAll('[data-section-display-title]')].some((node) => node.textContent === 'QA Career History'))
        }
        result.templateSwitchPreserved = true
      }
      result.overflow = await page.$$eval('[data-section-display-title]', (nodes) => nodes.flatMap((node) => {
        const box = node.getBoundingClientRect()
        const range = document.createRange(); range.selectNodeContents(node)
        const text = range.getBoundingClientRect()
        const root = node.closest('.resume-container')?.getBoundingClientRect()
        const heading = node.closest('h2, h3')?.getBoundingClientRect()
        return (text.bottom > box.bottom + 3 || text.right > box.right + 3 || (root && text.right > root.right + 3) || (heading && (text.bottom > heading.bottom + 3 || text.top < heading.top - 3)))
          ? [{ title: node.textContent, height: box.height, textHeight: text.height, right: text.right - box.right }] : []
      }))
      await page.mouse.move(0, 0)
      await (await page.$('[data-scenario-preview]')).screenshot({ path: `${output}/${id}-renamed.png` })
      await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${id}&scenario=display-titles&readonly=1`, { waitUntil: 'networkidle0', timeout: 120000 })
      await page.waitForFunction(() => [...document.querySelectorAll('[data-section-display-title]')].some((node) => node.textContent === '职业履历'))
      result.readonlyNames = await page.$$eval('[data-section-display-title]', (nodes) => nodes.map((node) => node.textContent))
      if (JSON.stringify(result.readonlyNames) !== JSON.stringify(names)) result.errors.push('Readonly names differ from editor')
      result.readonlyControls = await page.$$eval('[data-scenario-preview] input[aria-label="模块名称"], [data-scenario-preview] [data-section-title-editable="true"]', (nodes) => nodes.length)
      if (result.readonlyControls) result.errors.push('Readonly preview exposes title editing')
      if (['simple', 'tablegrid', 'lanmu', 'lanying'].includes(id)) {
        await page.emulateMediaType('print')
        await page.addStyleTag({ content: 'body { margin:0!important } main { padding:0!important } main > div:first-child, aside { display:none!important } main > div:nth-child(2) { display:block!important } main section { padding:0!important; border:0!important; overflow:visible!important } [data-scenario-preview] { margin:0!important; box-shadow:none!important }' })
        await page.pdf({ path: `${output}/${id}-renamed.pdf`, format: 'A4', printBackground: true })
      }
    } catch (error) { result.errors.push(error.message) }
    finally { await page.close() }
    results.push(result)
    console.log(JSON.stringify(result))
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2))
  }
} finally { await browser.close() }
if (results.some((result) => result.errors.length || result.overflow?.length)) process.exitCode = 1
