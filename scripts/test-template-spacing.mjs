import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000'
const output = path.resolve('test-artifacts/spacing')
fs.mkdirSync(output, { recursive: true })
const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((candidate) => candidate && fs.existsSync(candidate))
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] })
const results = []
try {
  for (const template of ['elegant', 'simple', 'timeline']) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1500, height: 1000 })
    await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${template}`, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.resume-container section h2')
    const settings = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === '排版设置'))
    await settings.asElement().click()
    const thumb = await page.waitForSelector('#spacing-scale [role="slider"]')
    for (const scale of [0, 1, 3]) {
      await thumb.focus()
      await page.keyboard.press('Home')
      for (let step = 0; step < scale * 10; step++) await page.keyboard.press('ArrowRight')
      await page.waitForFunction((value) => document.querySelector('#spacing-scale [role="slider"]').getAttribute('aria-valuenow') === String(value), {}, scale)
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const metrics = await page.evaluate(() => {
        const root = document.querySelector('.resume-container')
        const sections = [...root.querySelectorAll('section')].filter((section) => section.querySelector('h2') && section.querySelector('[data-resume-block]'))
        const gaps = sections.slice(1).map((section, index) => section.getBoundingClientRect().top - sections[index].getBoundingClientRect().bottom)
        const body = root.querySelector('.resume-body-content') || root
        const header = root.querySelector('header')
        const firstSection = body.querySelector('section')
        return {
          gaps,
          padding: sections.map((section) => [getComputedStyle(section).paddingTop, getComputedStyle(section).paddingBottom]),
          blockPadding: [...root.querySelectorAll('[class~="group/block"]')].map((block) => getComputedStyle(block).paddingBottom),
          contentPadding: [...root.querySelectorAll('[data-resume-block] div[contenteditable], [data-resume-block] div.cursor-text')].map((node) => getComputedStyle(node).paddingBottom),
          bodyPaddingTop: getComputedStyle(body).paddingTop,
          pagePadding: [getComputedStyle(body).paddingLeft, getComputedStyle(body).paddingRight, getComputedStyle(body).paddingBottom],
          headerGap: header && firstSection ? firstSection.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null,
        }
      })
      assert(metrics.gaps.length > 0, `${template}: missing section pairs`)
      const baseGap = template === 'simple' ? 18 : 24
      console.log(template, scale, JSON.stringify(metrics))
      for (const gap of metrics.gaps) assert(Math.abs(gap - baseGap * scale) < 0.6, `${template} scale ${scale}: unexpected gap ${gap}`)
      assert(metrics.padding.flat().every((value) => value === '0px'), `${template}: section padding remains`)
      assert(metrics.blockPadding.every((value) => value === '0px'), `${template}: block tail padding remains`)
      assert(metrics.contentPadding.every((value) => value === '0px'), `${template}: content tail padding remains`)
      if (template === 'elegant') assert(Math.abs(metrics.headerGap - 24 * scale) < 0.6, `elegant scale ${scale}: unexpected header gap ${metrics.headerGap}`)
      results.push({ template, scale, ...metrics })
      if (template === 'elegant') {
        await page.mouse.move(0, 0)
        await (await page.$('.resume-container')).screenshot({ path: path.join(output, `${template}-${scale}.png`) })
        await page.emulateMediaType('print')
        const printGap = await page.evaluate(() => {
          const root = document.querySelector('.elegant-resume-root')
          return root.querySelector('.resume-body-content section').getBoundingClientRect().top - root.querySelector('header').getBoundingClientRect().bottom
        })
        assert(Math.abs(printGap - 24 * scale) < 0.6, `elegant scale ${scale}: unexpected print header gap ${printGap}`)
        results.at(-1).printHeaderGap = printGap
        await page.emulateMediaType('screen')
      }
    }
    const templateResults = results.filter((item) => item.template === template)
    assert.equal(new Set(templateResults.map((item) => JSON.stringify(item.pagePadding))).size, 1, `${template}: module spacing changed side/bottom page padding`)
    if (template !== 'elegant') assert.equal(new Set(templateResults.map((item) => item.bodyPaddingTop)).size, 1, `${template}: module spacing changed page padding`)
    // Section actions are triggered by the actual heading, not the job-intention section.
    const heading = await page.$('section[class~="group/section-edit"] h2')
    await heading.hover()
    await page.waitForSelector('section[class~="group/section-edit"] button[title="删除"]', { visible: true })
    await page.waitForSelector('section[class~="group/section-edit"] button[title="拖动"]', { visible: true })
    await page.close()
  }
  fs.writeFileSync(path.join(output, 'metrics.json'), JSON.stringify(results, null, 2))
  console.log('PASS: 3 templates × 3 spacing values; section gaps, tail padding, and page padding.')
} finally {
  await browser.close()
}
