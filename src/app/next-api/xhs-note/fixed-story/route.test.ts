import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  cookie: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn() },
    resume: { findFirst: vi.fn() },
    xhsNoteDraft: { count: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('ai', () => ({ generateText: mocks.generateText }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.cookie }) }))
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/ai/provider', () => ({
  getModel: () => ({}),
  getJsonProviderOptions: () => ({}),
  AIConfigError: class AIConfigError extends Error {},
}))
vi.mock('@/lib/ai/ai-runtime-config', () => ({
  getDefaultModel: () => ({ name: 'test-qwen-model' }),
}))

import { POST } from './route'

const input = {
  packId: '01-mobile-template-a',
  platform: 'mobile',
  reason: 'job',
  feeling: 'helpful',
  extra: '重新整理了经历',
  confirmed: true,
  localTest: true,
}

const mockAiResult = {
  title: '求职改简历，这次换了个清楚版式',
  body: '最近一直在准备找工作，旧简历乱七八糟的。\n\n在手机上用了智简简历的单栏模板，感觉模块排版顺畅了许多，不用自己费力对齐。\n\n不过经历内容还是要自己多改几遍。配图为智简简历产品示例，由 AI 辅助设计，人物与经历为模拟数据，界面细节以实际产品为准。',
  tags: ['简历模板', '求职经验', '改简历'],
}

function request(body: unknown = input, origin = 'http://127.0.0.1:3000') {
  return new Request('http://127.0.0.1:3000/next-api/xhs-note/fixed-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'development')
  mocks.cookie.mockReturnValue(undefined)
  mocks.generateText.mockResolvedValue({
    text: JSON.stringify(mockAiResult),
    response: { modelId: 'test-qwen-plus' },
  })
  mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
  mocks.prisma.xhsNoteDraft.count.mockResolvedValue(0)
  mocks.prisma.xhsNoteDraft.create.mockResolvedValue({ id: 'draft-1' })
  mocks.prisma.xhsNoteDraft.update.mockResolvedValue({ id: 'draft-1' })
  mocks.prisma.$transaction.mockImplementation(async callback => callback(mocks.prisma))
  mocks.prisma.resume.findFirst.mockResolvedValue({ title: '前端开发工程师', content: {} })
})

afterEach(() => vi.unstubAllEnvs())

describe('fixed story AI generation API route', () => {
  it('generates note copy using AI and returns AI provenance', async () => {
    const res = await POST(request())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.isAiGenerated).toBe(true)
    expect(data.title).toBe(mockAiResult.title)
    expect(data.tags).toEqual(mockAiResult.tags)
    expect(data.generation.model).toBe('test-qwen-plus')
    expect(mocks.generateText).toHaveBeenCalledTimes(1)
  })

  it('rejects cross-origin requests', async () => {
    const res = await POST(request(input, 'https://malicious.com'))
    expect(res.status).toBe(403)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('rejects unconfirmed input', async () => {
    const res = await POST(request({ ...input, confirmed: false }))
    expect(res.status).toBe(400)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('returns a retryable error without fabricated fallback when AI fails', async () => {
    mocks.generateText.mockRejectedValueOnce(new Error('AI provider timeout'))
    const res = await POST(request())
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.body).toBeUndefined()
    expect(data.error).toContain('已保留')
    expect(data.error).not.toContain('provider timeout')
  })

  it('persists draft to database when user is authenticated', async () => {
    mocks.cookie.mockReturnValue({ value: 'wx-user-123' })
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(mocks.prisma.xhsNoteDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          topic: 'fixed-story:01-mobile-template-a',
        }),
      })
    )
    expect(mocks.prisma.xhsNoteDraft.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'draft-1' } }))
  })

  it.each([null, [], 'invalid'])('rejects invalid JSON values: %s', async value => {
    expect((await POST(request(value))).status).toBe(400)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('requires login in production even with localTest enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect((await POST(request())).status).toBe(401)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('rejects a stale login without calling AI', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mocks.cookie.mockReturnValue({ value: 'stale' })
    mocks.prisma.user.findUnique.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('enforces the daily quota before making paid calls', async () => {
    mocks.cookie.mockReturnValue({ value: 'user' })
    mocks.prisma.xhsNoteDraft.count.mockResolvedValue(15)
    expect((await POST(request())).status).toBe(429)
    expect(mocks.generateText).not.toHaveBeenCalled()
    expect(mocks.prisma.xhsNoteDraft.create).not.toHaveBeenCalled()
  })

  it('reserves quota atomically before generation, including failed attempts', async () => {
    mocks.cookie.mockReturnValue({ value: 'user' })
    mocks.generateText.mockImplementationOnce(async () => {
      expect(mocks.prisma.xhsNoteDraft.create).toHaveBeenCalledTimes(1)
      throw new Error('provider failed')
    })
    expect((await POST(request())).status).toBe(502)
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
    expect(mocks.prisma.xhsNoteDraft.update).not.toHaveBeenCalled()
  })

  it('fails closed if quota storage is unavailable', async () => {
    mocks.cookie.mockReturnValue({ value: 'user' })
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await POST(request())).status).toBe(503)
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('keeps an explicitly selected generic role instead of reading a resume', async () => {
    mocks.cookie.mockReturnValue({ value: 'user' })
    expect((await POST(request({ ...input, role: '' }))).status).toBe(200)
    expect(mocks.prisma.resume.findFirst).not.toHaveBeenCalled()
  })

  it('blocks overlapping requests and releases the lock after completion', async () => {
    let complete!: (value: { text: string }) => void
    mocks.generateText.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const pending = POST(request())
    await vi.waitFor(() => expect(mocks.generateText).toHaveBeenCalledTimes(1))
    expect((await POST(request())).status).toBe(429)
    complete({ text: JSON.stringify(mockAiResult) })
    expect((await pending).status).toBe(200)
    expect((await POST(request())).status).toBe(200)
  })
})
