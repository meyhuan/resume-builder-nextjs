import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const flags = new Map()
for (let index = 2; index < process.argv.length; index++) {
  if (process.argv[index] === '--render') flags.set('--render', true)
  else flags.set(process.argv[index], process.argv[++index])
}
const metadata = fs.readFileSync('src/lib/templates/template-metadata.ts', 'utf8')
const publicIds = [...metadata.matchAll(/^  ([a-z\d_-]+): \{([\s\S]*?)^  \},/gm)].filter(([, , block]) => /catalog: true/.test(block)).map(([, id]) => id)
const ids = flags.has('--ids') ? flags.get('--ids').split(',') : publicIds
if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !publicIds.includes(id))) throw new Error('Specify unique current public template IDs.')
const files = ids.flatMap((id) => [['sparse', 'base'], ['sparse', 'relaxed'], ['long', 'compact']].map(([fixture, theme]) => ({ id, fixture, theme, path: path.resolve(`test-artifacts/templates/${id}/local-pdf-${fixture}-${theme}.pdf`) })))
if (flags.has('--release-run')) {
  const runPath = path.resolve(flags.get('--release-run'))
  const run = JSON.parse(fs.readFileSync(runPath, 'utf8'))
  const snapshot = JSON.parse(fs.readFileSync(path.join(path.dirname(runPath), 'source-snapshot.json'), 'utf8'))
  if (!run.complete || !run.allRuntimePassed || !run.sourceUnchanged || !run.servedBuildVerified || snapshot.digest !== run.sourceDigest || snapshot.localBuildId !== run.localBuildId) throw new Error('PDF evidence requires a completed, unchanged, passing production QA batch.')
  if (fs.readFileSync('.next/BUILD_ID', 'utf8').trim() !== run.localBuildId) throw new Error('Local build changed after the QA batch.')
  for (const file of snapshot.files) {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex')
    if (digest !== file.sha256) throw new Error(`Source changed after QA: ${file.path}`)
  }
  const currentSrcPaths = []
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) collect(file)
      else currentSrcPaths.push(file.replaceAll('\\', '/'))
    }
  }
  collect('src')
  const testedSrcPaths = snapshot.files.filter((file) => file.path.startsWith('src/')).map((file) => file.path)
  if (JSON.stringify(currentSrcPaths.sort()) !== JSON.stringify(testedSrcPaths.sort())) throw new Error('The source file set changed after QA.')
  for (const file of files) {
    const result = run.results.find((item) => item.id === file.id && item.exitCode === 0)
    if (!result || !run.ids.includes(file.id)) throw new Error(`No passing QA record for ${file.id}`)
    const mtime = fs.statSync(file.path).mtimeMs
    if (mtime < Date.parse(result.startedAt) - 2000 || mtime > Date.parse(result.finishedAt) + 2000) throw new Error(`PDF does not belong to the specified QA run: ${file.path}`)
    file.releaseEvidence = { runPath, buildId: run.localBuildId, sourceDigest: run.sourceDigest, startedAt: result.startedAt, finishedAt: result.finishedAt }
  }
}
function newestSource(directory) {
  return Math.max(...fs.readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? newestSource(file) : /\.(ts|tsx)$/.test(entry.name) ? fs.statSync(file).mtimeMs / 1000 : 0
  }), 0)
}
const args = ['scripts/audit-template-pdfs.py', '--poppler', flags.get('--poppler'), '--output', flags.get('--output') || 'test-artifacts/offline-pdf-review-2026-10-01']
if (!flags.has('--poppler')) throw new Error('Pass --poppler with the available pdftoppm executable path.')
if (flags.has('--render')) args.push('--render')
const result = spawnSync(flags.get('--python') || 'python', args, {
  input: JSON.stringify({ files, latestTemplateChange: newestSource('src/templates') }), encoding: 'utf8', maxBuffer: 12 * 1024 * 1024,
})
if (result.error) throw result.error
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
process.exitCode = result.status ?? 1
