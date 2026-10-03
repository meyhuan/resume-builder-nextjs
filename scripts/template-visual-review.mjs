import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// Contact sheets supplement (never replace) inspection of full-size artifacts.
const mode = process.argv[2] || 'reference'
const flags = new Map()
for (let index = 3; index < process.argv.length; index += 2) flags.set(process.argv[index], process.argv[index + 1])
const source = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const publicIds = [...source.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)].filter(([, , block]) => /catalog: true/.test(block)).map(([, id]) => id)
const refs = 'docs/template-references/canva-batch-2026-09-28'
const referencePath = (id) => [`${refs}/${id}-reference.jpg`, `docs/template-references/legacy-2026-10-01/${id}/reference.png`, ...(id === 'zhangxu' ? ['docs/template-references/canva-shortlist-2026-09-28/EAGFYt00kMw-original.png'] : [])].find((file) => fs.existsSync(file))
const selectedIds = flags.has('--ids') ? flags.get('--ids').split(',') : publicIds
if (selectedIds.some((id) => !publicIds.includes(id))) throw new Error('Only current public template IDs may be reviewed.')
const ids = mode === 'reference' ? selectedIds.filter((id) => referencePath(id)) : selectedIds
const pdfRecords = ['pdf-offline', 'pdf-pages'].includes(mode) ? JSON.parse(fs.readFileSync(flags.get('--pdf-report') || 'test-artifacts/offline-pdf-review-2026-10-01/results.json', 'utf8')).results : []
function pdfPanel(id, fixture, theme, page) {
  const record = pdfRecords.find((item) => item.id === id && item.fixture === fixture && item.theme === theme)
  return [`${fixture} ${theme} p${page} (snapshot)`, record?.rendered?.[page - 1]]
}
const out = path.resolve(flags.get('--output') || 'test-artifacts/visual-review')
fs.mkdirSync(out, { recursive: true })
if (mode === 'pdf-pages') {
  // Preserve each rendered page at its original resolution, including page 3+.
  // These two-page sheets are for visual inspection, not automated approval.
  const pages = pdfRecords.filter((record) => ids.includes(record.id)).flatMap((record) => {
    if (record.status !== 'pass' || record.rendered?.length !== record.pages.length) throw new Error(`Incomplete PDF render: ${record.id} / ${record.fixture} / ${record.theme}`)
    return record.rendered.map((file, index) => ({ file, label: `${record.id} / ${record.fixture} ${record.theme} / p${index + 1}` }))
  })
  const sheets = []
  for (let index = 0; index < pages.length; index += 2) {
    const group = pages.slice(index, index + 2)
    const dimensions = await Promise.all(group.map(({ file }) => sharp(file).metadata()))
    const sheetWidth = dimensions.reduce((sum, item) => sum + item.width, 0)
    const sheetHeight = Math.max(...dimensions.map((item) => item.height)) + 32
    const composite = []
    let left = 0
    for (let p = 0; p < group.length; p++) {
      const item = group[p]
      composite.push({ input: Buffer.from(`<svg width="${dimensions[p].width}" height="32"><rect width="100%" height="100%" fill="#e8edf3"/><text x="10" y="22" font-family="Arial" font-size="16" fill="#172033">${item.label}</text></svg>`), left, top: 0 })
      composite.push({ input: item.file, left, top: 32 })
      left += dimensions[p].width
    }
    const output = path.join(out, `pdf-pages-${String(index / 2 + 1).padStart(3, '0')}.png`)
    await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 4, background: '#fff' } }).composite(composite).png().toFile(output)
    sheets.push({ file: output, pages: group })
  }
  fs.writeFileSync(path.join(out, 'pdf-pages-manifest.json'), JSON.stringify({ pdfReport: flags.get('--pdf-report'), pages: pages.length, sheets }, null, 2))
  console.log(`Prepared ${pages.length} original-resolution PDF pages in ${sheets.length} sheets: ${out}`)
} else {
const width = 300
const height = 424
const panelsPerTemplate = mode === 'reference' ? 2 : mode === 'catalog' ? 1 : 4
const groupSize = mode === 'reference' ? 3 : mode === 'catalog' ? 5 : 2
function label(value) { return Buffer.from(`<svg width="${width}" height="32"><rect width="100%" height="100%" fill="#e8edf3"/><text x="10" y="22" font-family="Arial" font-size="16" fill="#172033">${value}</text></svg>`) }
for (let i = 0; i < ids.length; i += groupSize) {
  const group = ids.slice(i, i + groupSize)
  const composite = []
  for (const [index, id] of group.entries()) {
    const panels = mode === 'reference'
      ? [['reference', referencePath(id)], ['adaptation', `test-artifacts/template-thumbnails/${id}-full.png`]]
      : mode === 'catalog' ? [['same-data cover', `test-artifacts/template-thumbnails/${id}-full.png`]]
      : mode === 'pdf-offline' ? [pdfPanel(id, 'long', 'compact', 1), pdfPanel(id, 'long', 'compact', 2), pdfPanel(id, 'sparse', 'base', 1), pdfPanel(id, 'sparse', 'relaxed', 1)]
      : [['PC', `test-artifacts/templates/${id}/local-pc-full.png`], ['mobile', `test-artifacts/templates/${id}/local-mobile-full.png`], ['long', `test-artifacts/templates/${id}/local-long.png`], ['PDF tail', `test-artifacts/templates/${id}/local-pdf-long-compact-last-page.png`]]
    for (const [p, [title, file]] of panels.entries()) {
      const left = (index * panelsPerTemplate + p) * width
      composite.push({ input: label(`${id} / ${title}`), left, top: 0 })
      if (mode === 'pdf-offline' && !file) {
        composite.push({ input: Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff3f3"/><text x="15" y="60" font-family="Arial" font-size="18" fill="#b91c1c">MISSING PDF PAGE</text></svg>`), left, top: 32 })
        continue
      }
      if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`)
      composite.push({ input: await sharp(file).resize(width, height, { fit: 'contain', background: '#fff' }).png().toBuffer(), left, top: 32 })
    }
    if (mode === 'reference') await sharp(`test-artifacts/template-thumbnails/${id}-full.png`).resize(1131, 1600, { fit: 'fill' }).png().toFile(path.join(out, `${id}-normalized.png`))
  }
  const output = path.join(out, `${mode}-${String(i / groupSize + 1).padStart(2, '0')}.png`)
  await sharp({ create: { width: width * panelsPerTemplate * group.length, height: height + 32, channels: 4, background: '#fff' } }).composite(composite).png().toFile(output)
  console.log(output)
}
}
