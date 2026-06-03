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
const avatar = args.avatar === 'none' ? '' : (args.avatar || defaultAvatar)
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
    const url = `${baseUrl}/dev/scenario-loader?tpl=${encodeURIComponent(id)}${avatar ? `&avatar=${encodeURIComponent(avatar)}` : ''}`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
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
    await sharp(png)
      .resize(width, height, {
        fit: 'cover',
        position: 'top',
        background: '#ffffff',
      })
      .webp({ quality, effort: 5 })
      .toFile(outputPath)
    console.log(`- ${id}: ${relative(outputPath)}`)
  } finally {
    await page.close()
  }
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
