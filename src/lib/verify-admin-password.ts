import { timingSafeEqual } from 'node:crypto'
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'

function matchesLocalAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || Buffer.byteLength(password) !== Buffer.byteLength(expected)) return false
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected))
}

/** Accept the Next.js admin password or the password Java already accepts at login. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false
  if (matchesLocalAdminPassword(password)) return true

  try {
    const response = await fetch(`${getServerJavaApiBaseUrl()}/admin/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    })
    if (!response.ok) return false
    const json = await response.json() as { status?: number }
    return json.status === 100
  } catch {
    return false
  }
}
