import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { basename, dirname, join } from 'node:path'
import * as fs from 'fs/promises'

interface MemoryFile { data: Buffer; mtimeMs: number }
const memory = vi.hoisted(() => ({
  files: new Map<string, MemoryFile>(),
  directories: new Set<string>(),
  sequence: 0,
  afterWrite: undefined as undefined | ((path: string, file: MemoryFile) => Promise<void>),
  afterRename: undefined as undefined | ((from: string, to: string) => Promise<void>),
  failRename: undefined as undefined | ((from: string, to: string) => boolean),
}))
const missing = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
vi.mock('os', () => ({ tmpdir: () => '/memory' }))
vi.mock('crypto', () => ({
  randomBytes: (size: number) => Buffer.from((++memory.sequence).toString(16).padStart(size * 2, '0'), 'hex'),
}))
vi.mock('fs/promises', () => ({
  mkdir: async (path: string) => { memory.directories.add(path) },
  writeFile: async (path: string, data: string | Buffer) => {
    const file = { data: Buffer.from(data), mtimeMs: Date.now() }
    memory.files.set(path, file)
    await memory.afterWrite?.(path, file)
  },
  readFile: async (path: string, encoding?: string) => {
    const file = memory.files.get(path)
    if (!file) throw missing()
    return encoding ? file.data.toString(encoding as BufferEncoding) : file.data
  },
  readdir: async (path: string) => {
    if (!memory.directories.has(path)) throw missing()
    return [...memory.files.keys(), ...memory.directories]
      .filter((entry) => entry !== path && dirname(entry) === path).map((entry) => basename(entry))
  },
  stat: async (path: string) => {
    const file = memory.files.get(path)
    if (file) return { mtimeMs: file.mtimeMs }
    if (memory.directories.has(path)) return { mtimeMs: Date.now() }
    throw missing()
  },
  unlink: async (path: string) => {
    if (memory.directories.has(path)) throw new Error('EISDIR')
    if (!memory.files.delete(path)) throw missing()
  },
  rename: async (from: string, to: string) => {
    if (memory.failRename?.(from, to)) throw new Error('rename failed')
    const file = memory.files.get(from)
    if (!file) throw missing()
    memory.files.set(to, file)
    memory.files.delete(from)
    await memory.afterRename?.(from, to)
  },
}))

const root = '/memory/aijianli-export-temp'
const payload = { buffer: Buffer.from('image bytes'), fileName: 'resume', contentType: 'image/png', extension: 'png', type: 'image' as const }
type Store = typeof import('./export-temp-store')
let store: Store

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

async function anotherWorker(): Promise<Store> {
  vi.resetModules()
  return import('./export-temp-store')
}

// The pre-fix cleaner from main 8a1474f, using the same mocked filesystem.
// This is deliberately not the fixed cleaner: mixed workers must not delete
// the new writer's staging directory or partly published asset.
async function legacyCleanup(): Promise<void> {
  const files = await fs.readdir(root)
  await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
    const token = file.replace(/\.json$/, '')
    try {
      const meta = JSON.parse(await fs.readFile(join(root, file), 'utf8'))
      if (meta.expiresAt < Date.now()) {
        await fs.unlink(join(root, file)).catch(() => undefined)
        await fs.unlink(join(root, `${token}.${meta.extension}`)).catch(() => undefined)
      }
    } catch {
      await fs.unlink(join(root, file)).catch(() => undefined)
    }
  }))
  await Promise.all(files.filter((file) => !file.endsWith('.json')).map(async (file) => {
    const token = file.replace(/\.[^.]+$/, '')
    const metaExists = await fs.stat(join(root, `${token}.json`)).then(() => true).catch(() => false)
    if (!metaExists) await fs.unlink(join(root, file)).catch(() => undefined)
  }))
}

beforeEach(async () => {
  memory.files.clear()
  memory.directories.clear()
  memory.sequence = 0
  memory.afterWrite = undefined
  memory.afterRename = undefined
  memory.failRename = undefined
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-16T00:00:00Z'))
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  store = await anotherWorker()
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks() })

it('keeps A readable when another worker cleans between A binary and metadata writes', async () => {
  const entered = deferred()
  const release = deferred()
  let paused = false
  memory.afterWrite = async (_path, file) => {
    if (!paused && file.data.equals(payload.buffer)) {
      paused = true
      entered.resolve()
      await release.promise
    }
  }
  const pending = store.saveExportTemp(payload)
  await entered.promise
  const workerB = await anotherWorker()
  const b = await workerB.saveExportTemp(payload)
  release.resolve()
  const a = await pending
  expect((await store.readExportTemp(a.token))?.buffer).toEqual(payload.buffer)
  expect((await workerB.readExportTemp(b.token))?.buffer).toEqual(payload.buffer)
})

it('keeps active staged data safe from the periodic cleaner', async () => {
  const entered = deferred()
  const release = deferred()
  memory.afterWrite = async (_path, file) => {
    if (file.data.equals(payload.buffer)) { entered.resolve(); await release.promise }
  }
  const pending = store.saveExportTemp(payload)
  await entered.promise
  await vi.advanceTimersByTimeAsync(60_000)
  release.resolve()
  const a = await pending
  expect((await store.readExportTemp(a.token))?.buffer).toEqual(payload.buffer)
})

it.each(['staged binary', 'published metadata', 'published binary'])('survives legacy cleanup after %s', async (checkpoint) => {
  const entered = deferred()
  const release = deferred()
  memory.afterWrite = async (_path, file) => {
    if (checkpoint === 'staged binary' && file.data.equals(payload.buffer)) { entered.resolve(); await release.promise }
  }
  memory.afterRename = async (_from, to) => {
    if ((checkpoint === 'published metadata' && to.endsWith('.json')) ||
        (checkpoint === 'published binary' && to.endsWith('.png'))) { entered.resolve(); await release.promise }
  }
  const pending = store.saveExportTemp(payload)
  await entered.promise
  const orphan = join(root, `${'f'.repeat(32)}.png`)
  memory.files.set(orphan, { data: Buffer.from('old orphan'), mtimeMs: Date.now() })
  await legacyCleanup()
  expect(memory.files.has(orphan)).toBe(false) // Prove that cleanup really ran.
  release.resolve()
  const saved = await pending
  expect((await store.readExportTemp(saved.token))?.buffer).toEqual(payload.buffer)
})

it('publishes no binary without complete metadata and tolerates cleanup between renames', async () => {
  const entered = deferred()
  const release = deferred()
  let paused = false
  memory.afterRename = async (_from, to) => {
    if (to.endsWith('.json') && !paused) { paused = true; entered.resolve(); await release.promise }
    if (to.endsWith('.png')) expect(memory.files.has(to.replace(/\.png$/, '.json'))).toBe(true)
  }
  const pending = store.saveExportTemp(payload)
  await entered.promise
  expect([...memory.files.keys()].filter((p) => dirname(p) === root && p.endsWith('.png'))).toEqual([])
  await (await anotherWorker()).saveExportTemp(payload)
  release.resolve()
  const a = await pending
  expect((await store.readExportTemp(a.token))?.buffer).toEqual(payload.buffer)
})

it('does not expose partial confirmation metadata to readers or cleanup', async () => {
  const saved = await store.saveExportTemp(payload)
  const entered = deferred()
  const release = deferred()
  let paused = false
  memory.afterWrite = async (_path, file) => {
    if (!paused && file.data.toString().includes('"confirmed":true')) {
      paused = true
      const full = file.data
      file.data = Buffer.from('{"expiresAt":')
      entered.resolve()
      await release.promise
      file.data = full
    }
  }
  const pending = store.markConfirmed(saved.token, 'renamed')
  await entered.promise
  const workerB = await anotherWorker()
  await workerB.saveExportTemp(payload)
  await legacyCleanup()
  expect((await workerB.readExportTemp(saved.token))?.confirmed).toBe(false)
  release.resolve()
  expect((await pending)?.confirmed).toBe(true)
  const read = await store.readExportTemp(saved.token)
  expect(read?.confirmed).toBe(true)
  expect(read?.fileName).toBe('renamed')
  expect(read?.buffer).toEqual(payload.buffer)
})

it.each(['data write', 'metadata write', 'metadata rename', 'data rename'])('rejects %s failure and cleans unpublished files', async (failure) => {
  memory.afterWrite = async (_path, file) => {
    if ((failure === 'data write' && file.data.equals(payload.buffer)) ||
        (failure === 'metadata write' && file.data.toString().startsWith('{'))) throw new Error('write failed')
  }
  memory.failRename = (_from, to) => failure === 'metadata rename' ? to.endsWith('.json') : failure === 'data rename' && to.endsWith('.png')
  await expect(store.saveExportTemp(payload)).rejects.toThrow(/failed/)
  expect([...memory.files.keys()]).toEqual([])
})

it('keeps old confirmed metadata and data when a confirmation rename fails', async () => {
  const saved = await store.saveExportTemp({ ...payload, confirmed: true })
  memory.failRename = (_from, to) => to.endsWith('.json')
  expect(await store.markConfirmed(saved.token, 'different')).toBeNull()
  expect((await store.readExportTemp(saved.token))?.fileName).toBe('resume')
  expect((await store.readExportTemp(saved.token))?.confirmed).toBe(true)
  expect([...memory.files.keys()].filter((p) => p.includes('/.staging/'))).toEqual([])
})

it('reclaims expired staging files, but not active staging or unknown files', async () => {
  const staging = join(root, '.staging')
  memory.directories.add(root)
  memory.directories.add(staging)
  const old = join(staging, `${'a'.repeat(32)}.${'b'.repeat(16)}.tmp`)
  const current = join(staging, `${'c'.repeat(32)}.${'d'.repeat(16)}.tmp`)
  const boundary = join(staging, `${'1'.repeat(32)}.${'2'.repeat(16)}.tmp`)
  const unknown = join(staging, 'unrelated.txt')
  memory.files.set(old, { data: Buffer.from('abandoned'), mtimeMs: Date.now() - store.EXPORT_TEMP_TTL_MS - 1 })
  memory.files.set(current, { data: Buffer.from('active'), mtimeMs: Date.now() })
  memory.files.set(boundary, { data: Buffer.from('boundary'), mtimeMs: Date.now() - store.EXPORT_TEMP_TTL_MS })
  memory.files.set(unknown, { data: Buffer.from('unknown'), mtimeMs: 0 })
  await store.saveExportTemp(payload)
  expect(memory.files.has(old)).toBe(false)
  expect(memory.files.has(current)).toBe(true)
  expect(memory.files.has(boundary)).toBe(true)
  expect(memory.files.has(unknown)).toBe(true)
})

it('preserves the 24-hour TTL and cleans expired assets and legacy orphan files', async () => {
  const saved = await store.saveExportTemp(payload)
  expect(saved.expiresAt - Date.now()).toBe(24 * 60 * 60 * 1000)
  const orphan = join(root, `${'e'.repeat(32)}.png`)
  memory.files.set(orphan, { data: Buffer.from('orphan'), mtimeMs: Date.now() })
  vi.setSystemTime(saved.expiresAt + 1)
  await store.saveExportTemp(payload)
  expect(memory.files.has(orphan)).toBe(false)
  expect(await store.readExportTemp(saved.token)).toBeNull()
  expect(memory.files.has(join(root, `${saved.token}.json`))).toBe(false)
  expect(memory.files.has(join(root, `${saved.token}.png`))).toBe(false)
})

it('preserves metadata, confirmation, previews, and invalid-token handling', async () => {
  const saved = await store.saveExportTemp({ ...payload, previewTokens: ['preview'], wxId: 'test-owner', userId: 'test-user', resumeId: 'test-resume', resumeTitle: 'test-title', templateId: 'test-template' })
  expect(await store.readExportTemp(saved.token)).toMatchObject({ ...payload, confirmed: false, previewTokens: ['preview'], wxId: 'test-owner', userId: 'test-user', resumeId: 'test-resume' })
  expect((await store.markConfirmed(saved.token))?.confirmed).toBe(true)
  expect((await store.markConfirmed(saved.token))?.confirmed).toBe(true)
  expect(await store.readExportTemp('../bad')).toBeNull()
  expect(await store.markConfirmed('../bad')).toBeNull()
})
