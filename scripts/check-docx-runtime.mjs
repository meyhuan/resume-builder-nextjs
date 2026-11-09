import { createRequire } from 'node:module'
import { platform, arch } from 'node:os'

const require = createRequire(import.meta.url)
const results = []
async function check(name, run) {
  try {
    const detail = await run()
    results.push({ name, passed: true, detail })
  } catch (error) {
    results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) })
  }
}

await check('Node runtime', () => {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 18 || (major === 18 && minor < 18)) {
    throw new Error('Next.js 15 requires Node.js >= 18.18.0')
  }
  if (process.argv.includes('--require-linux') && platform() !== 'linux') {
    throw new Error(`Expected Linux; actual platform: ${platform()}`)
  }
  return { node: process.version, platform: platform(), arch: arch(), glibc: process.report?.getReport().header.glibcVersionRuntime ?? null }
})

await check('sharp native image processing', async () => {
  const { default: sharp } = await import('sharp')
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#537dad' } }).png().toBuffer()
  const metadata = await sharp(png).metadata()
  if (metadata.format !== 'png' || metadata.width !== 1 || metadata.height !== 1) {
    throw new Error('PNG encoding/decoding failed')
  }
  return { version: sharp.versions.sharp, vips: sharp.versions.vips, engines: require('sharp/package.json').engines }
})

await check('DOCX generation in memory', async () => {
  const { Document, Packer, Paragraph } = await import('docx')
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('中文简历 Linux DOCX 运行检查')] }] }))
  if (buffer.subarray(0, 4).toString('hex') !== '504b0304' || buffer.length < 1000) {
    throw new Error('DOCX ZIP generation failed')
  }
  return { bytes: buffer.length }
})

console.log(JSON.stringify({
  passed: results.every(result => result.passed),
  scope: 'Dependency check only; run pnpm docx:smoke for actual resume templates. No output files are written; no remote resources are fetched.',
  checks: results,
}, null, 2))
if (results.some(result => !result.passed)) process.exitCode = 1
