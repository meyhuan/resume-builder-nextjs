import { beforeEach, expect, it, vi } from 'vitest'
import {
  cachedWordPreview,
  wordPreviewKey,
} from '../src/lib/word-preview-cache'
import { exportProgressResponse } from '../src/lib/export-progress-stream'
import { fetchExportPreview } from '../src/lib/fetch-export-preview'
beforeEach(() => {
  ;(
    globalThis as typeof globalThis & {
      __wordPreviewCache?: Map<string, unknown>
    }
  ).__wordPreviewCache?.clear()
  vi.unstubAllGlobals()
})
const value = { buffer: Buffer.from('word'), images: [Buffer.from('preview')] }
it('coalesces concurrent requests and reuses exact bytes without sharing ownership or content revisions', async () => {
  const build = vi.fn(async (progress) => {
    progress('converting')
    await new Promise((resolve) => setTimeout(resolve, 10))
    return value
  })
  const key = wordPreviewKey('alice', 'r', 'template', { text: 'one' }, {})
  const progress = vi.fn()
  const [a, b] = await Promise.all([
    cachedWordPreview(key, build, progress),
    cachedWordPreview(key, build, progress),
  ])
  expect(build).toHaveBeenCalledTimes(1)
  expect(a).toBe(b)
  expect(await cachedWordPreview(key, build, progress)).toBe(a)
  expect(progress).toHaveBeenCalledWith('cached')
  for (const k of [
    wordPreviewKey('bob', 'r', 'template', { text: 'one' }, {}),
    wordPreviewKey('alice', 'r', 'template', { text: 'two' }, {}),
    wordPreviewKey('alice', 'r', 'other', { text: 'one' }, {}),
    wordPreviewKey('alice', 'r', 'template', { text: 'one' }, { color: 'red' }),
  ]) {
    expect(k).not.toBe(key)
    await cachedWordPreview(k, build, progress)
  }
  expect(build).toHaveBeenCalledTimes(5)
})
it('does not cache failures, and expires completed previews', async () => {
  const build = vi
    .fn()
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValue(value)
  await expect(cachedWordPreview('key', build, () => {})).rejects.toThrow(
    'fail',
  )
  await cachedWordPreview('key', build, () => {})
  const now = Date.now()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 11 * 60000)
  await cachedWordPreview('key', build, () => {})
  clock.mockRestore()
  expect(build).toHaveBeenCalledTimes(3)
})
it('streams actual stages and preserves the final HTTP status and error body', async () => {
  const response = exportProgressResponse(async (progress) => {
    progress('converting')
    progress('rendering')
    return Response.json({ error: '请重试' }, { status: 503 })
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  const stages = vi.fn()
  const result = await fetchExportPreview('/preview', {}, stages)
  expect(stages.mock.calls.map((c) => c[0])).toEqual([
    'preparing',
    'converting',
    'rendering',
  ])
  expect(result.status).toBe(503)
  expect(await result.json()).toEqual({ error: '请重试' })
})
it('handles fragmented lines and rejects a truncated stream', async () => {
  const encoded = new TextEncoder().encode(
    JSON.stringify({ event: 'result', status: 200, data: { name: '中文' } }) +
      '\n',
  )
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            for (const byte of encoded) c.enqueue(Uint8Array.of(byte))
            c.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ),
  )
  expect(await (await fetchExportPreview('/preview', {})).json()).toEqual({
    name: '中文',
  })
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('{"event":', {
          headers: { 'Content-Type': 'application/x-ndjson' },
        }),
      ),
  )
  await expect(fetchExportPreview('/preview', {})).rejects.toThrow(
    '预览连接中断',
  )
})
