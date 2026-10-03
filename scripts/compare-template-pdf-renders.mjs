import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// Reuse only pixel-identical pages from an explicitly reviewed historical run.
// Changes require fresh visual review; hashes do not approve new images.
const [currentFile, previousFile] = process.argv.slice(2)
assert.ok(currentFile && previousFile, 'Pass current and previously reviewed PDF audit results')
assert.ok(fs.existsSync(path.join(path.dirname(previousFile), 'visual-signoff.md')), 'Historical visual sign-off is required')
const current = JSON.parse(fs.readFileSync(currentFile, 'utf8'))
const previous = JSON.parse(fs.readFileSync(previousFile, 'utf8'))
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const pages = []
for (const record of current.results) {
  assert.ok(record.status === 'pass' && record.currentCodeProven && record.rendered.length === record.pages.length)
  const old = previous.results.find((item) => item.id === record.id && item.fixture === record.fixture && item.theme === record.theme)
  record.rendered.forEach((file, index) => {
    const historical = old?.rendered?.[index]
    const sha256 = digest(file)
    pages.push({ id: record.id, fixture: record.fixture, theme: record.theme, page: index + 1, file, sha256,
      historical: historical || null, identical: Boolean(historical && fs.existsSync(historical) && digest(historical) === sha256) })
  })
}
const output = path.join(path.dirname(path.resolve(currentFile)), 'visual')
fs.mkdirSync(output, { recursive: true })
const changed = pages.filter((page) => !page.identical)
const sheets = []
for (let start = 0; start < changed.length; start += 2) {
  const group = changed.slice(start, start + 2)
  const dimensions = await Promise.all(group.map((item) => sharp(item.file).metadata()))
  const composites = []
  let left = 0
  group.forEach((item, index) => {
    const label = `${item.id} / ${item.fixture} ${item.theme} / p${item.page}`
    composites.push({ input: Buffer.from(`<svg width="${dimensions[index].width}" height="32"><rect width="100%" height="100%" fill="#e8edf3"/><text x="8" y="22" font-size="16">${label}</text></svg>`), left, top: 0 })
    composites.push({ input: item.file, left, top: 32 })
    left += dimensions[index].width
  })
  const file = path.join(output, `changed-${String(start / 2 + 1).padStart(3, '0')}.png`)
  await sharp({ create: { width: left, height: Math.max(...dimensions.map((item) => item.height)) + 32, channels: 3, background: '#fff' } }).composite(composites).png().toFile(file)
  sheets.push({ file, pages: group })
}
fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify({ currentFile: path.resolve(currentFile), previousFile: path.resolve(previousFile), totalPages: pages.length, identicalPages: pages.filter((page) => page.identical).length, changedPages: changed.length, pages, sheets }, null, 2))
console.log(`${pages.length} pages: ${pages.length - changed.length} identical to signed-off images; ${changed.length} require visual review in ${sheets.length} original-resolution sheets: ${output}`)
