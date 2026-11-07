import type { ExportProgressListener } from './export-progress'

/** Keep the request alive and publish actual transitions; old clients retain JSON. */
export function exportProgressResponse(
  work: (progress: ExportProgressListener) => Promise<Response>,
): Response {
  let connected = true
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: unknown) => {
        if (!connected) return
        // ASCII framing also works with wx.request chunks split at arbitrary byte boundaries.
        const line = JSON.stringify(value).replace(
          /[\u007f-\uffff]/g,
          (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'),
        )
        controller.enqueue(encoder.encode(line + '\n'))
      }
      send({ event: 'progress', stage: 'preparing' })
      const heartbeat = setInterval(() => send({ event: 'heartbeat' }), 5000)
      void work((stage) => send({ event: 'progress', stage }))
        .then(async (response) => {
          send({
            event: 'result',
            status: response.status,
            data: await response.json(),
          })
        })
        .catch(() =>
          send({
            event: 'result',
            status: 503,
            data: { error: '预览生成失败，请重试' },
          }),
        )
        .finally(() => {
          clearInterval(heartbeat)
          if (connected) controller.close()
        })
    },
    cancel() {
      connected = false
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
