import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

// Copies the user-provided reference unchanged into the QA source archive.
// Never imports its images or text into the product's public assets.
const [id, input, origin, sourceId = ''] = process.argv.slice(2)
if (!/^[a-z][a-z0-9_-]*$/.test(id || '') || !input || !origin) {
  throw new Error('Usage: node scripts/archive-template-reference.mjs <id> <svg-path> <origin-description> [source-id]')
}
const sourcePath = path.resolve(input)
const source = fs.readFileSync(sourcePath)
const hash = crypto.createHash('sha256').update(source).digest('hex')
const text = source.toString('utf8')
if (!/<svg\b/.test(text)) throw new Error('Expected an SVG reference.')
const directory = path.resolve('docs/template-references/legacy-2026-10-01', id)
const archived = path.join(directory, 'reference.svg')
fs.mkdirSync(directory, { recursive: true })
if (fs.existsSync(archived) && !fs.readFileSync(archived).equals(source)) {
  throw new Error(`Refusing to replace a different archived source: ${archived}`)
}
fs.copyFileSync(sourcePath, archived)
const root = text.match(/<svg\b[^>]*>/)?.[0] || ''
const attribute = (name) => root.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || null
await sharp(source).resize({ width: 794 }).png().toFile(path.join(directory, 'reference.png'))
const bitmap = await sharp(path.join(directory, 'reference.png')).metadata()
const record = {
  id, origin, sourceId: sourceId || null, originalFile: path.basename(sourcePath),
  sourceIdKind: sourceId.startsWith('DA') ? 'Canva design ID, not a public template ID' : sourceId.startsWith('EA') ? 'Canva public template ID' : 'Unconfirmed public template ID',
  sha256: hash, bytes: source.length, width: attribute('width'), height: attribute('height'), viewBox: attribute('viewBox'),
  textNodes: (text.match(/<text\b/g) || []).length,
  pathNodes: (text.match(/<path\b/g) || []).length,
  imageNodes: (text.match(/<image\b/g) || []).length,
  externalImageReferences: [...text.matchAll(/(?:xlink:)?href="(https?:[^"\s]+)"/g)].map((match) => match[1]),
  rendered: { width: bitmap.width, height: bitmap.height },
  purpose: 'Source measurement and visual QA only; no permission or authorship conclusion implied.',
}
fs.writeFileSync(path.join(directory, 'source.json'), JSON.stringify(record, null, 2) + '\n')
console.log(JSON.stringify(record, null, 2))
