#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const templateLoaderPath = path.join(root, 'src', 'templates', 'template-loader.ts')
const publicDir = path.join(root, 'public')
const artifactRoot = path.join(root, 'test-artifacts', 'templates')
const LOCAL_FIXTURES = ['full', 'sparse', 'long', 'rich']

const args = parseArgs(process.argv.slice(2))
const templateId = args._[0]

if ((!templateId && !args.all) || args.help) {
  printUsage()
  process.exit(templateId || args.all ? 0 : 1)
}

const results = []

function pass(name, details = '') {
  results.push({ status: 'PASS', name, details })
}

function fail(name, details = '') {
  results.push({ status: 'FAIL', name, details })
}

function warn(name, details = '') {
  results.push({ status: 'WARN', name, details })
}

async function main() {
  const templateIds = args.all ? getRegisteredTemplateIds() : [templateId]
  const registries = new Map()

  for (const id of templateIds) {
    registries.set(id, runStaticChecks(id))
  }

  if (args.typecheck) {
    runCommandCheck('TypeScript', commandCandidates('tsc', ['--noEmit'], ['pnpm', ['exec', 'tsc', '--noEmit']], ['npx', ['tsc', '--noEmit']]))
  }

  if (args.build) {
    runCommandCheck('Next build', commandCandidates('next', ['build'], ['pnpm', ['build']], ['npm', ['run', 'build']]))
  }

  if (args.local) {
    await runLocalChecks(templateIds, registries)
  } else if (args['base-url'] || args['mobile-url'] || args['pc-url'] || args['print-url']) {
    if (args.all) {
      warn('Runtime scenarios', 'Skipped for --all. Runtime verification needs one concrete template and representative resume.')
    } else {
      await runRuntimeChecks(templateId, registries.get(templateId))
    }
  } else {
    warn('Runtime scenarios', 'Skipped. Pass --local for fixture-based local checks, or --base-url and --resume-id for DB/export checks.')
  }

  if (args['scenario-loader-url']) {
    await checkEditorScenarioLoader(args['scenario-loader-url'])
  } else if (args['editor-url']) {
    await checkEditorScenarioLoader(args['editor-url'])
  }

  printSummary()
  const failed = results.some((r) => r.status === 'FAIL')
  process.exit(failed ? 1 : 0)
}

function runStaticChecks(id) {
  if (!fs.existsSync(templateLoaderPath)) {
    fail('Template registry', `Missing ${relative(templateLoaderPath)}`)
    return null
  }

  const source = fs.readFileSync(templateLoaderPath, 'utf8')
  const entry = extractRegistryEntry(source, id)
  if (!entry) {
    fail('Template registry', `TEMPLATE_REGISTRY does not contain "${id}".`)
    return null
  }

  pass('Template registry', `Found ${id}.`)

  const idValue = matchStringProp(entry, 'id')
  if (idValue === id) pass('Registry id', `id: "${id}"`)
  else fail('Registry id', `Expected id "${id}", got ${idValue || 'missing'}.`)

  for (const prop of ['name', 'description']) {
    const value = matchStringProp(entry, prop)
    if (value && value.trim()) pass(`Registry ${prop}`, value)
    else fail(`Registry ${prop}`, `Missing non-empty ${prop}.`)
  }

  const tags = matchArrayProp(entry, 'tags')
  if (tags.length > 0) pass('Registry tags', tags.join(', '))
  else warn('Registry tags', 'No tags found. Template panels and catalog filtering may be weaker.')

  const importPath = matchLazyImportPath(entry)
  if (importPath === `@/templates/${id}`) {
    pass('Lazy import', importPath)
  } else {
    fail('Lazy import', `Expected lazy import "@/templates/${id}", got ${importPath || 'missing'}.`)
  }

  const preview = matchStringProp(entry, 'preview')
  if (!preview) {
    fail('Preview asset', 'Missing preview path.')
  } else {
    const previewPath = path.join(publicDir, preview.replace(/^\/+/, ''))
    if (fs.existsSync(previewPath)) pass('Preview asset', preview)
    else fail('Preview asset', `Missing file ${relative(previewPath)}.`)
  }

  const locksPrimaryColor = /\blocksPrimaryColor\s*:\s*true\b/.test(entry)
  const recommendedPrimaryColor = matchStringProp(entry, 'recommendedPrimaryColor')
  if (locksPrimaryColor && !recommendedPrimaryColor) {
    fail('Theme contract', 'locksPrimaryColor is true but recommendedPrimaryColor is missing.')
  } else if (recommendedPrimaryColor && !/^#[0-9a-fA-F]{6}$/.test(recommendedPrimaryColor)) {
    fail('Theme contract', `recommendedPrimaryColor must be a 6-digit hex color, got ${recommendedPrimaryColor}.`)
  } else {
    pass('Theme contract', locksPrimaryColor ? `Locked ${recommendedPrimaryColor}` : 'Primary color is configurable.')
  }

  const templateDir = path.join(root, 'src', 'templates', id)
  const indexPath = path.join(templateDir, 'index.tsx')
  if (fs.existsSync(indexPath)) {
    pass('Template entry file', relative(indexPath))
    const indexSource = fs.readFileSync(indexPath, 'utf8')
    if (/export\s+default\s+/.test(indexSource)) pass('Default export', 'Found default export.')
    else fail('Default export', 'Template index.tsx must default-export the component.')

    if (/\bresume\b/.test(indexSource)) pass('Resume data usage', 'Template references resume data.')
    else warn('Resume data usage', 'No "resume" reference found in index.tsx.')

    if (/\btheme\b/.test(indexSource)) pass('Theme usage', 'Template references theme tokens.')
    else warn('Theme usage', 'No "theme" reference found in index.tsx.')

    if (/window\.|document\./.test(indexSource) && !/useEffect\s*\(/.test(indexSource)) {
      warn('SSR safety', 'Found window/document usage without an obvious useEffect guard.')
    } else {
      pass('SSR safety', 'No obvious unguarded browser global usage.')
    }
  } else {
    fail('Template entry file', `Missing ${relative(indexPath)}.`)
  }

  return { entry, preview, locksPrimaryColor, recommendedPrimaryColor }
}

function getRegisteredTemplateIds() {
  if (!fs.existsSync(templateLoaderPath)) {
    fail('Template registry', `Missing ${relative(templateLoaderPath)}`)
    return []
  }
  const source = fs.readFileSync(templateLoaderPath, 'utf8')
  const registryStart = source.indexOf('export const TEMPLATE_REGISTRY')
  if (registryStart < 0) {
    fail('Template registry', 'Cannot find TEMPLATE_REGISTRY declaration.')
    return []
  }
  const registrySource = source.slice(registryStart)
  const ids = [...registrySource.matchAll(/\n\s{2}([a-zA-Z0-9_-]+)\s*:\s*\{/g)].map((m) => m[1])
  if (ids.length === 0) {
    fail('Template registry', 'No template ids found.')
  } else {
    pass('Template registry count', `${ids.length} templates: ${ids.join(', ')}`)
  }
  return ids
}

async function runRuntimeChecks(id, registry) {
  let puppeteer
  try {
    puppeteer = await import('puppeteer')
  } catch (error) {
    fail('Runtime dependency', `Cannot import puppeteer: ${error.message}`)
    return
  }

  const artifactDir = path.join(artifactRoot, id)
  fs.mkdirSync(artifactDir, { recursive: true })

  const baseUrl = stripTrailingSlash(args['base-url'] || '')
  const resumeId = args['resume-id']
  const mobileUrl = args['mobile-url'] || (baseUrl && resumeId ? `${baseUrl}/m/preview?id=${encodeURIComponent(resumeId)}&tpl=${encodeURIComponent(id)}` : '')
  const pcUrl = args['pc-url'] || ''
  const printUrl = args['print-url'] || buildPrintUrl(baseUrl, resumeId, id)

  if (baseUrl) {
    await checkTemplateApi(baseUrl, id)
  }

  const browser = await launchBrowser(puppeteer)

  try {
    if (pcUrl) {
      await checkPage(browser, {
        name: 'PC web scenario',
        url: pcUrl,
        viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'pc.png'),
        templateId: id,
        requireTemplateMarker: false,
      })
    } else {
      warn('PC web scenario', 'Skipped. Pass --pc-url for an authenticated editor/template page.')
    }

    if (mobileUrl) {
      await checkPage(browser, {
        name: 'Mobile preview scenario',
        url: mobileUrl,
        viewport: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
        screenshot: path.join(artifactDir, 'mobile-preview.png'),
        templateId: id,
        requireTemplateMarker: false,
        checkHorizontalOverflow: true,
      })
    } else {
      warn('Mobile preview scenario', 'Skipped. Pass --base-url and --resume-id, or --mobile-url.')
    }

    if (printUrl) {
      await checkPage(browser, {
        name: 'Print/export scenario',
        url: printUrl,
        viewport: { width: 900, height: 1300, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'print.png'),
        templateId: id,
        requireTemplateMarker: true,
        waitForPrintReady: true,
      })
    } else {
      warn('Print/export scenario', 'Skipped. Pass --base-url, --resume-id, and PRINT_TOKEN_SECRET/IMPORT_SECRET, or --print-url.')
    }
  } finally {
    await browser.close()
  }

  if (registry) pass('Runtime artifacts', relative(artifactDir))
}

async function runLocalChecks(templateIds, registries) {
  let puppeteer
  try {
    puppeteer = await import('puppeteer')
  } catch (error) {
    fail('Local dependency', `Cannot import puppeteer: ${error.message}`)
    return
  }

  const baseUrl = stripTrailingSlash(args['base-url'] || 'http://localhost:3000')
  const browser = await launchBrowser(puppeteer)

  try {
    for (const id of templateIds) {
      const registry = registries.get(id)
      const artifactDir = path.join(artifactRoot, id)
      fs.mkdirSync(artifactDir, { recursive: true })

      await checkLocalPage(browser, {
        name: `Local PC full (${id})`,
        url: labUrl(baseUrl, id, 'full', 'base', 'pc'),
        viewport: { width: 1280, height: 1400, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-pc-full.png'),
        expectedText: '林知夏',
      })

      await checkLocalPage(browser, {
        name: `Local mobile full (${id})`,
        url: labUrl(baseUrl, id, 'full', 'base', 'mobile'),
        viewport: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
        screenshot: path.join(artifactDir, 'local-mobile-full.png'),
        expectedText: '林知夏',
        checkHorizontalOverflow: true,
      })

      await checkLocalPage(browser, {
        name: `Local sparse data (${id})`,
        url: labUrl(baseUrl, id, 'sparse', 'base', 'pc'),
        viewport: { width: 1280, height: 1000, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-sparse.png'),
        expectedText: '陈一',
      })

      await checkLocalPage(browser, {
        name: `Local long data (${id})`,
        url: labUrl(baseUrl, id, 'long', 'compact', 'pc'),
        viewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-long.png'),
        expectedText: '欧阳承远',
      })

      await checkLocalPage(browser, {
        name: `Local rich text (${id})`,
        url: labUrl(baseUrl, id, 'rich', 'base', 'pc'),
        viewport: { width: 1280, height: 1200, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-rich.png'),
        expectedText: '加粗重点',
        checkRichText: true,
      })

      await checkThemeControls(browser, baseUrl, id, registry, artifactDir)
      pass(`Local artifacts (${id})`, relative(artifactDir))
    }
  } finally {
    await browser.close()
  }
}

async function launchBrowser(puppeteer) {
  const executablePath = findBrowserExecutable()
  return puppeteer.default.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

function findBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean)

  if (process.platform === 'win32') {
    const roots = [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.LOCALAPPDATA,
    ].filter(Boolean)
    for (const base of roots) {
      candidates.push(
        path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      )
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge',
    )
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate))
}

function labUrl(baseUrl, templateId, fixture, theme, viewport) {
  const params = new URLSearchParams({ tpl: templateId, fixture, theme, viewport })
  return `${baseUrl}/dev/template-lab?${params.toString()}`
}

async function checkLocalPage(browser, options) {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  try {
    await page.setViewport(options.viewport)
    const response = await page.goto(options.url, { waitUntil: 'networkidle2', timeout: 60_000 })
    if (!response || !response.ok()) {
      fail(options.name, `${options.url} returned HTTP ${response ? response.status() : 'no response'}. Is the dev server running?`)
      return
    }

    await page.waitForSelector('[data-template-lab="ready"] [data-template-root="true"] .resume-container', { timeout: 20_000 })
    await page.waitForFunction((expected) => document.body.innerText.includes(expected), { timeout: 10_000 }, options.expectedText)

    const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length)
    if (bodyTextLength < 20) {
      fail(options.name, 'Rendered page appears blank or nearly blank.')
      return
    }

    if (options.checkHorizontalOverflow) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 4) {
        fail(options.name, `Horizontal overflow detected: ${overflow}px.`)
        return
      }
    }

    if (options.checkRichText) {
      const richText = await page.evaluate(() => {
        const root = document.querySelector('[data-template-root="true"]')
        return {
          strong: Boolean(root?.querySelector('strong')),
          list: Boolean(root?.querySelector('ul li, ol li')),
          link: Boolean(root?.querySelector('a[href]')),
        }
      })
      if (!richText.strong || !richText.list || !richText.link) {
        fail(options.name, `Rich text missing expected nodes: ${JSON.stringify(richText)}.`)
        return
      }
    }

    await page.screenshot({ path: options.screenshot, fullPage: true })

    if (pageErrors.length > 0) {
      fail(options.name, `Page errors: ${pageErrors.slice(0, 3).join(' | ')}`)
    } else if (consoleErrors.length > 0) {
      warn(options.name, `Console errors observed; screenshot saved to ${relative(options.screenshot)}.`)
    } else {
      pass(options.name, `Screenshot saved to ${relative(options.screenshot)}.`)
    }
  } catch (error) {
    fail(options.name, error.message)
  } finally {
    await page.close()
  }
}

async function checkThemeControls(browser, baseUrl, id, registry, artifactDir) {
  const baseMetrics = await readThemeMetrics(browser, labUrl(baseUrl, id, 'full', 'base', 'pc'))
  const relaxedMetrics = await readThemeMetrics(browser, labUrl(baseUrl, id, 'full', 'relaxed', 'pc'))

  if (!baseMetrics || !relaxedMetrics) {
    fail(`Theme settings (${id})`, 'Unable to read theme metrics from template lab.')
    return
  }

  const changed = [
    relaxedMetrics.fontSize > baseMetrics.fontSize,
    relaxedMetrics.lineHeight > baseMetrics.lineHeight,
    relaxedMetrics.paddingTop > baseMetrics.paddingTop,
    relaxedMetrics.paddingLeft > baseMetrics.paddingLeft,
    relaxedMetrics.headingFontSize > baseMetrics.headingFontSize,
    relaxedMetrics.paragraphIndent > baseMetrics.paragraphIndent,
  ]

  if (changed.every(Boolean)) {
    pass(`Theme settings (${id})`, 'Font size, line height, padding, title scale, and paragraph indent respond to theme changes.')
  } else {
    fail(`Theme settings (${id})`, `Theme metrics did not all change as expected: ${JSON.stringify({ baseMetrics, relaxedMetrics })}`)
  }

  const colorMetrics = await readThemeMetrics(browser, labUrl(baseUrl, id, 'full', 'color', 'pc'), path.join(artifactDir, 'local-color.png'))
  if (!colorMetrics) {
    fail(`Primary color (${id})`, 'Unable to read color theme metrics.')
    return
  }

  const locked = Boolean(registry?.locksPrimaryColor)
  if (locked) {
    if (colorMetrics.hasLabPrimaryColor) {
      fail(`Primary color (${id})`, 'Template is registered as locked but rendered the lab primary color.')
    } else {
      pass(`Primary color (${id})`, 'Locked template did not render the lab primary color.')
    }
  } else if (colorMetrics.hasLabPrimaryColor) {
    pass(`Primary color (${id})`, 'Configurable template rendered the lab primary color.')
  } else {
    fail(`Primary color (${id})`, 'Configurable template did not expose the lab primary color in text, border, or background styles.')
  }
}

async function checkEditorScenarioLoader(editorUrl) {
  let puppeteer
  try {
    puppeteer = await import('puppeteer')
  } catch (error) {
    fail('Editor scenario loader', `Cannot import puppeteer: ${error.message}`)
    return
  }

  const browser = await launchBrowser(puppeteer)
  const page = await browser.newPage()
  const artifactDir = path.join(artifactRoot, 'editor-scenarios')
  fs.mkdirSync(artifactDir, { recursive: true })

  page.on('dialog', async (dialog) => {
    await dialog.accept()
  })

  try {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 })
    const response = await page.goto(editorUrl, { waitUntil: 'networkidle2', timeout: 60_000 })
    if (!response || !response.ok()) {
      fail('Editor scenario loader', `${editorUrl} returned HTTP ${response ? response.status() : 'no response'}.`)
      return
    }

    await page.waitForFunction(() => document.body.innerText.includes('排版美化'), { timeout: 20_000 })
    await clickByTextIfPresent(page, '排版美化', ['button', '[role="tab"]'])
    await sleep(300)
    await clickByText(page, '排版设置', ['button', '[role="tab"]'])

    await page.waitForFunction(() => document.body.innerText.includes('模板测试数据'), { timeout: 10_000 })

    const selectChanged = await page.evaluate(() => {
      const select = Array.from(document.querySelectorAll('select')).find((node) =>
        Array.from(node.options).some((option) => option.value === 'long-content')
      )
      if (!select) return false
      select.value = 'long-content'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })
    if (!selectChanged) {
      fail('Editor scenario loader', 'Cannot find template test data scenario select.')
      return
    }

    await clickByText(page, '加载场景数据', ['button'])
    await page.waitForFunction(() => document.body.innerText.includes('欧阳晨曦'), { timeout: 10_000 })

    const verification = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        hasName: text.includes('欧阳晨曦'),
        hasPosition: text.includes('高级增长产品经理'),
        hasSalary: text.includes('35k-50k'),
        hasLongCompany: text.includes('北京云启未来智能科技股份有限公司商业化增长产品中心'),
        hasProject: text.includes('企业版商业化线索评分与试用转化系统'),
        hasCustomField: text.includes('期望工作模式'),
      }
    })

    const missing = Object.entries(verification)
      .filter(([, value]) => !value)
      .map(([key]) => key)
    if (missing.length > 0) {
      fail('Editor scenario loader', `Scenario loaded but expected fields are missing: ${missing.join(', ')}.`)
      return
    }

    const screenshotPath = path.join(artifactDir, 'long-content-loaded.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    pass('Editor scenario loader', `Loaded long-content scenario and verified rendered fields. Screenshot saved to ${relative(screenshotPath)}.`)
  } catch (error) {
    fail('Editor scenario loader', error.message)
  } finally {
    await page.close()
    await browser.close()
  }
}

async function clickByText(page, text, selectors) {
  const handle = await findElementByText(page, text, selectors)
  if (!handle) throw new Error(`Cannot find clickable text: ${text}`)
  await handle.click()
  await handle.dispose()
}

async function clickByTextIfPresent(page, text, selectors) {
  const handle = await findElementByText(page, text, selectors)
  if (!handle) return
  await handle.click()
  await handle.dispose()
}

async function findElementByText(page, text, selectors) {
  for (const selector of selectors) {
    const handles = await page.$$(selector)
    for (const handle of handles) {
      const matches = await handle.evaluate((node, targetText) => node.textContent?.includes(targetText) ?? false, text)
      if (matches) return handle
      await handle.dispose()
    }
  }
  return null
}

async function readThemeMetrics(browser, url, screenshot) {
  const page = await browser.newPage()
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
    if (!response || !response.ok()) return null
    await page.waitForSelector('[data-template-lab="ready"] [data-template-root="true"] .resume-container', { timeout: 20_000 })
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-template-root="true"]')
      const container = root?.querySelector('.resume-container')
      const heading = root?.querySelector('h2')
      const paragraph = root?.querySelector('p')
      if (!root || !container) return null
      const containerStyle = getComputedStyle(container)
      const headingStyle = heading ? getComputedStyle(heading) : null
      const paragraphStyle = paragraph ? getComputedStyle(paragraph) : null
      const paddingTargets = [container, ...Array.from(container.children)]
      const paddingTop = Math.max(...paddingTargets.map((node) => parseFloat(getComputedStyle(node).paddingTop) || 0))
      const paddingLeft = Math.max(...paddingTargets.map((node) => parseFloat(getComputedStyle(node).paddingLeft) || 0))
      const labPrimary = 'rgb(219, 39, 119)'
      const hasLabPrimaryColor = Array.from(root.querySelectorAll('*')).some((node) => {
        const style = getComputedStyle(node)
        return style.color === labPrimary || style.backgroundColor === labPrimary || style.borderColor === labPrimary
      })
      return {
        fontSize: parseFloat(containerStyle.fontSize),
        lineHeight: parseFloat(containerStyle.lineHeight),
        paddingTop,
        paddingLeft,
        headingFontSize: headingStyle ? parseFloat(headingStyle.fontSize) : 0,
        paragraphIndent: paragraphStyle ? parseFloat(paragraphStyle.textIndent) : 0,
        hasLabPrimaryColor,
      }
    })
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: true })
    return metrics
  } finally {
    await page.close()
  }
}

async function checkTemplateApi(baseUrl, id) {
  const url = `${baseUrl}/next-api/templates`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      fail('Template API scenario', `${url} returned HTTP ${res.status}.`)
      return
    }
    const templates = await res.json()
    if (Array.isArray(templates) && templates.some((t) => t.id === id)) {
      pass('Template API scenario', `/next-api/templates includes ${id}.`)
    } else {
      fail('Template API scenario', `/next-api/templates does not include ${id}.`)
    }
  } catch (error) {
    fail('Template API scenario', error.message)
  }
}

async function checkPage(browser, options) {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  try {
    await page.setViewport(options.viewport)
    const response = await page.goto(options.url, { waitUntil: 'networkidle2', timeout: 60_000 })
    if (!response || !response.ok()) {
      fail(options.name, `${options.url} returned HTTP ${response ? response.status() : 'no response'}.`)
      return
    }

    if (options.waitForPrintReady) {
      await page.waitForSelector('[data-print-ready="1"]', { timeout: 20_000 })
    }

    if (options.requireTemplateMarker) {
      const marker = await page.$eval('[data-print-template]', (node) => node.getAttribute('data-print-template')).catch(() => null)
      if (marker !== options.templateId) {
        fail(options.name, `Expected data-print-template="${options.templateId}", got ${marker || 'missing'}.`)
        return
      }
    }

    const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length)
    if (bodyTextLength < 20) {
      fail(options.name, 'Rendered page appears blank or nearly blank.')
      return
    }

    if (options.checkHorizontalOverflow) {
      const overflow = await page.evaluate(() => {
        const root = document.documentElement
        return root.scrollWidth - root.clientWidth
      })
      if (overflow > 4) {
        fail(options.name, `Horizontal overflow detected: ${overflow}px.`)
        return
      }
    }

    if (options.templateId === 'tablegrid') {
      const tableGridIssue = await checkTableGridLayout(page)
      if (tableGridIssue) {
        fail(options.name, tableGridIssue)
        return
      }
    }

    await page.screenshot({ path: options.screenshot, fullPage: true })

    if (pageErrors.length > 0) {
      fail(options.name, `Page errors: ${pageErrors.slice(0, 3).join(' | ')}`)
    } else if (consoleErrors.length > 0) {
      warn(options.name, `Console errors observed; screenshot saved to ${relative(options.screenshot)}.`)
    } else {
      pass(options.name, `Screenshot saved to ${relative(options.screenshot)}.`)
    }
  } catch (error) {
    fail(options.name, error.message)
  } finally {
    await page.close()
  }
}

async function checkTableGridLayout(page) {
  return page.evaluate(() => {
    const emailCell = document.querySelector('[data-tablegrid-header-value="email"]')
    const emailContent = emailCell?.firstElementChild
    if (emailCell && emailContent) {
      const cellRect = emailCell.getBoundingClientRect()
      const contentRect = emailContent.getBoundingClientRect()
      if (contentRect.right - cellRect.right > 1 || contentRect.bottom - cellRect.bottom > 1) {
        return `TableGrid email content overflows its cell by ${Math.ceil(Math.max(contentRect.right - cellRect.right, contentRect.bottom - cellRect.bottom))}px.`
      }
    }

    const avatarCell = document.querySelector('[data-tablegrid-avatar-cell="true"]')
    const avatarSlot = avatarCell?.firstElementChild
    if (avatarCell && avatarSlot) {
      const cellRect = avatarCell.getBoundingClientRect()
      const slotRect = avatarSlot.getBoundingClientRect()
      if (Math.abs(slotRect.height - cellRect.height) > 1 || Math.abs(slotRect.width - cellRect.width) > 1) {
        return `TableGrid avatar slot does not fill its cell: slot ${Math.round(slotRect.width)}x${Math.round(slotRect.height)}, cell ${Math.round(cellRect.width)}x${Math.round(cellRect.height)}.`
      }
    }

    return ''
  })
}

function buildPrintUrl(baseUrl, resumeId, id) {
  if (!baseUrl || !resumeId) return ''
  const secret = args['print-token-secret'] || process.env.PRINT_TOKEN_SECRET || process.env.IMPORT_SECRET
  if (!secret) return ''
  const ttlMs = Number(args['print-token-ttl-ms'] || 5 * 60 * 1000)
  const expiresAt = Date.now() + ttlMs
  const message = `${resumeId}.${expiresAt}`
  const sig = createHmac('sha256', secret).update(message).digest('hex')
  const token = `${expiresAt}.${sig}`
  return `${baseUrl}/print/${encodeURIComponent(resumeId)}?token=${encodeURIComponent(token)}&tpl=${encodeURIComponent(id)}`
}

function runCommandCheck(name, candidates) {
  let result = null
  for (const [command, commandArgs] of candidates) {
    result = spawnSync(command, commandArgs, { cwd: root, stdio: 'pipe', shell: process.platform === 'win32' })
    if (!result.error && result.status === 0) break
  }

  if (result && result.status === 0) {
    pass(name, 'Command completed successfully.')
  } else {
    const stderr = Buffer.from(result?.stderr || '').toString('utf8').trim()
    const stdout = Buffer.from(result?.stdout || '').toString('utf8').trim()
    fail(name, firstLines(stderr || stdout || 'Command failed.', 12))
  }
}

function commandCandidates(localBinName, localArgs, ...fallbacks) {
  const extension = process.platform === 'win32' ? '.cmd' : ''
  const localBin = path.join(root, 'node_modules', '.bin', `${localBinName}${extension}`)
  const candidates = []
  if (fs.existsSync(localBin)) candidates.push([localBin, localArgs])
  candidates.push(...fallbacks)
  return candidates
}

function extractRegistryEntry(source, id) {
  const keyPattern = new RegExp(`\\n\\s*${escapeRegExp(id)}\\s*:\\s*\\{`)
  const match = keyPattern.exec(source)
  if (!match) return null
  const start = source.indexOf('{', match.index)
  let depth = 0
  let quote = ''
  let escaped = false
  for (let i = start; i < source.length; i++) {
    const char = source[i]
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth++
    if (char === '}') depth--
    if (depth === 0) return source.slice(start, i + 1)
  }
  return null
}

function matchStringProp(source, prop) {
  const match = new RegExp(`\\b${escapeRegExp(prop)}\\s*:\\s*['"]([^'"]+)['"]`).exec(source)
  return match ? match[1] : ''
}

function matchArrayProp(source, prop) {
  const match = new RegExp(`\\b${escapeRegExp(prop)}\\s*:\\s*\\[([^\\]]*)\\]`).exec(source)
  if (!match) return []
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
}

function matchLazyImportPath(source) {
  const match = /lazy\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/.exec(source)
  return match ? match[1] : ''
}

function parseArgs(argv) {
  const parsed = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      parsed._.push(arg)
      continue
    }
    const raw = arg.slice(2)
    const eq = raw.indexOf('=')
    if (eq >= 0) {
      parsed[raw.slice(0, eq)] = raw.slice(eq + 1)
    } else {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        parsed[raw] = next
        i++
      } else {
        parsed[raw] = true
      }
    }
  }
  return parsed
}

function printUsage() {
  console.log(`Usage:
  pnpm verify:template <template-id> [options]
  pnpm verify:template --all [options]

Options:
  --all                       Run static checks for every registered template.
  --typecheck                 Run tsc --noEmit after static checks.
  --build                     Run the Next.js production build.
  --base-url <url>            Running app base URL, e.g. http://localhost:3000.
  --resume-id <id>            Resume id used to build mobile and print URLs.
  --mobile-url <url>          Explicit mobile preview URL.
  --print-url <url>           Explicit print URL. Overrides generated print URL.
  --pc-url <url>              Explicit authenticated PC editor/template URL.
  --scenario-loader-url <url> Dev scenario-loader URL for testing the one-click data fill UI.
  --editor-url <url>          Explicit authenticated editor URL for testing the same loader in the real editor.
  --print-token-secret <str>  Secret for generated /print token.

Examples:
  pnpm verify:template qingyun --typecheck
  pnpm verify:template qingyun --base-url http://localhost:3000 --resume-id abc --print-token-secret dev-secret
  pnpm verify:template lanxin --scenario-loader-url "http://localhost:3000/dev/scenario-loader?tpl=lanxin"
  pnpm verify:template lanxin --editor-url http://localhost:3000/editor/abc
`)
}

function printSummary() {
  console.log('\nTemplate verification summary')
  console.log('-----------------------------')
  for (const result of results) {
    const detail = result.details ? ` - ${result.details}` : ''
    console.log(`${result.status.padEnd(4)} ${result.name}${detail}`)
  }
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/')
}

function firstLines(value, count) {
  return value.split(/\r?\n/).slice(0, count).join('\n')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  fail('Unexpected error', error.stack || error.message)
  printSummary()
  process.exit(1)
})
