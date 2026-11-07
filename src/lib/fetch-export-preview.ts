import { EXPORT_PROGRESS, type ExportProgressListener } from './export-progress'

/** Return a normal Response so authentication/quota handling remains with callers. */
export async function fetchExportPreview(
  url: string,
  init: RequestInit,
  progress?: ExportProgressListener,
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/x-ndjson')
  const response = await fetch(url, { ...init, headers })
  if (
    !response.headers.get('content-type')?.includes('application/x-ndjson') ||
    !response.body
  )
    return response
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  try {
    while (true) {
      const chunk = await reader.read()
      text += decoder.decode(chunk.value, { stream: !chunk.done })
      let end: number
      while ((end = text.indexOf('\n')) >= 0) {
        const line = text.slice(0, end)
        text = text.slice(end + 1)
        if (!line.trim()) continue
        const event = JSON.parse(line)
        if (
          event.event === 'progress' &&
          Object.hasOwn(EXPORT_PROGRESS, event.stage)
        )
          progress?.(event.stage)
        if (event.event === 'result')
          return new Response(JSON.stringify(event.data), {
            status: event.status,
            headers: { 'Content-Type': 'application/json' },
          })
      }
      if (chunk.done) throw new Error('预览连接中断，请重试')
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}
