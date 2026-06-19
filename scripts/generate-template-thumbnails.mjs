#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer'
import sharp from 'sharp'

const root = process.cwd()
const templateLoaderPath = path.join(root, 'src', 'templates', 'template-loader.ts')
const outputDir = path.join(root, 'public', 'thumbnails')
const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 594

const args = parseArgs(process.argv.slice(2))
const baseUrl = stripTrailingSlash(args['base-url'] || 'http://127.0.0.1:3000')
const width = Number(args.width || DEFAULT_WIDTH)
const height = Number(args.height || DEFAULT_HEIGHT)
const quality = Number(args.quality || 82)
const defaultAvatar = fs.existsSync(path.join(root, 'public', 'avatar.jpg')) ? '/avatar.jpg' : ''
const zijiCoverAvatar = fs.existsSync(path.join(root, 'public', 'avatar_transpant.png'))
  ? '/avatar_transpant.png'
  : fs.existsSync(path.join(root, 'public', 'avatar_trans.png'))
    ? '/avatar_trans.png'
    : defaultAvatar
const scenario = args.scenario || 'cover'
const ids = args._.length > 0 ? args._ : args.all ? getRegisteredTemplateIds() : getSvgTemplateIds()

if (ids.length === 0) {
  console.log('No SVG template thumbnails found.')
  process.exit(0)
}

await assertServer(baseUrl)

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width: 1440, height: 1800, deviceScaleFactor: 2 },
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

try {
  for (const id of ids) {
    await generateThumbnail(browser, id)
  }
} finally {
  await browser.close()
}

console.log(`Generated ${ids.length} template thumbnail(s): ${ids.join(', ')}`)

async function generateThumbnail(browser, id) {
  const page = await browser.newPage()
  try {
    const avatar = resolveAvatarForTemplate(id)
    const url = `${baseUrl}/dev/scenario-loader?tpl=${encodeURIComponent(id)}&scenario=${encodeURIComponent(scenario)}${avatar ? `&avatar=${encodeURIComponent(avatar)}` : ''}`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    if (scenario === 'cover') {
      await page.waitForFunction(() => {
        const preview = document.querySelector('[data-scenario-preview="true"]')
        return preview?.textContent?.includes('智小简')
      }, { timeout: 15000 })
    }
    if (id === 'ziji' && scenario === 'cover' && avatar) {
      await page.waitForFunction((expectedAvatar) => {
        const avatarImage = document.querySelector('[data-scenario-preview="true"] .ziji-avatar img')
        return avatarImage?.getAttribute('src') === expectedAvatar
      }, { timeout: 15000 }, avatar)
    }
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready
      await Promise.all(Array.from(document.images).map((img) => {
        if (img.complete) return Promise.resolve()
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        })
      }))
    })
    const element = await page.waitForSelector('[data-scenario-preview="true"]', { timeout: 30000 })
    const png = await element.screenshot({ type: 'png' })
    const outputPath = path.join(outputDir, `template_${id}.webp`)
    const normalized = await normalizeToThumbnailRatio(png, width, height)
    await sharp(normalized)
      .resize(width, height, { fit: 'fill' })
      .webp({ quality, effort: 5 })
      .toFile(outputPath)
    console.log(`- ${id}: ${relative(outputPath)}`)
  } finally {
    await page.close()
  }
}

function resolveAvatarForTemplate(id) {
  if (args.avatar === 'none') return ''
  if (args.avatar) return args.avatar
  if (id === 'ziji' && scenario === 'cover') return zijiCoverAvatar
  return defaultAvatar
}

async function normalizeToThumbnailRatio(png, width, height) {
  const image = sharp(png)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) return png

  const targetSourceHeight = Math.round(metadata.width * height / width)
  if (metadata.height === targetSourceHeight) return png

  if (metadata.height < targetSourceHeight) {
    return sharp(png)
      .extend({
        top: 0,
        bottom: targetSourceHeight - metadata.height,
        left: 0,
        right: 0,
        background: '#ffffff',
      })
      .toBuffer()
  }

  return sharp(png)
    .extract({
      left: 0,
      top: 0,
      width: metadata.width,
      height: targetSourceHeight,
    })
    .toBuffer()
}

function getSvgTemplateIds() {
  if (!fs.existsSync(templateLoaderPath)) return []
  const source = fs.readFileSync(templateLoaderPath, 'utf8')
  const matches = [...source.matchAll(/^\s{2}([a-zA-Z0-9_-]+):\s*\{[\s\S]*?preview:\s*'\/thumbnails\/template_\1\.svg'/gm)]
  return matches.map((match) => match[1])
}

function getRegisteredTemplateIds() {
  if (!fs.existsSync(templateLoaderPath)) return []
  const source = fs.readFileSync(templateLoaderPath, 'utf8')
  const registryStart = source.indexOf('export const TEMPLATE_REGISTRY')
  if (registryStart < 0) return []
  const registrySource = source.slice(registryStart)
  return [...registrySource.matchAll(/\n\s{2}([a-zA-Z0-9_-]+)\s*:\s*\{/g)].map((match) => match[1])
}

async function assertServer(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    throw new Error(`Cannot reach ${url}. Start the dev server before generating thumbnails. ${error.message}`)
  }
}

function parseArgs(argv) {
  const parsed = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      parsed._.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }
  return parsed
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/')
}
