/**
 * In-process temporary store for generated PDF buffers.
 *
 * Each entry expires after TTL_MS. The token is a random hex string.
 * This is intentionally simple — no persistence, single-process only.
 * For multi-instance deployments swap with Redis or object storage.
 */

const TTL_MS = 5 * 60 * 1000

interface PdfEntry {
  readonly buffer: Buffer
  readonly expiresAt: number
  readonly fileName: string
}

const store = new Map<string, PdfEntry>()

function purgeExpired(): void {
  const now = Date.now()
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token)
  }
}

setInterval(purgeExpired, 60_000).unref()

/**
 * Save a PDF buffer and return a short-lived token.
 */
export function savePdfTemp(buffer: Buffer, fileName: string): string {
  purgeExpired()
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex')
  store.set(token, { buffer, expiresAt: Date.now() + TTL_MS, fileName })
  return token
}

/**
 * Retrieve and immediately delete a PDF entry by token.
 * Returns null if not found or expired.
 */
export function consumePdfTemp(token: string): PdfEntry | null {
  const entry = store.get(token)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    store.delete(token)
    return null
  }
  store.delete(token)
  return entry
}
