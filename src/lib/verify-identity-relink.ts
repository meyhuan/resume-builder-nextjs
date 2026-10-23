import { fetchJavaWithLog } from '@/lib/api/fetch-with-log'

/** Never infer deletion from a timeout, a generic error, or caller-provided IDs. */
export async function verifyIdentityRelink(wxId: string, oldJavaUserId: string, newJavaUserId: string): Promise<boolean> {
  try {
    const response = await fetchJavaWithLog('/user/identity-relink-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wxId, oldJavaUserId, newJavaUserId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      logPrefix: '[identity-relink]',
    })
    if (!response.ok) return false
    const body = await response.json()
    return body?.status === 100 && body?.data?.allowed === true
  } catch {
    return false
  }
}
