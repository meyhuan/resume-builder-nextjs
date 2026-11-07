import { createHash } from 'node:crypto'
import type {
  ExportProgressListener,
  ExportProgressStage,
} from './export-progress'

export interface WordPreview {
  buffer: Buffer
  images: readonly Buffer[]
}
interface Entry {
  expires: number
  bytes: number
  stage: ExportProgressStage
  listeners: Set<ExportProgressListener>
  pending: Promise<WordPreview>
}
const runtime = globalThis as typeof globalThis & {
  __wordPreviewCache?: Map<string, Entry>
}
const cache = (runtime.__wordPreviewCache ??= new Map<string, Entry>())
const TTL = 10 * 60_000
const MAX_BYTES = 32 * 1024 * 1024

export function wordPreviewKey(
  owner: string,
  resumeId: string,
  template: string,
  content: unknown,
  theme: unknown,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        'word-preview-v2',
        owner,
        resumeId,
        template,
        content,
        theme,
      ]),
    )
    .digest('hex')
}

export async function cachedWordPreview(
  key: string,
  build: (progress: ExportProgressListener) => Promise<WordPreview>,
  progress: ExportProgressListener,
): Promise<WordPreview> {
  for (const [id, entry] of cache)
    if (entry.expires < Date.now()) cache.delete(id)
  let entry = cache.get(key)
  if (entry) {
    progress(entry.bytes ? 'cached' : entry.stage)
    entry.listeners.add(progress)
    try {
      return await entry.pending
    } finally {
      entry.listeners.delete(progress)
    }
  }
  // Bound both completed previews and in-flight jobs; never cache access tokens or quota state.
  if (cache.size >= 32) {
    for (const [id, value] of cache) {
      if (value.bytes) {
        cache.delete(id)
        break
      }
    }
    if (cache.size >= 32) throw new Error('预览任务较多，请稍后重试')
  }
  entry = {
    expires: Date.now() + TTL,
    bytes: 0,
    stage: 'generating',
    listeners: new Set([progress]),
    pending: null!,
  }
  const current = entry
  cache.set(key, current)
  current.pending = Promise.resolve()
    .then(() =>
      build((stage) => {
        current.stage = stage
        for (const listener of current.listeners) listener(stage)
      }),
    )
    .then((result) => {
      current.bytes =
        result.buffer.length +
        result.images.reduce((sum, image) => sum + image.length, 0)
      current.expires = Date.now() + TTL
      let bytes = [...cache.values()].reduce((sum, item) => sum + item.bytes, 0)
      for (const [id, value] of cache) {
        if (bytes <= MAX_BYTES) break
        if (value.bytes) {
          cache.delete(id)
          bytes -= value.bytes
        }
      }
      return result
    })
    .catch((error) => {
      if (cache.get(key) === current) cache.delete(key)
      throw error
    })
  try {
    return await current.pending
  } finally {
    current.listeners.clear()
  }
}
