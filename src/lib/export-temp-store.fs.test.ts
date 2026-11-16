import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { join } from 'node:path'

const testState = vi.hoisted(() => ({
  root: '',
  afterWrite: undefined as undefined | ((path: string, data: unknown) => Promise<void>),
}))
vi.mock('os', () => ({ tmpdir: () => testState.root }))
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises')
  return {
    ...actual,
    writeFile: async (...args: Parameters<typeof actual.writeFile>) => {
      if (typeof args[0] !== 'string' || !args[0].startsWith(`${testState.root}/`)) throw new Error('test filesystem scope violated')
      await actual.writeFile(...args)
      await testState.afterWrite?.(args[0], args[1])
    },
  }
})

const payload = { buffer: Buffer.from('real filesystem image bytes'), fileName: 'resume', contentType: 'image/png', extension: 'png', type: 'image' as const }
let store: typeof import('./export-temp-store')
let fs: typeof import('fs/promises')

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(async () => {
  fs = await vi.importActual('fs/promises')
  const os = await vi.importActual<typeof import('os')>('os')
  testState.root = await fs.mkdtemp(join(os.tmpdir(), 'export-temp-regression-'))
  testState.afterWrite = undefined
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.resetModules()
  store = await import('./export-temp-store')
})
afterEach(async () => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  await fs.rm(testState.root, { recursive: true, force: true })
})

it('survives concurrent cleanup on a real isolated filesystem', async () => {
  const entered = deferred()
  const release = deferred()
  let paused = false
  testState.afterWrite = async (_path, data) => {
    if (!paused && Buffer.isBuffer(data)) { paused = true; entered.resolve(); await release.promise }
  }
  const pending = store.saveExportTemp(payload)
  await entered.promise
  vi.resetModules()
  const workerB = await import('./export-temp-store')
  const b = await workerB.saveExportTemp(payload)
  release.resolve()
  const a = await pending
  expect((await store.readExportTemp(a.token))?.buffer).toEqual(payload.buffer)
  expect((await workerB.readExportTemp(b.token))?.buffer).toEqual(payload.buffer)
  expect(await fs.readdir(join(testState.root, 'aijianli-export-temp', '.staging'))).toEqual([])
})

it('keeps existing complete metadata during a real confirmation write', async () => {
  const saved = await store.saveExportTemp(payload)
  const entered = deferred()
  const release = deferred()
  testState.afterWrite = async (_path, data) => {
    if (typeof data === 'string' && data.includes('"confirmed":true')) { entered.resolve(); await release.promise }
  }
  const confirmation = store.markConfirmed(saved.token, 'renamed')
  await entered.promise
  expect((await store.readExportTemp(saved.token))?.confirmed).toBe(false)
  release.resolve()
  expect((await confirmation)?.confirmed).toBe(true)
  expect(await store.readExportTemp(saved.token)).toMatchObject({ confirmed: true, fileName: 'renamed', buffer: payload.buffer })
})

it('remains readable after many overlapping saves without changing asset names', async () => {
  const saves = await Promise.all(Array.from({ length: 20 }, () => store.saveExportTemp(payload)))
  expect(new Set(saves.map((s) => s.token)).size).toBe(20)
  for (const saved of saves) {
    expect(saved.token).toMatch(/^[a-f0-9]{32}$/)
    expect((await store.readExportTemp(saved.token))?.buffer).toEqual(payload.buffer)
  }
})
