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

import { POST } from './route'

describe('xhs-note submit API route', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    mocks.cookie.mockReturnValue(undefined)
    const req = new Request('http://localhost/next-api/xhs-note/submit', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'http://xhslink.com/demo', topicKey: '01-mobile-template-a' }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toContain('请先登录')
  })

  it('submits a valid note URL and returns 100 on success', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_123456' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: 12345 })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: true })
    mocks.parseJsonWithLog.mockResolvedValue({ status: 100, result: 'ok', data: 42 })

    const req = new Request('http://localhost/next-api/xhs-note/submit', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'http://xhslink.com/a/abc123', topicKey: '01-mobile-template-a' }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe(100)
    expect(json.data).toBe(42)
  })

  it('normalizes protocol-less and mobile links before forwarding to Java backend', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_123456' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: 12345 })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: true })
    mocks.parseJsonWithLog.mockResolvedValue({ status: 100, result: 'ok', data: 42 })

    const req = new Request('http://localhost/next-api/xhs-note/submit', {
      method: 'POST',
      body: JSON.stringify({
        rawText: 'xhslink.cn/o/3evPWmNafFe 把文本复制好，进入【小红书】即可浏览全文。',
        topicKey: '01-mobile-template-a',
      }),
    })

    await POST(req)

    expect(mocks.fetchJavaWithLog).toHaveBeenCalledWith(
      '/xhs-note/submit',
      expect.objectContaining({
        body: JSON.stringify({
          userId: 12345,
          rawText: 'https://xhslink.cn/o/3evPWmNafFe 把文本复制好，进入【小红书】即可浏览全文。',
          topicKey: '01-mobile-template-a',
        }),
      }),
    )
  })

  it('returns backend error if Java service reports failure', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_123456' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: 12345 })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: true })
    mocks.parseJsonWithLog.mockResolvedValue({ status: 999, result: '这条笔记已经提交过' })

    const req = new Request('http://localhost/next-api/xhs-note/submit', {
      method: 'POST',
      body: JSON.stringify({ rawText: 'http://xhslink.com/a/abc123', topicKey: '01-mobile-template-a' }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(json.status).toBe(999)
    expect(json.error).toBe('这条笔记已经提交过')
  })

  it('returns a controlled error when account lookup fails', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({})
    mocks.prismaUserFindFirst.mockRejectedValue(new Error('DB unavailable'))
    const response = await POST(new Request('http://localhost/next-api/xhs-note/submit', { method: 'POST', body: JSON.stringify({ rawText: 'http://xhslink.com/a/abc123' }) }))
    expect(response.status).toBe(500)
    expect((await response.json()).error).toBeTruthy()
    expect(mocks.fetchJavaWithLog).not.toHaveBeenCalled()
  })

  it('returns a controlled error on a backend timeout', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    mocks.fetchJavaWithLog.mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
    const response = await POST(new Request('http://localhost/next-api/xhs-note/submit', { method: 'POST', body: JSON.stringify({ rawText: 'http://xhslink.com/a/abc123' }) }))
    expect(response.status).toBe(500)
    expect((await response.json()).error).toBeTruthy()
  })

  it('does not accept a successful payload from an HTTP failure', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    mocks.fetchJavaWithLog.mockResolvedValue({ ok: false, status: 503 })
    mocks.parseJsonWithLog.mockResolvedValue({ status: 100, data: {} })
    const response = await POST(new Request('http://localhost/next-api/xhs-note/submit', { method: 'POST', body: JSON.stringify({ rawText: 'http://xhslink.com/a/abc123' }) }))
    expect((await response.json()).status).not.toBe(100)
  })

  it.each([null, [], {}, { rawText: 'x'.repeat(4001) }, { rawText: 'ok', topicKey: 'x'.repeat(65) }])('rejects invalid payloads safely: %j', async body => {
    mocks.cookie.mockReturnValue({ value: 'wx_test_123' })
    mocks.checkVipStatus.mockResolvedValue({ javaUserId: '42' })
    const response = await POST(new Request('http://localhost/next-api/xhs-note/submit', { method: 'POST', body: JSON.stringify(body) }))
    expect(response.status).toBe(400)
    expect(mocks.fetchJavaWithLog).not.toHaveBeenCalled()
  })
})
