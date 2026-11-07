export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const { prewarmWordPreview } = await import('./lib/word-preview-worker')
    const start = Date.now()
    void prewarmWordPreview()
      .then(() =>
        console.info('[word-preview] converter ready', {
          startupMs: Date.now() - start,
        }),
      )
      .catch(() =>
        console.warn(
          '[word-preview] prewarm unavailable; will retry on demand',
        ),
      )
  }
}
