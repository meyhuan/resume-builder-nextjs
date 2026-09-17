import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000'
const output = path.resolve('test-artifacts/spacing-audit')
fs.mkdirSync(output, { recursive: true })
const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((candidate) => candidate && fs.existsSync(candidate))
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] })
const results = []
const failures = []
const expected = { lanjiao: 32, lanzhe: 42, lanmu: 66, ziji: 34, qingsui: 34, qingyun: 24, mashang: 18, zhumo: 18, xingtan: 20 }
const requested = process.argv.slice(3)
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 1000 })
  for (const [template, baseGap] of Object.entries(expected)) {
    if (requested.length && !requested.includes(template)) continue
    for (const job of ['shown', 'hidden']) {
      for (const scale of [0, 1, 3]) {
        await page.goto(`${baseUrl}/dev/template-lab?tpl=${template}&fixture=full&spacing=${scale}&job=${job}`, { waitUntil: 'networkidle2', timeout: 60000 })
        await page.waitForSelector('[data-template-lab="ready"] .resume-container')
        await page.waitForFunction(() => !document.querySelector('[data-template-loading]'))
        for (const media of ['screen', 'print']) {
          await page.emulateMediaType(media)
          const metrics = await page.evaluate((id) => {
            const root = document.querySelector('.resume-container')
            let hero = root.querySelector('header')
            let first
            if (id === 'lanmu' || id === 'ziji') {
              const panel = root.querySelector(`[data-${id}-panel]`)
              hero = panel.previousElementSibling
              first = panel.firstElementChild
            } else if (id === 'lanzhe') {
              first = root.querySelector('.lanzhe-page-content > main')
            } else if (id === 'qingsui') {
              first = hero.nextElementSibling
            } else if (id === 'lanjiao') {
              first = root.querySelector('.lanjiao-main-flow')
            } else {
              first = root.querySelector('section')
            }
            const style = getComputedStyle(first)
            const probe = root.querySelector('[data-template-padding-probe]') || root
            return {
              gap: first.getBoundingClientRect().top + parseFloat(style.paddingTop) - hero.getBoundingClientRect().bottom,
              sidePadding: [getComputedStyle(probe).paddingLeft, getComputedStyle(probe).paddingRight],
              hasJob: root.textContent.includes('求职意向'),
            }
          }, template)
          results.push({ template, job, scale, media, ...metrics })
          if (metrics.hasJob !== (job === 'shown')) failures.push(`${template} ${job}: job-intention visibility does not match the fixture`)
          if (Math.abs(metrics.gap - baseGap * scale) > 1) failures.push(`${template} ${job} ${scale} ${media}: header gap ${metrics.gap}, expected ${baseGap * scale}`)
        }
        await page.emulateMediaType('screen')
        if (scale <= 1) await (await page.$('.resume-container')).screenshot({ path: path.join(output, `${template}-${job}-${scale}.png`) })
      }
    }
    const sides = results.filter((item) => item.template === template && item.media === 'screen').map((item) => JSON.stringify(item.sidePadding))
    if (new Set(sides).size !== 1) failures.push(`${template}: side page padding changed with spacing/job visibility`)
    console.log(`${template}: checked shown/hidden × 0/1/3 × screen/print`)
  }
  for (const template of ['lanmu', 'ziji'].filter((id) => !requested.length || requested.includes(id))) {
    await page.setViewport({ width: 1500, height: 1000 })
    await page.goto(`${baseUrl}/dev/scenario-loader?tpl=${template}`, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForFunction(() => document.querySelector('[data-scenario-preview]')?.textContent.includes('李小满'))
    const settings = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === '排版设置'))
    await settings.asElement().click()
    const slider = await page.waitForSelector('#spacing-scale [role="slider"]')
    await slider.focus()
    await page.keyboard.press('Home')
    await page.waitForFunction(() => document.querySelector('#spacing-scale [role="slider"]').getAttribute('aria-valuenow') === '0')
    const metrics = await page.evaluate((id) => {
      const root = document.querySelector('.resume-container')
      const panel = root.querySelector(`[data-${id}-panel]`)
      const hero = panel.previousElementSibling
      return {
        gap: panel.firstElementChild.getBoundingClientRect().top - hero.getBoundingClientRect().bottom,
        avatarOverflow: root.querySelector(`.${id}-avatar`).getBoundingClientRect().bottom - hero.getBoundingClientRect().bottom,
        metaOverflow: hero.querySelector('[data-template-base-info-trigger]').getBoundingClientRect().bottom - hero.getBoundingClientRect().bottom,
      }
    }, template)
    results.push({ template, scenario: 'avatar-zero', ...metrics })
    if (Math.abs(metrics.gap) > 1 || metrics.avatarOverflow > 1 || metrics.metaOverflow > 1) failures.push(`${template}: hero content extends into the zero-gap body: ${JSON.stringify(metrics)}`)
    await (await page.$('.resume-container')).screenshot({ path: path.join(output, `${template}-avatar-zero.png`) })
  }
  const suffix = requested.length ? `-${requested.join('-')}` : ''
  fs.writeFileSync(path.join(output, `header-metrics${suffix}.json`), JSON.stringify({ results, failures }, null, 2))
  assert.equal(failures.length, 0, failures.join('\n'))
  console.log('PASS: header gap and page-padding regression')
} finally {
  await browser.close()
}
