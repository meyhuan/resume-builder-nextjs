#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

async function main() {
// Orchestrates the existing QA without skipping any of its runtime checks.
const flags = new Map()
for (let i = 2; i < process.argv.length; i += 2) flags.set(process.argv[i], process.argv[i + 1])
const baseUrl = flags.get('--base-url') || 'http://127.0.0.1:3012'
if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) throw new Error('Fixture QA requires a local server, not a production site.')
const concurrency = Number(flags.get('--concurrency') || 2)
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) throw new Error('--concurrency must be 1, 2 or 3.')
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const publicIds = [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)].filter(([, , block]) => /editor: true/.test(block) && /catalog: true/.test(block)).map(([, id]) => id)
const ids = flags.has('--ids') ? flags.get('--ids').split(',') : publicIds
if (ids.some((id) => !publicIds.includes(id))) throw new Error('Only public template IDs are allowed.')
if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Specify a non-empty, unique template ID set.')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const artifactDir = path.resolve('test-artifacts', 'release-runs', runId)
fs.mkdirSync(artifactDir, { recursive: true })
const results = []
let nextIndex = 0

function sourceSnapshot() {
  const files = []
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else files.push({ path: file.replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })
    }
  }
  visit('src')
  for (const file of ['next.config.ts', 'package.json', 'pnpm-lock.yaml', 'scripts/verify-template.mjs', 'scripts/verify-public-template-release.mjs']) {
    if (fs.existsSync(file)) files.push({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, digest: crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex') }
}
const initialSource = sourceSnapshot()
const buildIdFile = path.join('.next', 'BUILD_ID')
const initialBuildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : null
if (!initialBuildId) throw new Error('Build the production version before running release QA; development output cannot certify it.')
async function inspectServedBuild() {
  const routes = ['/templates', `/dev/scenario-loader?tpl=${ids[0]}`, `/dev/template-lab?tpl=${ids[0]}&fixture=full`]
  return Promise.all(routes.map(async (route) => {
    const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' })
    const html = await response.text()
    return { route, status: response.status, matchesLocalBuild: response.ok && html.includes(initialBuildId) }
  }))
}
const initialServedBuild = await inspectServedBuild()
let servedBuildVerified = initialServedBuild.every((route) => route.matchesLocalBuild)
let finalServedBuild = null
if (!servedBuildVerified) throw new Error(`Server is not serving build ${initialBuildId}; restart it before release QA. ${JSON.stringify(initialServedBuild)}`)
fs.writeFileSync(path.join(artifactDir, 'source-snapshot.json'), JSON.stringify({ ...initialSource, localBuildId: initialBuildId, note: 'Hashes establish the tested source snapshot, not production deployment or visual approval.' }, null, 2))
function persistResults() {
  const currentSource = sourceSnapshot()
  const currentBuildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : null
  const sourceUnchanged = currentSource.digest === initialSource.digest && currentBuildId === initialBuildId
  fs.writeFileSync(path.join(artifactDir, 'results.json'), JSON.stringify({ baseUrl, ids, results,
    sourceDigest: initialSource.digest, localBuildId: initialBuildId, sourceUnchanged,
    servedBuildVerified, initialServedBuild, finalServedBuild,
    complete: results.length === ids.length,
    allRuntimePassed: sourceUnchanged && servedBuildVerified && results.length === ids.length && results.every((result) => result.exitCode === 0),
  }, null, 2))
  return sourceUnchanged
}
persistResults()

async function verify(id) {
  const reference = [
    path.join('docs', 'template-references', 'canva-batch-2026-09-28', `${id}-reference.jpg`),
    path.join('docs', 'template-references', 'legacy-2026-10-01', id, 'reference.png'),
    ...(id === 'zhangxu' ? [path.join('docs', 'template-references', 'canva-shortlist-2026-09-28', 'EAGFYt00kMw-original.png')] : []),
  ].find((file) => fs.existsSync(file))
  const args = ['scripts/verify-template.mjs', id, '--local', '--base-url', baseUrl, '--scenario-loader-url', `${baseUrl}/dev/scenario-loader?tpl=${id}`, '--report']
  if (reference) args.push('--reference-image', reference)
  const command = `${process.execPath} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`
  console.log(`START ${id}`)
  const startedAt = new Date().toISOString()
  const log = fs.createWriteStream(path.join(artifactDir, `${id}.log`))
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', resolve)
  })
  log.end()
  results.push({ id, startedAt, finishedAt: new Date().toISOString(), exitCode, command })
  persistResults()
  console.log(`${exitCode === 0 ? 'PASS' : 'FAIL'} ${id}; ${results.length}/${ids.length}; log: ${path.join(artifactDir, `${id}.log`)}`)
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (nextIndex < ids.length) await verify(ids[nextIndex++])
}))
console.log(`Completed ${results.length} templates; ${results.filter((r) => r.exitCode !== 0).length} failed. Artifacts: ${artifactDir}`)
try {
  finalServedBuild = await inspectServedBuild()
  servedBuildVerified = finalServedBuild.every((route) => route.matchesLocalBuild)
} catch (error) {
  servedBuildVerified = false
  finalServedBuild = { error: error.message }
}
const sourceUnchanged = persistResults()
if (!sourceUnchanged) console.error('Source files or build changed during QA; this batch cannot certify a stable version.')
if (!servedBuildVerified) console.error('Server build changed or became unavailable during QA; this batch cannot certify a stable version.')
process.exitCode = results.some((r) => r.exitCode !== 0) || !sourceUnchanged || !servedBuildVerified ? 1 : 0
}

await main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
