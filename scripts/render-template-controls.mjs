#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const [runFile, poppler] = process.argv.slice(2)
assert.ok(runFile && poppler, 'Pass results.json and pdftoppm executable')
const run = JSON.parse(fs.readFileSync(runFile, 'utf8'))
assert.ok(run.complete && run.allPassed && run.sourceUnchanged, 'Render only a stable completed QA run')
const directory = path.dirname(path.resolve(runFile))
const sheets = path.join(directory, 'visual-review')
fs.mkdirSync(sheets, { recursive: true })
const images = []
for (const item of run.results) {
  for (const test of item.onePageCases) {
    const stem = `${test.viewport}-${test.fixture}-one-page`
    const output = path.join(directory, item.id, `${stem}-render`)
    fs.mkdirSync(output, { recursive: true })
    const result = spawnSync(poppler, ['-r', '96', '-png', path.join(directory, item.id, `${stem}.pdf`), path.join(output, 'page')], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    for (const page of test.pdfPages) {
      const image = path.join(output, `page-${page.pageNumber}.png`)
      assert.ok(fs.existsSync(image))
      images.push({ id: item.id, viewport: test.viewport, fixture: test.fixture, page: page.pageNumber, path: image })
    }
  }
}
// Contact sheets cover every page. Mobile PDFs are also compared pixel-for-pixel
// with their desktop counterpart; identical pages share desktop visual sign-off.
const reviewImages = []
let identicalMobilePages = 0
for (const item of images) {
  const desktop = images.find((other) => other.id === item.id && other.fixture === item.fixture && other.page === item.page && other.viewport === 'pc')
  if (item.viewport === 'mobile' && desktop && fs.readFileSync(item.path).equals(fs.readFileSync(desktop.path))) identicalMobilePages++
  else reviewImages.push(item)
}
const cellWidth = 400
const cellHeight = 590
for (let start = 0; start < reviewImages.length; start += 8) {
  const composites = []
  for (const [index, item] of reviewImages.slice(start, start + 8).entries()) {
    const left = (index % 4) * cellWidth
    const top = Math.floor(index / 4) * cellHeight
    composites.push({ input: await sharp(item.path).resize({ width: 390, height: 555, fit: 'inside' }).png().toBuffer(), left: left + 5, top: top + 25 })
    composites.push({ input: Buffer.from(`<svg width="400" height="25"><rect width="400" height="25" fill="white"/><text x="5" y="18" font-size="13">${item.id} ${item.viewport}/${item.fixture} p${item.page}</text></svg>`), left, top })
  }
  const output = path.join(sheets, `sheet-${String(start / 8 + 1).padStart(2, '0')}.png`)
  await sharp({ create: { width: 1600, height: 1180, channels: 3, background: '#e2e8f0' } }).composite(composites).png().toFile(output)
}
fs.writeFileSync(path.join(sheets, 'index.json'), JSON.stringify({ runFile: path.resolve(runFile), renderedPages: images.length, uniqueReviewPages: reviewImages.length, identicalMobilePages, images, reviewImages }, null, 2))
console.log(`Rendered ${images.length} pages; ${identicalMobilePages} mobile pages pixel-identical; ${Math.ceil(reviewImages.length / 8)} contact sheets: ${sheets}`)
