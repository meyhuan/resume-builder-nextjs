import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { verifyAdminPassword } from './verify-admin-password'

beforeEach(() => {
  vi.stubEnv('ADMIN_PASSWORD', 'local-secret')
  vi.stubEnv('NEXT_PUBLIC_JAVA_API_BASE_URL', 'http://java.local')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('rejects an empty password without calling Java', async () => {
  await expect(verifyAdminPassword('')).resolves.toBe(false)
  expect(fetch).not.toHaveBeenCalled()
})

it('accepts the local admin password without calling Java', async () => {
  await expect(verifyAdminPassword('local-secret')).resolves.toBe(true)
  expect(fetch).not.toHaveBeenCalled()
})

it('accepts the password Java accepts at login and reuses that result', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 100 }), { status: 200 }))
  await expect(verifyAdminPassword('java-secret')).resolves.toBe(true)
  await expect(verifyAdminPassword('java-secret')).resolves.toBe(true)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('http://java.local/admin/verify-password', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ password: 'java-secret' }),
  }))
})

it('rejects a password Java rejects', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 401 }), { status: 200 }))
  await expect(verifyAdminPassword('wrong')).resolves.toBe(false)
})

it('fails closed when Java cannot be reached', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  await expect(verifyAdminPassword('wrong')).resolves.toBe(false)
})
