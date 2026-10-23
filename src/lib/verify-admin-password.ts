import { createHash, timingSafeEqual } from 'node:crypto'
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'

const ACCEPTED_TTL_MS = 10 * 60 * 1000
const acceptedUntil = new Map<string, number>()
const pendingChecks = new Map<string, Promise<boolean>>()

function matchesLocalAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || Buffer.byteLength(password) !== Buffer.byteLength(expected)) return false
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected))
}

function fingerprint(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function verifyWithJava(password: string): Promise<boolean> {
  const response = await fetch(`${getServerJavaApiBaseUrl()}/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  })
  if (!response.ok) return false
  const json = await response.json() as { status?: number }
  return json.status === 100
}

/** Accept the Next.js admin password or the password Java already accepts at login. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false
  if (matchesLocalAdminPassword(password)) return true

  const key = fingerprint(password)
  const until = acceptedUntil.get(key)
  if (until && until > Date.now()) return true

  const pending = pendingChecks.get(key)
  if (pending) return pending

  const check = verifyWithJava(password)
    .then((accepted) => {
      if (accepted) acceptedUntil.set(key, Date.now() + ACCEPTED_TTL_MS)
      return accepted
    })
    .catch(() => false)
    .finally(() => {
      pendingChecks.delete(key)
    })
  pendingChecks.set(key, check)
  return check
}
