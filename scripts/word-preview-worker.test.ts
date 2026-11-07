import { afterEach, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
const mock = vi.hoisted(() => ({
  launches: 0,
  active: 0,
  maxActive: 0,
  hang: false,
}))
vi.mock('node:child_process', () => ({
  spawn: () => {
    mock.launches++
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      pid: undefined,
      exitCode: 0,
      stdin: null as unknown as Writable,
    })
    child.stdin = new Writable({
      write(chunk, _encoding, done) {
        const job = JSON.parse(String(chunk))
        mock.active++
        mock.maxActive = Math.max(mock.maxActive, mock.active)
        if (!mock.hang)
          setTimeout(() => {
            mock.active--
            child.stdout.write(JSON.stringify({ id: job.id, ok: true }) + '\n')
          }, 5)
        done()
      },
    })
    queueMicrotask(() => child.stdout.write('{"ready":true}\n'))
    return child
  },
  execFile: vi.fn(),
}))
import {
  convertWordToPdf,
  prewarmWordPreview,
  shutdownWordPreview,
} from '../src/lib/word-preview-worker'
afterEach(async () => {
  vi.useRealTimers()
  await shutdownWordPreview()
  mock.active = 0
  mock.maxActive = 0
  mock.hang = false
  mock.launches = 0
})
it('serializes conversions, reuses one process and bounds the waiting queue', async () => {
  await prewarmWordPreview()
  const progress = vi.fn()
  const pending = [1, 2, 3].map((i) =>
    convertWordToPdf('input' + i, 'output' + i, progress),
  )
  await expect(convertWordToPdf('extra', 'extra')).rejects.toThrow('任务较多')
  await Promise.all(pending)
  expect(mock.maxActive).toBe(1)
  expect(mock.launches).toBe(1)
  expect(progress).toHaveBeenCalledWith('queued')
})
it('times out a stuck conversion, frees the queue and starts a replacement', async () => {
  await prewarmWordPreview()
  mock.hang = true
  vi.useFakeTimers()
  const request = convertWordToPdf('input', 'output')
  const rejection = expect(request).rejects.toThrow('暂不可用')
  await vi.advanceTimersByTimeAsync(30001)
  await rejection
  vi.useRealTimers()
  mock.active = 0
  mock.hang = false
  await convertWordToPdf('retry', 'output')
  expect(mock.launches).toBe(2)
})
