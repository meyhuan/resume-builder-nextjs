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
const reportRoot = path.join(root, 'test-artifacts', 'reports')
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
  } else if (args['scenario-loader-url'] || args['editor-url']) {
    // The scenario-loader check below covers the editor-side data loading path.
  } else {
    warn('Runtime scenarios', 'Skipped. Pass --local for fixture-based local checks, or --base-url and --resume-id for DB/export checks.')
  }

  if (args['scenario-loader-url']) {
    await checkEditorScenarioLoader(args['scenario-loader-url'])
  } else if (args['editor-url']) {
    await checkEditorScenarioLoader(args['editor-url'])
  }

  printSummary()
  if (args.report) {
    writeReport(templateIds)
  }
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
    const implementationSource = getTemplateImplementationSource(indexSource)
    if (/export\s+default\s+/.test(indexSource)) pass('Default export', 'Found default export.')
    else fail('Default export', 'Template index.tsx must default-export the component.')

    if (/\bresume\b/.test(implementationSource)) pass('Resume data usage', 'Template implementation references resume data.')
    else warn('Resume data usage', 'No "resume" reference found in template implementation.')

    if (/\btheme\b/.test(implementationSource)) pass('Theme usage', 'Template implementation references theme tokens.')
    else warn('Theme usage', 'No "theme" reference found in template implementation.')

    const editablePrimitives = [
      'ResumeFrame',
      'useEditableHeader',
      'useEditableJobIntention',
      'SortableSection',
      'BlockList',
      'FieldChip',
      'AvatarSlot',
    ].filter((name) => new RegExp(`\\b${name}\\b`).test(implementationSource))
    if (editablePrimitives.length >= 5) {
      pass('Editable primitives', `Found ${editablePrimitives.join(', ')}.`)
    } else {
      warn('Editable primitives', `Only found ${editablePrimitives.join(', ') || 'none'}; verify editor behaviors manually.`)
    }

    if (/window\.|document\./.test(implementationSource) && !/useEffect\s*\(/.test(implementationSource)) {
      warn('SSR safety', 'Found window/document usage without an obvious useEffect guard.')
    } else {
      pass('SSR safety', 'No obvious unguarded browser global usage.')
    }
  } else {
    fail('Template entry file', `Missing ${relative(indexPath)}.`)
  }

  return { entry, preview, locksPrimaryColor, recommendedPrimaryColor }
}

function getTemplateImplementationSource(indexSource) {
  const sources = [indexSource]
  if (/OriginalTemplate/.test(indexSource)) {
    const sharedSourcePaths = [
      path.join(root, 'src', 'templates', '_originals', 'shared.tsx'),
      path.join(root, 'src', 'templates', '_originals', 'layouts.tsx'),
      path.join(root, 'src', 'templates', '_originals', 'components.tsx'),
      path.join(root, 'src', 'templates', 'originals', 'shared.tsx'),
      path.join(root, 'src', 'templates', 'originals', 'layouts.tsx'),
      path.join(root, 'src', 'templates', 'originals', 'components.tsx'),
    ]
    for (const sharedPath of sharedSourcePaths) {
      if (fs.existsSync(sharedPath)) {
        sources.push(fs.readFileSync(sharedPath, 'utf8'))
      }
    }
  }
  return sources.join('\n')
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
        checkHorizontalOverflow: true,
        templateId: id,
        fixture: 'full',
      })

      await checkLocalPage(browser, {
        name: `Local mobile full (${id})`,
        url: labUrl(baseUrl, id, 'full', 'base', 'mobile'),
        viewport: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
        screenshot: path.join(artifactDir, 'local-mobile-full.png'),
        expectedText: '林知夏',
        checkHorizontalOverflow: true,
        templateId: id,
        fixture: 'full',
      })

      await checkLocalPage(browser, {
        name: `Local sparse data (${id})`,
        url: labUrl(baseUrl, id, 'sparse', 'base', 'pc'),
        viewport: { width: 1280, height: 1000, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-sparse.png'),
        expectedText: '陈一',
        checkHorizontalOverflow: true,
        templateId: id,
        fixture: 'sparse',
      })

      await checkLocalPage(browser, {
        name: `Local long data (${id})`,
        url: labUrl(baseUrl, id, 'long', 'compact', 'pc'),
        viewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-long.png'),
        expectedText: '欧阳承远',
        checkHorizontalOverflow: true,
        templateId: id,
        fixture: 'long',
      })

      await checkLocalPage(browser, {
        name: `Local rich text (${id})`,
        url: labUrl(baseUrl, id, 'rich', 'base', 'pc'),
        viewport: { width: 1280, height: 1200, deviceScaleFactor: 1 },
        screenshot: path.join(artifactDir, 'local-rich.png'),
        expectedText: '加粗重点',
        checkHorizontalOverflow: true,
        checkRichText: true,
        templateId: id,
        fixture: 'rich',
      })

      await checkThemeControls(browser, baseUrl, id, registry, artifactDir)
      if (!args['skip-interactions']) {
        await checkLocalInteractions(browser, baseUrl, id, artifactDir)
      } else {
        warn(`Local interactions (${id})`, 'Skipped by --skip-interactions.')
      }
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

function isIgnoredConsoleError(text) {
  return text.includes('Permissions policy violation: unload is not allowed in this document.')
}

async function checkLocalPage(browser, options) {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' && !isIgnoredConsoleError(text)) consoleErrors.push(text)
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

    const generalLayoutIssue = await checkGeneralVisualLayout(page, options)
    if (generalLayoutIssue) {
      fail(options.name, generalLayoutIssue)
      return
    }

    const layoutIssue = await checkTemplateSpecificLayout(page, options)
    if (layoutIssue) {
      fail(options.name, layoutIssue)
      return
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

async function checkTemplateSpecificLayout(page, options) {
  if (options.templateId === 'lanxin') {
    return page.evaluate(() => {
      const container = document.querySelector('[data-lanxin-header-fields="true"]')
      if (!container) return ''
      const containerRect = container.getBoundingClientRect()
      const children = Array.from(container.children).map((node) => ({
        text: node.textContent?.trim() || 'field',
        rect: node.getBoundingClientRect(),
      }))

      for (const child of children) {
        if (child.rect.right - containerRect.right > 1 || containerRect.left - child.rect.left > 1) {
          return `Lanxin header field overflows its container: ${child.text}.`
        }
      }

      for (let i = 0; i < children.length; i++) {
        for (let j = i + 1; j < children.length; j++) {
          const a = children[i].rect
          const b = children[j].rect
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (overlapX > 1 && overlapY > 1) {
            return `Lanxin header fields overlap: ${children[i].text} / ${children[j].text}.`
          }
        }
      }

      return ''
    })
  }

  if (options.templateId === 'tablegrid' && ['full', 'sparse', 'long', 'rich'].includes(options.fixture)) {
    return page.evaluate(() => {
      if (document.querySelector('[data-tablegrid-avatar-cell="true"]')) {
        return 'TableGrid rendered an empty avatar column while the local fixture has showAvatar=false.'
      }
      return ''
    })
  }

  if (options.templateId === 'ziji' && ['full', 'sparse', 'long', 'rich'].includes(options.fixture)) {
    return page.evaluate((fixture) => {
      const root = document.querySelector('.ziji-root')
      const hero = root?.querySelector(':scope > section')
      const backdrop = root?.querySelector('[data-ziji-hero-backdrop="true"]')
      const panel = root?.querySelector('[data-ziji-panel="true"]')
      if (!root || !hero || !backdrop || !panel) {
        return 'Ziji missing hero backdrop or panel QA markers.'
      }

      const heroRect = hero.getBoundingClientRect()
      const backdropRect = backdrop.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const panelStyle = window.getComputedStyle(panel)
      const backdropExtendsBehindPanel = backdropRect.bottom - panelRect.top
      if (Math.abs(heroRect.bottom - panelRect.top) > 2) {
        return `Ziji panel should start at the hero bottom. hero=${Math.round(heroRect.bottom)}, panel=${Math.round(panelRect.top)}.`
      }
      const minBackdropOverlap = heroRect.height * 0.16
      if (backdropExtendsBehindPanel < minBackdropOverlap) {
        return `Ziji hero backdrop must extend behind the rounded panel top; only ${Math.round(backdropExtendsBehindPanel)}px overlap.`
      }

      const topRadius = Number.parseFloat(panelStyle.borderTopLeftRadius)
      if (!Number.isFinite(topRadius) || topRadius < 12) {
        return `Ziji panel top radius is too small: ${panelStyle.borderTopLeftRadius}.`
      }

      const background = panelStyle.backgroundImage
      const alphaValues = Array.from(background.matchAll(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/g))
        .map((match) => Number.parseFloat(match[1]))
        .filter((value) => Number.isFinite(value))
      const hasTransparentStart = alphaValues.some((value) => value <= 0.02)
      const hasSoftTopOverlay = alphaValues.some((value) => value >= 0.14 && value <= 0.34)
      if (!hasTransparentStart || !hasSoftTopOverlay) {
        return `Ziji panel background must keep a soft transparent top overlay; found alpha values: ${alphaValues.join(', ')}.`
      }

      const alignmentIssue = checkZijiTextAlignment()
      if (alignmentIssue) return alignmentIssue
      const heroMetaIssue = checkZijiHeroMetaWrap()
      if (heroMetaIssue) return heroMetaIssue
      const shortTitleIssue = checkZijiShortTitleWrap()
      if (shortTitleIssue) return shortTitleIssue
      const titleContentGapIssue = checkZijiTitleContentGap()
      if (titleContentGapIssue) return titleContentGapIssue
      if (fixture === 'full') {
        const columnPlacementIssue = checkZijiDefaultColumnPlacement()
        if (columnPlacementIssue) return columnPlacementIssue
      }

      return ''

      function checkZijiTextAlignment() {
        const sections = [
          ...Array.from(root.querySelectorAll('[data-ziji-column="left"] section')),
          ...Array.from(root.querySelectorAll('[data-ziji-column="right"] section')),
        ]
        for (const section of sections) {
          const title = section.querySelector('h2, h3')
          if (!title) continue
          const titleLeft = title.getBoundingClientRect().left
          const heading = section.querySelector('h4')
          if (heading && Math.abs(heading.getBoundingClientRect().left - titleLeft) > 3) {
            return `Ziji block heading is not left-aligned with section title: ${title.textContent?.trim() || 'section'}.`
          }
          const bodyText = section.querySelector('.ziji-body-text p, .ziji-body-text li')
          if (!bodyText) continue
          const diff = bodyText.getBoundingClientRect().left - titleLeft
          const maxDiff = bodyText.tagName === 'LI' ? 14 : 3
          if (diff < -2 || diff > maxDiff) {
            return `Ziji body text left alignment drift is too large: ${Math.round(diff)}px in ${title.textContent?.trim() || 'section'}.`
          }
        }
        return ''
      }

      function checkZijiShortTitleWrap() {
        const titles = Array.from(root.querySelectorAll('[data-ziji-column="left"] h3, [data-ziji-column="right"] h2'))
        for (const title of titles) {
          const text = (title.textContent || '').replace(/\s+/g, '').trim()
          if (text.length === 0 || text.length > 6) continue
          const rect = title.getBoundingClientRect()
          const lineHeight = Number.parseFloat(window.getComputedStyle(title).lineHeight)
          if (Number.isFinite(lineHeight) && rect.height > lineHeight * 1.45) {
            return `Ziji short section title wraps unexpectedly: ${text}.`
          }
        }
        return ''
      }

      function checkZijiTitleContentGap() {
        const sections = [
          ...Array.from(root.querySelectorAll('[data-ziji-column="left"] section')).map((section) => ({ section, selector: 'h3' })),
          ...Array.from(root.querySelectorAll('[data-ziji-column="right"] section')).map((section) => ({ section, selector: 'h2' })),
        ]
        for (const item of sections) {
          const title = item.section.querySelector(item.selector)
          const contentTitle = findFirstStructuredContentTitle(item.section, title)
          if (!title || !contentTitle) continue
          const titleRect = title.getBoundingClientRect()
          const contentRect = contentTitle.getBoundingClientRect()
          const gap = contentRect.top - titleRect.bottom
          if (gap > 26) {
            return `Ziji section title-to-content gap is too large: ${Math.round(gap)}px in ${title.textContent?.trim() || 'section'}.`
          }
          if (gap < 4) {
            return `Ziji section title-to-content gap is too tight: ${Math.round(gap)}px in ${title.textContent?.trim() || 'section'}.`
          }
        }
        return ''
      }

      function checkZijiDefaultColumnPlacement() {
        const leftText = document.querySelector('[data-ziji-column="left"]')?.textContent ?? ''
        const rightText = document.querySelector('[data-ziji-column="right"]')?.textContent ?? ''
        if (!leftText.includes('相关技能') || (!leftText.includes('自我评价') && !leftText.includes('自定义模块'))) {
          return 'Ziji text-only sections should default to the left column.'
        }
        if (leftText.includes('教育经历')) {
          return 'Ziji education section should not default to the left column.'
        }
        if (!rightText.includes('教育经历')) {
          return 'Ziji education section should remain in the main/right column by default.'
        }
        return ''
      }

      function findFirstStructuredContentTitle(section, title) {
        if (!title) return null
        const titleBottom = title.getBoundingClientRect().bottom
        const candidates = Array.from(section.querySelectorAll('h4, .ziji-body-text p, .ziji-body-text li'))
          .filter((node) => {
            if (node.closest('button, [role="button"], [aria-hidden="true"]')) return false
            const text = (node.textContent || '').replace(/\s+/g, '').trim()
            if (!text) return false
            const rect = node.getBoundingClientRect()
            return rect.width > 1 && rect.height > 1 && rect.top >= titleBottom - 1
          })
          .sort((a, b) => {
            const ar = a.getBoundingClientRect()
            const br = b.getBoundingClientRect()
            return ar.top === br.top ? ar.left - br.left : ar.top - br.top
          })
        const first = candidates[0]
        return first?.tagName === 'H4' && !first.closest('.ziji-body-text') ? first : null
      }

      function checkZijiHeroMetaWrap() {
        const meta = root.querySelector('[data-template-base-info-trigger="true"]')
        if (!meta) return ''
        const metaRect = meta.getBoundingClientRect()
        const children = Array.from(meta.children)
          .map((node) => ({ node, rect: node.getBoundingClientRect(), text: node.textContent?.trim() || '' }))
          .filter((item) => item.rect.width > 1 && item.rect.height > 1)
        if (children.length < 2) return ''
        const firstTop = children[0].rect.top
        const firstRow = children.filter((item) => Math.abs(item.rect.top - firstTop) < 3)
        const wraps = firstRow.length < children.length
        if (!wraps) return ''
        const firstRowRight = Math.max(...firstRow.map((item) => item.rect.right))
        const unused = metaRect.right - firstRowRight
        const nextRowFirst = children[firstRow.length]
        if (unused > 48 && nextRowFirst && nextRowFirst.rect.width < unused - 8) {
          return `Ziji hero base-info wraps too early; first row leaves ${Math.round(unused)}px unused before ${nextRowFirst.text}.`
        }
        return ''
      }
    }, options.fixture)
  }

  return ''
}

async function checkGeneralVisualLayout(page, options) {
  return page.evaluate((checkOptions) => {
    const root = document.querySelector('[data-template-root="true"]')
      || document.querySelector('[data-scenario-preview="true"]')
      || document.querySelector('[data-print-template]')
      || document.body
    const container = root.querySelector('.resume-container')
    if (!container) return 'Missing .resume-container inside the rendered template.'

    const rootRect = root.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    if (containerRect.width < 250 || containerRect.height < 300) {
      return `Resume container has suspicious dimensions: ${Math.round(containerRect.width)}x${Math.round(containerRect.height)}.`
    }

    const boundary = containerRect
    const scrollOverflow = container.scrollWidth - container.clientWidth
    if (scrollOverflow > 6) {
      return `Resume container horizontal scroll overflow detected: ${Math.ceil(scrollOverflow)}px.`
    }

    const visibleTextNodes = collectVisibleTextNodes(container)
    for (const item of visibleTextNodes) {
      if (item.rect.width > boundary.width + 3) {
        return `Text element is wider than the resume page: ${item.label}.`
      }
      if (item.rect.left < boundary.left - 3 || item.rect.right > boundary.right + 3) {
        return `Text element escapes the resume page horizontally: ${item.label}.`
      }
    }

    const overlapIssue = findTextOverlap(visibleTextNodes)
    if (overlapIssue) return overlapIssue

    if (checkOptions.fixture === 'long') {
      const longText = ['ouyangchengyuan.long.email.address@example-company-domain.com', '一家名称非常非常长的科技创新与数字化转型咨询有限公司']
      const pageText = container.textContent || ''
      for (const text of longText) {
        if (!pageText.includes(text)) {
          return `Long-content fixture text is missing or unexpectedly truncated: ${text}.`
        }
      }
    }

    if (rootRect.width > window.innerWidth + 8 && checkOptions.viewport?.isMobile) {
      return `Mobile template root exceeds viewport: ${Math.round(rootRect.width)}px > ${window.innerWidth}px.`
    }

    return ''

    function collectVisibleTextNodes(scope) {
      const selector = [
        'h1', 'h2', 'h3', 'h4',
        'p', 'li', 'span', 'strong', 'em', 'a',
        '[data-tablegrid-header-value]',
        '[data-lanxin-header-fields="true"] > *',
      ].join(',')
      const nodes = Array.from(scope.querySelectorAll(selector))
      const visible = []
      for (const node of nodes) {
        if (!isVisibleTextNode(node)) continue
        if (hasVisibleTextAncestor(node, nodes)) continue
        const rect = node.getBoundingClientRect()
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
        visible.push({
          node,
          rect,
          label: text.length > 36 ? `${text.slice(0, 36)}...` : text,
        })
      }
      return visible
    }

    function isVisibleTextNode(node) {
      if (node.closest('button, [role="button"], svg, [aria-hidden="true"], [data-template-loading="true"]')) return false
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text) return false
      const style = window.getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      if (Number(style.opacity) === 0) return false
      const rect = node.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) return false
      if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) return false
      return true
    }

    function hasVisibleTextAncestor(node, allNodes) {
      return allNodes.some((candidate) => {
        if (candidate === node || !candidate.contains(node)) return false
        return isVisibleTextNode(candidate)
      })
    }

    function findTextOverlap(items) {
      const limit = Math.min(items.length, 260)
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          const a = items[i]
          const b = items[j]
          if (a.node.contains(b.node) || b.node.contains(a.node)) continue
          if (shareInlineTextFlow(a.node, b.node)) continue
          const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left)
          const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
          const minWidth = Math.min(a.rect.width, b.rect.width)
          const minHeight = Math.min(a.rect.height, b.rect.height)
          if (overlapX > Math.min(8, minWidth * 0.35) && overlapY > Math.min(6, minHeight * 0.45)) {
            return `Visible text overlap detected: ${a.label} / ${b.label}.`
          }
        }
      }
      return ''
    }

    function shareInlineTextFlow(a, b) {
      const parent = a.parentElement
      if (!parent || parent !== b.parentElement) return false
      const display = window.getComputedStyle(parent).display
      return display.includes('flex') || display.includes('inline')
    }
  }, {
    fixture: options.fixture || '',
    viewport: options.viewport || {},
  })
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
    relaxedMetrics.bodyTextLineHeight > baseMetrics.bodyTextLineHeight,
    relaxedMetrics.paddingTop > baseMetrics.paddingTop,
    relaxedMetrics.paddingLeft > baseMetrics.paddingLeft,
    relaxedMetrics.headingFontSize > baseMetrics.headingFontSize,
    relaxedMetrics.paragraphIndent > baseMetrics.paragraphIndent,
  ]

  if (changed.every(Boolean)) {
    pass(`Theme settings (${id})`, 'Font size, container/body line height, padding, title scale, and paragraph indent respond to theme changes.')
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

function scenarioLoaderUrl(baseUrl, templateId) {
  const params = new URLSearchParams({ tpl: templateId, avatar: '/avatar.jpg' })
  return `${baseUrl}/dev/scenario-loader?${params.toString()}`
}

async function checkLocalInteractions(browser, baseUrl, id, artifactDir) {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' && !isIgnoredConsoleError(text)) consoleErrors.push(text)
  })
  page.on('dialog', async (dialog) => {
    await dialog.accept()
  })

  try {
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 })
    const response = await page.goto(scenarioLoaderUrl(baseUrl, id), { waitUntil: 'networkidle2', timeout: 60_000 })
    if (!response || !response.ok()) {
      fail(`Local interactions (${id})`, `${scenarioLoaderUrl(baseUrl, id)} returned HTTP ${response ? response.status() : 'no response'}.`)
      return
    }

    await page.waitForSelector('[data-scenario-preview="true"] .resume-container', { timeout: 20_000 })
    await page.waitForFunction(() => document.body.innerText.includes('李小满'), { timeout: 10_000 })

    await runInteractionStep(page, `Template switch flow (${id})`, async () => {
      await closeOpenDialogs(page)
      return checkTemplateSwitchFlow(page, id)
    })

    await runInteractionStep(page, `Theme update/reset flow (${id})`, async () => {
      await closeOpenDialogs(page)
      return checkThemeUpdateResetFlow(page)
    })

    await runInteractionStep(page, `Base info modal (${id})`, async () => {
      await closeOpenDialogs(page)
      const opened = await openModalFromPreview(page, ['电话：', '邮箱：', '性别：', '现居：', '年龄：'], 'input#phone')
      if (!opened) throw new Error('Clicking base-info fields did not open the 基本信息 modal.')
      const phone = `199-0000-${String(Date.now()).slice(-4)}`
      await replaceInputValue(page, 'input#phone', phone)
      await clickButtonByExactText(page, '确定')
      await page.waitForFunction((nextPhone) => {
        return document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes(nextPhone)
      }, { timeout: 5_000 }, phone)
      return `Updated phone to ${phone}.`
    })

    await runInteractionStep(page, `Avatar upload entry (${id})`, async () => {
      await closeOpenDialogs(page)
      const avatar = await page.$('[data-scenario-preview="true"] img')
      if (!avatar) throw new Error('No avatar image rendered in scenario-loader while avatar=/avatar.jpg is set.')
      await avatar.hover()
      await page.waitForFunction(() => document.body.innerText.includes('本地上传'), { timeout: 3_000 })
      return 'Avatar hover exposes local upload action.'
    })

    await runInteractionStep(page, `Job intention modal (${id})`, async () => {
      await closeOpenDialogs(page)
      const opened = await openModalFromPreview(page, ['意向岗位：', '期望薪资：', '求职意向', '意向城市：'], 'input#salary')
      if (!opened) throw new Error('Clicking job-intention content did not open the 求职意向 modal.')
      const salary = `13k-18k-${String(Date.now()).slice(-3)}`
      await replaceInputValue(page, 'input#salary', salary)
      await clickButtonByExactText(page, '确定')
      await page.waitForFunction((nextSalary) => {
        return document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes(nextSalary)
      }, { timeout: 5_000 }, salary)
      return `Updated salary to ${salary}.`
    })

    await runInteractionStep(page, `Block field editing (${id})`, async () => {
      await closeOpenDialogs(page)
      const clicked = await clickPreviewElementByTitle(page, ['点击编辑公司名称', '点击编辑公司'])
        || await clickPreviewElementByText(page, ['上海星河智能科技有限公司'])
      if (!clicked) throw new Error('Cannot find an editable company field in scenario-loader.')
      await page.waitForSelector('[data-scenario-preview="true"] input', { timeout: 5_000 })
      const company = `上海星河智能科技有限公司测试${String(Date.now()).slice(-3)}`
      await replaceFocusedInputValue(page, company)
      await page.keyboard.press('Enter')
      await page.waitForFunction((nextCompany) => {
        return document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes(nextCompany)
      }, { timeout: 5_000 }, company)
      return `Updated company field to ${company}.`
    })

    await runInteractionStep(page, `Section action controls (${id})`, async () => {
      await closeOpenDialogs(page)
      return checkSectionActionControls(page)
    })

    if (id === 'ziji') {
      await runInteractionStep(page, `Cross-column section drag (${id})`, async () => checkZijiCrossColumnDrag(page))
    }

    await runInteractionStep(page, `Hover contrast (${id})`, async () => {
      await closeOpenDialogs(page)
      return checkDarkHoverContrast(page)
    })

    await runInteractionStep(page, `Rich text editing contrast (${id})`, async () => {
      await closeOpenDialogs(page)
      const clicked = await clickRichTextCandidate(page)
      if (!clicked) throw new Error('Cannot find clickable rich-text content in scenario-loader.')
      await page.waitForSelector('[data-scenario-preview="true"] .rb-editing, [data-scenario-preview="true"] [contenteditable="true"]', { timeout: 5_000 })
      const metrics = await page.evaluate(() => {
        const root = document.querySelector('[data-scenario-preview="true"]')
        const editing = root?.querySelector('.rb-editing') ?? root?.querySelector('[contenteditable="true"]')
        if (!editing) return null
        const style = window.getComputedStyle(editing)
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          colorLightness: colorLightness(style.color),
          backgroundLightness: colorLightness(style.backgroundColor),
        }

        function colorLightness(value) {
          const oklch = /^oklch\(([-0-9.]+)/.exec(value)
          if (oklch) return Number(oklch[1])
          const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)
          if (!rgb) return null
          const [r, g, b] = rgb.slice(1, 4).map((part) => Number(part) / 255)
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
      })
      if (!metrics) throw new Error('Rich-text editor opened but no editable element could be inspected.')
      if ((metrics.backgroundLightness ?? 0) > 0.72 && (metrics.colorLightness ?? 1) > 0.62) {
        throw new Error(`Editing contrast is too low on a light editor background: ${JSON.stringify(metrics)}.`)
      }
      return `Editing color ${metrics.color} on ${metrics.backgroundColor}.`
    })

    await runInteractionStep(page, `Scenario data load flow (${id})`, async () => {
      await closeOpenDialogs(page)
      return checkScenarioDataLoadFlow(page)
    })

    const screenshot = path.join(artifactDir, 'local-interactions.png')
    await page.screenshot({ path: screenshot, fullPage: true })

    if (pageErrors.length > 0) {
      fail(`Local interaction runtime (${id})`, `Page errors: ${pageErrors.slice(0, 3).join(' | ')}`)
    } else if (consoleErrors.length > 0) {
      warn(`Local interaction runtime (${id})`, `Console errors observed; screenshot saved to ${relative(screenshot)}.`)
    } else {
      pass(`Local interaction runtime (${id})`, `Screenshot saved to ${relative(screenshot)}.`)
    }
  } catch (error) {
    fail(`Local interactions (${id})`, error.message)
  } finally {
    await page.close()
  }
}

async function runInteractionStep(page, name, action) {
  try {
    const detail = await action()
    pass(name, detail)
  } catch (error) {
    fail(name, error.message)
    await closeOpenDialogs(page)
  }
}

async function checkTemplateSwitchFlow(page, originalTemplateId) {
  await openLayoutTemplatesTab(page)

  const originalTemplateIsVisible = await page.evaluate((currentId) => {
    return Array.from(document.querySelectorAll('button[data-template-id]'))
      .some((button) => button.getAttribute('data-template-id') === currentId)
  }, originalTemplateId)
  if (!originalTemplateIsVisible) {
    return `Skipped template switch flow because ${originalTemplateId} is hidden from the template sidebar.`
  }

  const alternateTemplateId = await page.evaluate((currentId) => {
    const buttons = Array.from(document.querySelectorAll('button[data-template-id]'))
    const alternate = buttons.find((button) => button.getAttribute('data-template-id') !== currentId)
    return alternate?.getAttribute('data-template-id') || ''
  }, originalTemplateId)

  if (!alternateTemplateId) throw new Error('Cannot find an alternate template button in the layout sidebar.')

  await page.click(`button[data-template-id="${escapeAttributeValue(alternateTemplateId)}"]`)
  await waitForActiveTemplate(page, alternateTemplateId)
  await page.waitForSelector('[data-scenario-preview="true"] .resume-container', { timeout: 10_000 })
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes('李小满'), { timeout: 8_000 })

  await page.click(`button[data-template-id="${escapeAttributeValue(originalTemplateId)}"]`)
  await waitForActiveTemplate(page, originalTemplateId)
  await page.waitForSelector('[data-scenario-preview="true"] .resume-container', { timeout: 10_000 })
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes('李小满'), { timeout: 8_000 })

  return `Switched ${originalTemplateId} -> ${alternateTemplateId} -> ${originalTemplateId}.`
}

async function checkThemeUpdateResetFlow(page) {
  await openLayoutSettingsTab(page)
  await clickByTextIfPresent(page, '仍要自定义主色', ['button'])

  const defaultColor = await readDefaultPrimaryColor(page)
  if (!defaultColor) throw new Error('Cannot read the template default primary color from the theme panel.')

  const targetColor = defaultColor === '#000000' ? '#2563EB' : '#000000'
  await page.click('button[aria-label="选择主题主色"]')
  await page.waitForSelector(`button[aria-label="选择颜色 ${escapeAttributeValue(targetColor)}"]`, { timeout: 5_000 })
  await page.click(`button[aria-label="选择颜色 ${escapeAttributeValue(targetColor)}"]`)
  await waitForThemeColor(page, targetColor)

  await page.click('[data-theme-reset-primary="true"]')
  await waitForThemeColor(page, defaultColor)

  return `Changed primary color to ${targetColor}, then reset to ${defaultColor}.`
}

async function checkScenarioDataLoadFlow(page) {
  await openLayoutSettingsTab(page)
  const changed = await page.evaluate(() => {
    const select = Array.from(document.querySelectorAll('select')).find((node) =>
      Array.from(node.options).some((option) => option.value === 'long-content')
    )
    if (!select) return false
    select.value = 'long-content'
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })
  if (!changed) throw new Error('Cannot find the scenario data select with long-content option.')

  await clickButtonByExactText(page, '加载场景数据')
  await page.waitForFunction(() => document.querySelector('[data-scenario-preview="true"]')?.textContent?.includes('欧阳晨曦'), { timeout: 8_000 })

  const verification = await page.evaluate(() => {
    const text = document.querySelector('[data-scenario-preview="true"]')?.textContent || ''
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
    throw new Error(`Scenario loaded but expected fields are missing: ${missing.join(', ')}.`)
  }

  const layoutIssue = await checkGeneralVisualLayout(page, {
    fixture: 'scenario-long',
    viewport: { width: 1400, height: 1000 },
  })
  if (layoutIssue) throw new Error(layoutIssue)

  return 'Loaded long-content scenario and verified key fields in preview.'
}

async function openLayoutSettingsTab(page) {
  await clickButtonByExactText(page, '排版设置')
  await page.waitForFunction(() => document.body.innerText.includes('文字排版') && document.body.innerText.includes('色彩风格'), { timeout: 5_000 })
}

async function openLayoutTemplatesTab(page) {
  await clickButtonByExactText(page, '切换模板')
  await page.waitForSelector('button[data-template-id]', { timeout: 5_000 })
}

async function waitForActiveTemplate(page, templateId) {
  await page.waitForFunction((nextId) => {
    return document.querySelector('[data-scenario-active-template]')?.getAttribute('data-scenario-active-template') === nextId
  }, { timeout: 8_000 }, templateId)
}

async function readDefaultPrimaryColor(page) {
  return page.evaluate(() => {
    return document.querySelector('[data-theme-reset-primary]')?.getAttribute('data-theme-default-primary') || ''
  })
}

async function waitForThemeColor(page, color) {
  await page.waitForFunction((expectedColor) => {
    return document.querySelector('[data-theme-primary-color]')?.textContent?.toUpperCase().includes(expectedColor)
  }, { timeout: 5_000 }, color)
}

async function checkZijiCrossColumnDrag(page) {
  await closeOpenDialogs(page)
  await page.waitForSelector('[data-ziji-column="left"], [data-ziji-column="right"]', { timeout: 5_000 })
  const before = await page.evaluate(() => ({
    leftHasProject: (document.querySelector('[data-ziji-column="left"]')?.textContent ?? '').includes('项目经历'),
    rightHasProject: (document.querySelector('[data-ziji-column="right"]')?.textContent ?? '').includes('项目经历'),
  }))
  if (before.leftHasProject || !before.rightHasProject) {
    return `Skipped drag because initial columns were already changed: ${JSON.stringify(before)}.`
  }

  const sectionHandle = await page.evaluateHandle(() => {
    const sections = Array.from(document.querySelectorAll('[data-ziji-column="right"] section'))
    return sections.find((section) => section.textContent?.includes('项目经历')) ?? null
  })
  const section = sectionHandle.asElement()
  if (!section) {
    await sectionHandle.dispose()
    throw new Error('Cannot find 项目经历 section in the right column.')
  }
  await section.hover()
  await new Promise((resolve) => setTimeout(resolve, 250))
  const buttonHandle = await section.evaluateHandle((node) => node.querySelector('button[title="拖动"]'))
  const button = buttonHandle.asElement()
  if (!button) {
    await buttonHandle.dispose()
    await sectionHandle.dispose()
    throw new Error('The 项目经历 section did not expose a drag handle.')
  }
  const buttonBox = await button.boundingBox()
  if (!buttonBox) {
    await buttonHandle.dispose()
    await sectionHandle.dispose()
    throw new Error('The 项目经历 drag handle is not visible.')
  }
  const leftBox = await page.$eval('[data-ziji-column="left"]', (node) => {
    const rect = node.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + Math.min(leftBox.height - 24, 360), { steps: 30 })
  await page.mouse.up()
  await page.waitForFunction(() => {
    const left = document.querySelector('[data-ziji-column="left"]')?.textContent ?? ''
    const right = document.querySelector('[data-ziji-column="right"]')?.textContent ?? ''
    return left.includes('项目经历') && !right.includes('项目经历')
  }, { timeout: 8_000 })
  await buttonHandle.dispose()
  await sectionHandle.dispose()
  return 'Moved 项目经历 from the right column to the left column.'
}

async function openModalFromPreview(page, labels, modalSelector) {
  const triggerSelector = modalSelector.includes('phone')
    ? '[data-template-base-info-trigger="true"]'
    : modalSelector.includes('salary')
      ? '[data-template-job-intention-trigger="true"]'
      : ''
  if (triggerSelector) {
    const clicked = await clickFirstPreviewSelector(page, triggerSelector)
    if (clicked && await waitForSelectorQuiet(page, modalSelector, 1_800)) return true
  }

  for (const label of labels) {
    await closeInlineInputs(page)
    const clicked = await clickPreviewElementByText(page, [label])
    if (!clicked) continue
    if (await waitForSelectorQuiet(page, modalSelector, 1_800)) return true
  }

  const headerClicked = await clickFirstPreviewSelector(page, 'header, aside, h1')
  if (headerClicked && await waitForSelectorQuiet(page, modalSelector, 1_800)) return true
  await closeInlineInputs(page)
  return false
}

async function clickPreviewElementByText(page, labels) {
  const handle = await page.evaluateHandle((targetLabels) => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const labels = targetLabels.map((label) => String(label))
    const nodes = Array.from(root.querySelectorAll('h1,h2,h3,p,span,div,section,header,button'))
      .filter((node) => {
        if (node.closest('[role="dialog"]')) return false
        const text = node.textContent || ''
        if (!labels.some((label) => text.includes(label))) return false
        const rect = node.getBoundingClientRect()
        return rect.width > 2 && rect.height > 2
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return (ar.width * ar.height) - (br.width * br.height)
      })
    return nodes[0] ?? null
  }, labels)
  const element = handle.asElement()
  if (!element) {
    await handle.dispose()
    return false
  }
  await element.evaluate((node) => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await handle.dispose()
  return true
}

async function clickPreviewElementByTitle(page, titleParts) {
  const handle = await page.evaluateHandle((parts) => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const nodes = Array.from(root.querySelectorAll('[title]'))
      .filter((node) => {
        if (node.closest('[role="dialog"]')) return false
        const title = node.getAttribute('title') || ''
        if (!parts.some((part) => title.includes(part))) return false
        const rect = node.getBoundingClientRect()
        return rect.width > 2 && rect.height > 2
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return (ar.width * ar.height) - (br.width * br.height)
      })
    return nodes[0] ?? null
  }, titleParts)
  const element = handle.asElement()
  if (!element) {
    await handle.dispose()
    return false
  }
  await element.click({ delay: 20 })
  await handle.dispose()
  return true
}

async function clickFirstPreviewSelector(page, selector) {
  const handle = await page.evaluateHandle((targetSelector) => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const nodes = Array.from(root.querySelectorAll(targetSelector))
      .filter((node) => {
        if (node.closest('[role="dialog"]')) return false
        const rect = node.getBoundingClientRect()
        return rect.width > 2 && rect.height > 2
      })
    return nodes[0] ?? null
  }, selector)
  const element = handle.asElement()
  if (!element) {
    await handle.dispose()
    return false
  }
  await element.click({ delay: 20 })
  await handle.dispose()
  return true
}

async function clickRichTextCandidate(page) {
  const handle = await page.evaluateHandle(() => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const preferred = ['产品需求分析', '市场调研', 'GPA', '项目概述']
    const richNodes = Array.from(root.querySelectorAll('.original-rich'))
      .filter((node) => {
        if (node.closest('[role="dialog"]')) return false
        const text = node.textContent || ''
        const rect = node.getBoundingClientRect()
        return text.trim().length > 12 && rect.width > 20 && rect.height > 12
      })
    if (richNodes.length > 0) {
      return richNodes.find((node) => preferred.some((text) => (node.textContent || '').includes(text))) ?? richNodes[0]
    }

    const nodes = Array.from(root.querySelectorAll('.cursor-text, [class*="cursor-text"]'))
      .filter((node) => {
        if (node.closest('[role="dialog"]')) return false
        if (node.getAttribute('title')) return false
        const text = node.textContent || ''
        const rect = node.getBoundingClientRect()
        return text.trim().length > 12 && rect.width > 20 && rect.height > 12
      })
    return nodes.find((node) => preferred.some((text) => (node.textContent || '').includes(text))) ?? nodes[0] ?? null
  })
  const element = handle.asElement()
  if (!element) {
    await handle.dispose()
    return false
  }
  await element.evaluate((node) => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await handle.dispose()
  return true
}

async function checkSectionActionControls(page) {
  const handle = await page.evaluateHandle(() => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const sectionsWithActions = Array.from(root.querySelectorAll('section'))
      .filter((section) => {
        if (section.closest('[role="dialog"]')) return false
        const rect = section.getBoundingClientRect()
        return rect.width > 80 && rect.height > 24 && section.querySelector('button[title="拖动"], button[title="删除"]')
      })
    if (sectionsWithActions.length > 0) {
      return sectionsWithActions.find((section) => section.querySelector('button[title="添加"]')) ?? sectionsWithActions[0]
    }

    const hoverTargets = Array.from(root.querySelectorAll('section, [class*="group/header"], h2, h3'))
      .map((node) => {
        if (node.matches('h2,h3')) return node.closest('[class*="group/header"]') ?? node.closest('section') ?? node
        return node
      })
      .filter((node, index, nodes) => {
        if (!node || nodes.indexOf(node) !== index) return false
        if (node.closest('[role="dialog"]')) return false
        const rect = node.getBoundingClientRect()
        const text = node.textContent || ''
        return rect.width > 60 && rect.height > 18 && /经历|项目|教育|证书|技能|评价|意向/.test(text)
      })
    return hoverTargets[0] ?? null
  })
  const section = handle.asElement()
  if (!section) {
    await handle.dispose()
    throw new Error('Cannot find a preview section/header candidate for section action controls.')
  }

  await section.hover()
  await sleep(260)

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-scenario-preview="true"]')
    if (!root) return null
    const requiredTitles = ['拖动', '删除']
    const optionalTitles = ['添加']
    const allTitles = [...requiredTitles, ...optionalTitles]
    const buttons = allTitles.map((title) => {
      const selector = title === '添加' ? 'button[title="添加"], button[title^="添加"]' : `button[title="${title}"]`
      const candidates = Array.from(root.querySelectorAll(selector))
      const button = candidates.find((candidate) => {
        const rect = candidate.getBoundingClientRect()
        const style = window.getComputedStyle(candidate)
        return rect.width > 8 && rect.height > 8 && Number(style.opacity || 0) > 0.5 && style.pointerEvents !== 'none'
      }) ?? candidates[0]
      if (!button) return { title, exists: false, required: requiredTitles.includes(title) }
      const rect = button.getBoundingClientRect()
      const style = window.getComputedStyle(button)
      return {
        title,
        exists: true,
        required: requiredTitles.includes(title),
        width: rect.width,
        height: rect.height,
        opacity: Number(style.opacity || 0),
        pointerEvents: style.pointerEvents,
        visible: rect.width > 8 && rect.height > 8 && Number(style.opacity || 0) > 0.5 && style.pointerEvents !== 'none',
      }
    })
    return {
      previewText: (root.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      buttons,
    }
  })
  await handle.dispose()
  if (!metrics) throw new Error('Cannot inspect section action controls because the preview root is missing.')

  const requiredIssues = metrics.buttons
    .filter((button) => button.required && (!button.exists || !button.visible))
    .map((button) => button.title)
  if (requiredIssues.length > 0) {
    throw new Error(`Required section actions are not visible after hover: ${requiredIssues.join(', ')}. ${JSON.stringify(metrics)}`)
  }

  const addButton = metrics.buttons.find((button) => button.title === '添加')
  if (addButton?.exists && !addButton.visible) {
    throw new Error(`Add action exists but is not visible after hover. ${JSON.stringify(metrics)}`)
  }

  const visibleTitles = metrics.buttons
    .filter((button) => button.exists && button.visible)
    .map((button) => button.title)
  return `Section actions visible after hover: ${visibleTitles.join(', ')}.`
}

async function checkDarkHoverContrast(page) {
  const handles = await page.$$('[data-scenario-preview="true"] .cursor-text, [data-scenario-preview="true"] [class*="hover:bg-gray-100"]')
  let checked = 0
  const issues = []
  for (const handle of handles) {
    const before = await readHoverCandidateMetrics(handle)
    if (!before?.isCandidate) {
      await handle.dispose()
      continue
    }
    await handle.hover()
    await sleep(120)
    const after = await readHoverCandidateMetrics(handle)
    checked += 1
    if ((after?.backgroundLightness ?? 0) > 0.72 && (after?.colorLightness ?? 1) > 0.62) {
      issues.push({ text: before.text, before, after })
    }
    await handle.dispose()
    if (checked >= 8) break
  }
  if (issues.length > 0) {
    throw new Error(`Low hover contrast on dark background: ${JSON.stringify(issues.slice(0, 2))}`)
  }
  return checked > 0
    ? `Checked ${checked} dark-background hover candidate(s).`
    : 'No dark-background hover candidates found.'
}

async function readHoverCandidateMetrics(handle) {
  return handle.evaluate((node) => {
    const rect = node.getBoundingClientRect()
    const text = (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)
    if (rect.width <= 2 || rect.height <= 2 || !text) return null
    const style = window.getComputedStyle(node)
    const colorLightnessValue = colorLightness(style.color)
    const backgroundLightnessValue = effectiveBackgroundLightness(node)
    return {
      text,
      color: style.color,
      backgroundColor: style.backgroundColor,
      colorLightness: colorLightnessValue,
      backgroundLightness: backgroundLightnessValue,
      isCandidate: (backgroundLightnessValue ?? 1) < 0.45 && (colorLightnessValue ?? 0) > 0.55,
    }

    function effectiveBackgroundLightness(element) {
      let current = element
      while (current && current instanceof Element) {
        const bg = window.getComputedStyle(current).backgroundColor
        if (!isTransparent(bg)) return colorLightness(bg)
        current = current.parentElement
      }
      return 1
    }

    function isTransparent(value) {
      return value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value.endsWith(', 0)')
    }

    function colorLightness(value) {
      const oklch = /^oklch\(([-0-9.]+)/.exec(value)
      if (oklch) return Number(oklch[1])
      const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)
      if (!rgb) return null
      const [r, g, b] = rgb.slice(1, 4).map((part) => Number(part) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
  })
}

async function waitForSelectorQuiet(page, selector, timeout) {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

async function replaceInputValue(page, selector, value) {
  await page.click(selector)
  await replaceFocusedInputValue(page, value)
}

async function replaceFocusedInputValue(page, value) {
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyA')
  await page.keyboard.up('Control')
  await page.keyboard.type(value)
}

async function clickButtonByExactText(page, text) {
  const handles = await page.$$('button')
  for (const handle of handles) {
    const matches = await handle.evaluate((node, targetText) => (node.textContent || '').trim() === targetText, text)
    if (!matches) {
      await handle.dispose()
      continue
    }
    await handle.click({ delay: 20 })
    await handle.dispose()
    return
  }
  throw new Error(`Cannot find button with exact text: ${text}`)
}

async function closeOpenDialogs(page) {
  await page.keyboard.press('Escape')
  await sleep(120)
}

async function closeInlineInputs(page) {
  await page.keyboard.press('Escape')
  await sleep(80)
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
  const templateId = extractTemplateIdFromUrl(editorUrl)
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

    const layoutIssue = await checkGeneralVisualLayout(page, {
      templateId,
      fixture: 'scenario-long',
      viewport: { width: 1440, height: 1000 },
    })
    if (layoutIssue) {
      fail('Editor scenario loader', layoutIssue)
      return
    }

    const screenshotPath = path.join(artifactDir, `long-content-loaded-${templateId}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    pass('Editor scenario loader', `Loaded long-content scenario and verified rendered fields. Screenshot saved to ${relative(screenshotPath)}.`)
  } catch (error) {
    fail('Editor scenario loader', error.message)
  } finally {
    await page.close()
    await browser.close()
  }
}

function extractTemplateIdFromUrl(value) {
  try {
    return new URL(value).searchParams.get('tpl') || 'template'
  } catch {
    return 'template'
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
      const bodyTextCandidates = Array.from(root.querySelectorAll('.dense-body-text, .ziji-body-text, [data-template-body-text="true"], main p, main li, main article p, main article li'))
        .filter((node) => {
          if (node.closest('button, [role="button"], svg, [aria-hidden="true"]')) return false
          const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
          if (text.length < 12) return false
          const rect = node.getBoundingClientRect()
          if (rect.width <= 1 || rect.height <= 1) return false
          const style = getComputedStyle(node)
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
        })
      const bodyText = bodyTextCandidates[0] || paragraph || container
      const bodyTextStyle = getComputedStyle(bodyText)
      const paddingTargets = [
        container,
        ...Array.from(container.children),
        ...Array.from(root.querySelectorAll('[data-template-padding-probe="true"]')),
      ]
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
        bodyTextLineHeight: parseFloat(bodyTextStyle.lineHeight),
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
    const text = message.text()
    if (message.type() === 'error' && !isIgnoredConsoleError(text)) consoleErrors.push(text)
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

    const generalLayoutIssue = await checkGeneralVisualLayout(page, options)
    if (generalLayoutIssue) {
      fail(options.name, generalLayoutIssue)
      return
    }

    if (options.templateId === 'tablegrid') {
      const tableGridIssue = await checkTableGridLayout(page)
      if (tableGridIssue) {
        fail(options.name, tableGridIssue)
        return
      }
    }

    const layoutIssue = await checkTemplateSpecificLayout(page, options)
    if (layoutIssue) {
      fail(options.name, layoutIssue)
      return
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
  --skip-interactions         Skip local interaction QA when using --local.
  --report                    Write a Markdown QA report under test-artifacts/reports/.
  --reference-image <path>    Reference screenshot to embed next to implementation screenshots in the QA report.
  --print-token-secret <str>  Secret for generated /print token.

Examples:
  pnpm verify:template qingyun --typecheck
  pnpm verify:template qingyun --base-url http://localhost:3000 --resume-id abc --print-token-secret dev-secret
  pnpm verify:template lanxin --local --base-url http://localhost:3000 --scenario-loader-url "http://localhost:3000/dev/scenario-loader?tpl=lanxin" --report --reference-image ./reference.png
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

function writeReport(templateIds) {
  fs.mkdirSync(reportRoot, { recursive: true })
  const id = args.all ? 'all' : templateIds[0]
  const now = new Date()
  const timestamp = formatTimestamp(now)
  const reportPath = path.join(reportRoot, `template-qa-${id}-${timestamp}.md`)
  const command = `node ${process.argv.slice(1).map(quoteArg).join(' ')}`
  const passed = results.filter((result) => result.status === 'PASS')
  const failed = results.filter((result) => result.status === 'FAIL')
  const warned = results.filter((result) => result.status === 'WARN')
  const screenshots = collectReportScreenshots(id)
  const referenceImage = resolveReferenceImage()
  const comparisonScreenshot = screenshots.find((screenshot) => path.basename(screenshot) === 'local-pc-full.png')
    ?? screenshots.find((screenshot) => path.basename(screenshot) === 'long-content-loaded.png')
    ?? screenshots[0]
  const lines = [
    `# Template QA Report: ${id}`,
    '',
    `测试对象：\`${id}\``,
    '',
    `测试时间：${now.toLocaleString('zh-CN', { hour12: false })}`,
    '',
    '## 执行命令',
    '',
    '```bash',
    command,
    '```',
    '',
    '## 测试结果',
    '',
    `- 通过项：${passed.length}`,
    `- 失败项：${failed.length}`,
    `- 警告项：${warned.length}`,
    '',
    '## 通过项',
    '',
    ...formatResultList(passed),
    '',
    '## 失败项',
    '',
    ...formatResultList(failed, '无。'),
    '',
    '## 警告项',
    '',
    ...formatResultList(warned, '无。'),
    '',
    '## 覆盖范围',
    '',
    '- 模板注册、懒加载、缩略图、主题契约。',
    '- 本地 PC、移动端、稀疏数据、长内容、富文本渲染。',
    '- 字号、行高、模块间距、标题比例、页边距、主题主色。',
    '- 本地交互 QA：模板切换、主题改色与恢复默认、基础信息弹窗、头像上传入口、求职意向弹窗、经历字段编辑、模块操作入口、富文本编辑态、深色背景 hover 对比。',
    '- 一键加载真实简历场景数据，以及预览中的基础信息、求职意向、长公司名、项目名、薪资、自定义字段和长内容布局。',
    '- 模板专项布局断言会在脚本中按模板 id 执行，例如表格模板的邮箱单元格和头像单元格检查。',
    '',
    '## 截图/产物',
    '',
    ...formatScreenshotList(screenshots),
    '',
    '## 截图预览',
    '',
    ...formatScreenshotPreview(screenshots),
    '',
    '## 参考截图对比',
    '',
    ...formatReferenceComparison(referenceImage, comparisonScreenshot),
    '',
    '## 视觉对比清单',
    '',
    ...formatVisualComparisonChecklist(Boolean(referenceImage)),
    '',
    '## 仍需人工确认',
    '',
    '- 真实登录态编辑器里的细节建议在浏览器中快速扫一眼；如果 headless 测试使用 `/dev/scenario-loader`，它覆盖的是同一套右侧栏、场景加载、store 更新和模板渲染链路。',
    '- 移动端表单编辑、真实导出 PDF/图片、AI 润色/生成和会员权限依赖真实账号或外部服务，发布前需要用线上/预发环境补测。',
    '',
    '## 结论',
    '',
    failed.length > 0
      ? '本次 QA 未完全通过，需要先处理失败项再交付。'
      : '本次 QA 通过。后续若发现视觉问题，应把对应场景补进自动化断言。',
    '',
  ]
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')
  console.log(`\nQA report saved to ${relative(reportPath)}`)
}

function formatVisualComparisonChecklist(hasReferenceImage) {
  const prefix = hasReferenceImage ? '[ ]' : '[-]'
  const note = hasReferenceImage
    ? '请在交付前逐项人工确认；允许不完全一致，但整体风格应接近参考图。'
    : '未提供参考图，本轮无法完成参考图对比；创建新模板时必须补充参考图。'
  return [
    note,
    '',
    `- ${prefix} 基础信息头部：姓名、岗位/副标题、联系方式、头像布局与参考图整体一致。`,
    `- ${prefix} 头像区域：尺寸、位置、圆角/裁切、占位状态无异常。`,
    `- ${prefix} 模块标题：字号、字重、主色、背景/竖线/边框等装饰接近参考图。`,
    `- ${prefix} 正文排版：字号、行高、段落间距、日期位置、字段对齐保持清晰。`,
    `- ${prefix} 页面节奏：页边距、模块间距、信息密度与参考图同类。`,
    `- ${prefix} 主题设置：主色、字号、行高、模块间距、页边距调整后仍不破版。`,
    `- ${prefix} 极端数据：长邮箱、长公司名、长项目名、自定义字段不重叠、不撞格、不溢出。`,
  ]
}

function resolveReferenceImage() {
  const value = args['reference-image']
  if (!value || value === true) return null
  const filePath = path.isAbsolute(value) ? value : path.join(root, value)
  return fs.existsSync(filePath) ? filePath : null
}

function formatResultList(items, empty = '') {
  if (items.length === 0) return empty ? [`- ${empty}`] : []
  return items.map((result) => {
    const detail = result.details ? `：${result.details}` : ''
    return `- ${result.name}${detail}`
  })
}

function collectReportScreenshots(id) {
  if (args.all) return []
  const candidates = [
    path.join(artifactRoot, id, 'local-pc-full.png'),
    path.join(artifactRoot, id, 'local-mobile-full.png'),
    path.join(artifactRoot, id, 'local-long.png'),
    path.join(artifactRoot, id, 'local-rich.png'),
    path.join(artifactRoot, id, 'local-color.png'),
    path.join(artifactRoot, id, 'local-interactions.png'),
    path.join(artifactRoot, 'editor-scenarios', `long-content-loaded-${id}.png`),
    path.join(artifactRoot, 'editor-scenarios', 'long-content-loaded.png'),
  ]
  return candidates.filter((filePath) => fs.existsSync(filePath))
}

function formatScreenshotList(screenshots) {
  if (screenshots.length === 0) return ['- 无截图产物。']
  return screenshots.map((screenshot) => `- \`${relative(screenshot)}\``)
}

function formatScreenshotPreview(screenshots) {
  if (screenshots.length === 0) return ['无截图预览。']
  return screenshots.map((screenshot) => {
    const label = path.basename(screenshot, '.png')
    const link = path.relative(reportRoot, screenshot).replaceAll(path.sep, '/')
    return `![${label}](${link})`
  })
}

function formatReferenceComparison(referenceImage, screenshot) {
  if (!args['reference-image']) {
    return [
      '- 未提供参考截图。创建新模板时建议传入 `--reference-image <path>`，报告会自动嵌入参考图和实现图，方便人工对比头部、模块标题、色彩和间距。',
    ]
  }
  if (!referenceImage) {
    return [`- 参考截图路径无效或文件不存在：\`${args['reference-image']}\`。`]
  }
  const referenceLink = path.relative(reportRoot, referenceImage).replaceAll(path.sep, '/')
  const lines = [
    '参考截图：',
    '',
    `![reference](${referenceLink})`,
    '',
  ]
  if (screenshot) {
    const screenshotLink = path.relative(reportRoot, screenshot).replaceAll(path.sep, '/')
    lines.push('实现截图：', '', `![implementation](${screenshotLink})`, '')
  } else {
    lines.push('- 未生成实现截图，无法形成截图对比。')
  }
  lines.push('人工对比重点：基础信息头部、头像区域、模块标题样式、主色、边框/装饰元素、整体信息密度。')
  return lines
}

function formatTimestamp(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}-${hh}${mm}${ss}`
}

function quoteArg(value) {
  if (/^[\w./:=?&-]+$/.test(value)) return value
  return `"${value.replaceAll('"', '\\"')}"`
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

function escapeAttributeValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  fail('Unexpected error', error.stack || error.message)
  printSummary()
  process.exit(1)
})
