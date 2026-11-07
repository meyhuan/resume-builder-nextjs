import {
  spawn,
  execFile,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createInterface } from 'node:readline'
import type { ExportProgressListener } from './export-progress'

interface Worker {
  child: ChildProcessWithoutNullStreams
  ready: Promise<void>
  pending?: { id: number; resolve: () => void; reject: (error: Error) => void }
  directory: string
  stopped: boolean
}
interface State {
  worker?: Worker
  starting?: Promise<Worker>
  tail: Promise<void>
  queued: number
  serial: number
  idle?: ReturnType<typeof setTimeout>
}
const runtime = globalThis as typeof globalThis & {
  __wordPreviewWorker?: State
}
const state = (runtime.__wordPreviewWorker ??= {
  tail: Promise.resolve(),
  queued: 0,
  serial: 0,
})
const error = () => new Error('Word 预览服务暂不可用，请重试')
const workerRoot = () => join(tmpdir(), 'aijianli-word-workers')

async function stop(worker: Worker): Promise<void> {
  if (worker.stopped) return
  worker.stopped = true
  if (state.worker === worker) state.worker = undefined
  worker.pending?.reject(error())
  worker.pending = undefined
  // Only terminate the process tree spawned by this worker, never other Office sessions.
  if (worker.child.pid && worker.child.exitCode === null) {
    if (process.platform === 'win32')
      await new Promise<void>((done) => {
        execFile(
          'taskkill',
          ['/PID', String(worker.child.pid), '/T', '/F'],
          { windowsHide: true },
          () => done(),
        )
      })
    else {
      try {
        process.kill(-worker.child.pid, 'SIGKILL')
      } catch {
        /* already exited */
      }
    }
  }
  const root = resolve(workerRoot())
  const directory = resolve(worker.directory)
  if (
    dirname(directory) === root &&
    directory.startsWith(join(root, 'worker-'))
  ) {
    await rm(directory, { recursive: true, force: true, maxRetries: 3 }).catch(
      () => undefined,
    )
  }
}

function scheduleIdle(): void {
  clearTimeout(state.idle)
  if (state.queued) return
  state.idle = setTimeout(() => {
    if (state.worker && !state.queued) void stop(state.worker)
  }, 10 * 60_000)
  state.idle.unref()
}

async function start(): Promise<Worker> {
  if (state.worker && !state.worker.stopped) return state.worker
  if (state.starting) return state.starting
  state.starting = (async () => {
    const binary =
      process.env.LIBREOFFICE_PATH ||
      (process.platform === 'win32'
        ? 'C:/Program Files/LibreOffice/program/soffice.com'
        : 'soffice')
    const python =
      process.env.LIBREOFFICE_PYTHON_PATH ||
      (process.platform === 'win32'
        ? join(dirname(binary), 'python.exe')
        : 'python3')
    // Do not let build-time dependency tracing scan the system temp directory.
    const root = workerRoot()
    await mkdir(root, { recursive: true })
    const directory = await mkdtemp(join(root, 'worker-'))
    await mkdir(join(directory, 'profile'))
    const child = spawn(
      python,
      [
        '-u',
        join(process.cwd(), 'scripts/word-preview-worker.py'),
        binary,
        join(directory, 'profile'),
      ],
      {
        windowsHide: true,
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )
    let readyResolve!: () => void
    let readyReject!: (error: Error) => void
    const ready = new Promise<void>((resolve, reject) => {
      readyResolve = resolve
      readyReject = reject
    })
    const worker: Worker = { child, ready, directory, stopped: false }
    const startupTimer = setTimeout(() => {
      readyReject(error())
      void stop(worker)
    }, 65_000)
    child.stderr.on('data', (data) => {
      if (process.env.WORD_PREVIEW_DEBUG === '1')
        console.log('[word-worker]', String(data).trim())
    })
    child.stdin.on('error', () => {
      worker.pending?.reject(error())
      void stop(worker)
    })
    const lines = createInterface({ input: child.stdout })
    lines.on('line', (line) => {
      try {
        const result = JSON.parse(line)
        if (process.env.WORD_PREVIEW_DEBUG === '1')
          console.log('[word-worker] response', {
            id: result.id,
            ready: result.ready,
            pending: worker.pending?.id,
          })
        if (result.ready) {
          clearTimeout(startupTimer)
          readyResolve()
        } else if (worker.pending?.id === result.id) {
          const pending = worker.pending!
          worker.pending = undefined
          if (result.ok) pending.resolve()
          else pending.reject(error())
        }
      } catch {
        readyReject(error())
        void stop(worker)
      }
    })
    const failed = () => {
      clearTimeout(startupTimer)
      readyReject(error())
      void stop(worker)
    }
    child.on('error', failed)
    child.on('exit', failed)
    try {
      await ready
      state.worker = worker
      scheduleIdle()
      return worker
    } catch (failure) {
      await stop(worker)
      throw failure
    }
  })().finally(() => {
    state.starting = undefined
  })
  return state.starting
}

export async function prewarmWordPreview(): Promise<void> {
  await start()
}

export async function convertWordToPdf(
  input: string,
  output: string,
  progress: ExportProgressListener = () => {},
): Promise<void> {
  if (state.queued >= 3) throw new Error('Word 预览任务较多，请稍后重试')
  clearTimeout(state.idle)
  progress(state.queued ? 'queued' : state.worker ? 'converting' : 'warming')
  state.queued++
  const previous = state.tail
  let release!: () => void
  state.tail = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await previous
    if (!state.worker) progress('warming')
    const worker = await start()
    progress('converting')
    const id = ++state.serial
    if (process.env.WORD_PREVIEW_DEBUG === '1')
      console.log('[word-worker] request', {
        id,
        pid: worker.child.pid,
        stopped: worker.stopped,
      })
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(error())
        void stop(worker)
      }, 30_000)
      worker.pending = {
        id,
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      }
      worker.child.stdin.write(JSON.stringify({ id, input, output }) + '\n')
    })
  } finally {
    state.queued--
    release()
    scheduleIdle()
  }
}

export async function shutdownWordPreview(): Promise<void> {
  await state.tail
  if (state.starting) await state.starting.catch(() => undefined)
  clearTimeout(state.idle)
  if (state.worker) await stop(state.worker)
}
