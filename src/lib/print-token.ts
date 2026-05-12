import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Short-lived HMAC token for the internal `/print/[id]` SSR route.
 *
 * The route is hit by puppeteer (server-internal) when generating a PDF/image
 * export. The token guards against arbitrary external readers loading another
 * user's resume via the print URL.
 *
 * Token format: `<expiresAt>.<hmacHex>`
 *   message = `${resumeId}.${expiresAt}`
 *   hmac    = HMAC-SHA256(secret, message)
 */

const DEFAULT_TTL_MS = 60 * 1000

function getSecret(): string {
  const secret = process.env.PRINT_TOKEN_SECRET || process.env.IMPORT_SECRET
  if (!secret) {
    throw new Error('Server misconfigured: missing PRINT_TOKEN_SECRET / IMPORT_SECRET')
  }
  return secret
}

export function mintPrintToken(resumeId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const expiresAt: number = Date.now() + ttlMs
  const message: string = `${resumeId}.${expiresAt}`
  const sig: string = createHmac('sha256', getSecret()).update(message).digest('hex')
  console.log('[print-token] minted', { resumeId, expiresAt, ttlMs })
  return `${expiresAt}.${sig}`
}

export function verifyPrintToken(token: string, resumeId: string): boolean {
  if (!token || typeof token !== 'string') {
    console.warn('[print-token] missing token')
    return false
  }
  const dot: number = token.indexOf('.')
  if (dot <= 0) {
    console.warn('[print-token] malformed token')
    return false
  }
  const expiresAtStr: string = token.slice(0, dot)
  const sig: string = token.slice(dot + 1)
  const expiresAt: number = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt)) {
    console.warn('[print-token] bad expiresAt', { expiresAtStr })
    return false
  }
  if (Date.now() > expiresAt) {
    console.warn('[print-token] expired', { resumeId, expiresAt })
    return false
  }
  const message: string = `${resumeId}.${expiresAt}`
  const expected: string = createHmac('sha256', getSecret()).update(message).digest('hex')
  try {
    const a: Buffer = Buffer.from(sig, 'hex')
    const b: Buffer = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    const ok: boolean = timingSafeEqual(a, b)
    if (!ok) console.warn('[print-token] signature mismatch', { resumeId })
    return ok
  } catch {
    return false
  }
}
