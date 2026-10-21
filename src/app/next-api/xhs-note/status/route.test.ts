import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  checkVipStatus: vi.fn(),
  fetchJavaWithLog: vi.fn(),
  parseJsonWithLog: vi.fn(),
  prismaUserFindFirst: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookie }),
}))

vi.mock('@/lib/api/vip-api', () => ({
  checkVipStatus: mocks.checkVipStatus,
}))

vi.mock('@/lib/api/fetch-with-log', () => ({
  fetchJavaWithLog: mocks.fetchJavaWithLog,
  parseJsonWithLog: mocks.parseJsonWithLog,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: mocks.prismaUserFindFirst },
  },
}))

import { GET } from './route'

describe('xhs-note status API route', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    mocks.cookie.mockReturnValue(undefined)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toContain('请先登录')
  })

  it('returns status info when authenticated', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: true, status: 200 })
    mocks.parseJsonWithLog.mockResolvedValue({
      status: 100,
      data: {
        enabled: true,
        baseDays: 7,
        tier1Views: 300,
        tier1TotalDays: 30,
        tier2Views: 1000,
        tier2TotalDays: 60,
        maxAwarded: 3,
        awardedCount: 1,
        remainingAwards: 2,
        submissions: [
          {
            id: 1001,
            topicKey: '01-mobile-template-a',
            noteUrl: 'http://xhslink.com/a/abc123',
            status: 1,
            grantedDays: 7,
          },
        ],
      },
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe(100)
    expect(json.data.remainingAwards).toBe(2)
    expect(json.data.submissions).toHaveLength(1)
  })
  it('returns a controlled error when account lookup fails', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({})
    mocks.prismaUserFindFirst.mockRejectedValue(new Error('DB unavailable'))
    const response = await GET()
    expect(response.status).toBe(500)
    expect((await response.json()).error).toBeTruthy()
    expect(mocks.fetchJavaWithLog).not.toHaveBeenCalled()
  })

  it('returns a controlled error on a backend timeout', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    mocks.fetchJavaWithLog.mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
    const response = await GET()
    expect(response.status).toBe(500)
    expect((await response.json()).error).toBeTruthy()
  })

  it('does not accept a successful payload from an HTTP failure', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: false, status: 503 })
    mocks.parseJsonWithLog.mockResolvedValue({ status: 100, data: {} })
    const response = await GET()
    expect((await response.json()).status).not.toBe(100)
  })

})
