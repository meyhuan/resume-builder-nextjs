import { createHmac } from 'crypto'

const SIGN_WINDOW_MS = 5 * 60 * 1000

export interface MiniSignFields {
  sid: string
  timestamp: number
  sign: string
}

/**
 * Verify HMAC-MD5 signature from the WeChat mini-program.
 *
 * Algorithm (must match miniprogram/utils/apiSign.js):
 *   message = `${timestamp}.${sid}`
 *   sign    = HMAC-MD5(IMPORT_SECRET, message)
 *
 * @returns null on success, or an error string on failure
 */
export function verifyMiniSign(fields: MiniSignFields): string | null {
  const secret = process.env.IMPORT_SECRET
  if (!secret) return 'Server misconfigured: missing IMPORT_SECRET'

  const { sid, timestamp, sign } = fields

  if (!sid || !timestamp || !sign) return 'Missing sign fields'

  const ageDiff = Math.abs(Date.now() - timestamp)
  if (ageDiff > SIGN_WINDOW_MS) return 'Timestamp expired'

  const message = `${timestamp}.${sid}`
  const expected = createHmac('md5', secret).update(message).digest('hex')

  if (expected !== sign) return 'Invalid signature'

  return null
}
