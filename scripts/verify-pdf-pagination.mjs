import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const repoRoot = process.cwd()
const paginateSourcePath = path.join(repoRoot, 'src', 'utils', 'paginate-html.ts')
const paginateSource = fs.readFileSync(paginateSourcePath, 'utf8')
const scriptMatch = paginateSource.match(/export function getClientPaginationScript\(\): string \{\s*return `([\s\S]*?)`;\s*\}/)

if (!scriptMatch) {
  throw new Error('Cannot extract getClientPaginationScript() from src/utils/paginate-html.ts')
}

if (!paginateSource.includes('overflow: visible !important')) {
  throw new Error('paginateHtml() must force .page overflow visible for normal PDF export')
}

const paginationScript = scriptMatch[1]
async function resolveBrowserLaunch() {
  const sparticuzPath = await chromium.executablePath()
  if (process.platform !== 'win32' && sparticuzPath && fs.existsSync(sparticuzPath) && fs.statSync(sparticuzPath).isFile()) {
    return {
      engine: '@sparticuz/chromium',
      executablePath: sparticuzPath,
      args: chromium.args,
    }
  }

  const localChromePaths = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean)

  const localChromePath = localChromePaths.find((candidate) => fs.existsSync(candidate))
  if (!localChromePath) {
    throw new Error(`No runnable browser found. Sparticuz path was ${sparticuzPath || 'empty'}; set CHROME_PATH to a local Chrome executable.`)
  }

  return {
    engine: 'local-chrome-fallback',
    executablePath: localChromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
}

const browserLaunch = await resolveBrowserLaunch()
const browser = await puppeteer.launch({
  executablePath: browserLaunch.executablePath,
  args: browserLaunch.args,
  headless: true,
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })

  const longParagraphs = Array.from({ length: 52 }, (_, index) => (
    `<p>Long work experience line ${index + 1}: owns growth strategy, data analysis, cross-team delivery, experiments, and commercial conversion review.</p>`
  )).join('')

  await page.setContent(`<!doctype html>
<html>
  <head>
    <style>
      @page { size: A4; margin: 22mm 0; }
      @page:first { margin-top: 0; }
      body { margin: 0; }
      .page { width: 210mm; overflow: hidden; }
      .page { overflow: visible !important; }
      .resume-container { padding: 22mm 16mm; font: 15px/1.6 Arial, sans-serif; }
      main { display: flex; flex-direction: column; gap: 24px; }
      section { display: flex; flex-direction: column; }
      .short { height: 80px; }
      .long p { margin: 0 0 8px; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="resume-container" data-page-padding-vertical="22">
        <main id="mainFlow">
          <section id="shortSection">
            <div id="shortWrap" data-resume-block-wrapper class="group/block">
              <div id="short" data-resume-block class="short">Short block</div>
            </div>
          </section>
          <section id="longSection">
            <div id="longWrap" data-resume-block-wrapper class="group/block">
              <div id="long" data-resume-block class="long">${longParagraphs}</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </body>
</html>`, { waitUntil: 'load' })

  await page.evaluate(paginationScript)

  const result = await page.evaluate(() => {
    const read = (id) => {
      const el = document.getElementById(id)
      if (!el) return null
      return {
        breakInside: el.getAttribute('data-pdf-break-inside'),
        computedBreakInside: getComputedStyle(el).breakInside,
        height: Math.round(el.getBoundingClientRect().height),
      }
    }
    return {
      pageOverflow: getComputedStyle(document.querySelector('.page')).overflow,
      mainFlow: {
        display: getComputedStyle(document.getElementById('mainFlow')).display,
        normalized: document.getElementById('mainFlow').getAttribute('data-pdf-flow-normalized'),
        firstChildMarginBottom: getComputedStyle(document.getElementById('shortSection')).marginBottom,
      },
      longSection: {
        display: getComputedStyle(document.getElementById('longSection')).display,
        normalized: document.getElementById('longSection').getAttribute('data-pdf-flow-normalized'),
      },
      shortWrap: read('shortWrap'),
      short: read('short'),
      longWrap: read('longWrap'),
      long: read('long'),
    }
  })

  const failures = []
  if (result.pageOverflow !== 'visible') failures.push(`page overflow expected visible, got ${result.pageOverflow}`)
  if (result.mainFlow?.display !== 'block') failures.push(`column flex main expected block for PDF, got ${result.mainFlow?.display}`)
  if (result.mainFlow?.normalized !== 'column-flex') failures.push(`column flex main was not marked normalized`)
  if (parseFloat(result.mainFlow?.firstChildMarginBottom || '0') <= 0) failures.push(`column flex gap was not preserved as child margin`)
  if (result.longSection?.display !== 'block') failures.push(`column flex section expected block for PDF, got ${result.longSection?.display}`)
  if (result.shortWrap?.breakInside !== 'avoid') failures.push(`short wrapper expected avoid, got ${result.shortWrap?.breakInside}`)
  if (result.short?.breakInside !== 'avoid') failures.push(`short inner expected avoid, got ${result.short?.breakInside}`)
  if (result.longWrap?.breakInside !== 'auto') failures.push(`long wrapper expected auto, got ${result.longWrap?.breakInside}`)
  if (result.long?.breakInside !== 'auto') failures.push(`long inner expected auto, got ${result.long?.breakInside}`)

  if (failures.length > 0) {
    console.error(JSON.stringify({ ok: false, engine: browserLaunch.engine, failures, result }, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ ok: true, engine: browserLaunch.engine, result }, null, 2))
  }
} finally {
  await browser.close()
}
