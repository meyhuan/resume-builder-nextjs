import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ read: vi.fn(), record: vi.fn() }))
vi.mock('@/lib/export-temp-store', () => ({ readExportTemp: mocks.read }))
vi.mock('@/lib/prisma', () => ({ prisma: { exportRecord: { findUnique: mocks.record } } }))
import { GET } from './route'
afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.resetAllMocks()
  mocks.read.mockResolvedValue({ type: 'docx', wxId: 'owner', confirmed: true, buffer: Buffer.from('word'), fileName: 'resume', extension: 'docx', contentType: 'application/octet-stream' })
})
it.each(['', '?inline=1'])('serves confirmed Word with PDF download rules %s', async query => {
  const response = await GET(new Request(`http://localhost/file${query}`), { params: Promise.resolve({ token: 'token' }) })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('word')
})
it('serves available OSS files without a second membership gate', async () => {
  mocks.read.mockResolvedValue(null)
  mocks.record.mockResolvedValue({ type: 'docx', wxId: 'owner', fileName: 'resume', ossUrl: 'https://invalid.test/file', status: 'available', expiresAt: new Date(Date.now() + 60000) })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('word')))
  expect((await GET(new Request('http://localhost/file'), { params: Promise.resolve({ token: 'token' }) })).status).toBe(200)
})
it('still blocks unconfirmed attachment downloads', async () => {
  mocks.read.mockResolvedValue({ type: 'docx', confirmed: false })
  expect((await GET(new Request('http://localhost/file'), { params: Promise.resolve({ token: 'token' }) })).status).toBe(409)
})
