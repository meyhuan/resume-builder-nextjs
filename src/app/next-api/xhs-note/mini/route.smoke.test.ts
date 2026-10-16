import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma, generateText } = vi.hoisted(() => ({
  prisma: {
    user: { upsert: vi.fn() },
    xhsNoteDraft: { count: vi.fn(), create: vi.fn() },
    resume: { findFirst: vi.fn() },
  },
  generateText: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma }))
vi.mock('@/lib/verify-mini-sign', () => ({ verifyMiniSign: vi.fn(() => null) }))
vi.mock('@/lib/java-api-base', () => ({ getServerJavaApiBaseUrl: vi.fn(() => 'http://java.test') }))
vi.mock('@/lib/xhs-note/redact', () => ({
  redactResume: vi.fn(() => ({ usable: true, text: '负责一个项目，梳理需求并完成上线。' })),
}))
vi.mock('@/lib/ai/provider', () => ({
  getJsonProviderOptions: vi.fn(() => ({})),
  getModel: vi.fn(() => ({ id: 'mock-model' })),
  AIConfigError: class AIConfigError extends Error {},
}))
vi.mock('ai', () => ({ generateText }))

import { POST } from './route'

function validPackage(code: string) {
  return {
    titles: ['简历改清楚', '应届简历避坑', '求职表达整理'],
    body: '把经历写成动作、场景和结果，做改前改后对照，读起来会清楚很多。'.repeat(14)
      + '小程序搜「智简简历」，制作同款简历。',
    tags: ['智简简历', '简历模板', '求职', '简历修改', '应届生', '求职经验'],
    cover: { line1: '简历改清楚', line2: '把经历写成具体动作', badge: '简历改造' },
  }
}

describe('XHS mini API smoke flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.user.upsert.mockResolvedValue({ id: 'user-1' })
    prisma.xhsNoteDraft.count.mockResolvedValue(0)
    prisma.resume.findFirst.mockResolvedValue({
      id: 'resume-1',
      userId: 'user-1',
      content: { baseInfo: { name: '测试用户' }, experiences: [{ title: '项目经历', content: '完成项目' }] },
    })
    prisma.xhsNoteDraft.create.mockResolvedValue({ id: 'draft-1' })
  })

  it('simulates topics then generate, retrying once before persisting a valid draft', async () => {
    const topics = await POST(new Request('http://local', {
      method: 'POST',
      body: JSON.stringify({ wxId: 'wx-1', timestamp: Date.now(), sign: 'test', action: 'topics' }),
    }))
    expect(topics.status).toBe(200)
    expect((await topics.json()).remaining).toBeNull()

    generateText
      .mockResolvedValueOnce({ text: '{"titles":[]}' })
      .mockResolvedValueOnce({ text: JSON.stringify(validPackage('ABCD1234')) })

    const response = await POST(new Request('http://local', {
      method: 'POST',
      body: JSON.stringify({
        wxId: 'wx-1',
        timestamp: Date.now(),
        sign: 'test',
        action: 'generate',
        resumeId: 'resume-1',
        topic: 'before-after',
        javaUserId: '42',
      }),
    }))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.inviteCode).toBeUndefined()
    expect(payload.remaining).toBeNull()
    expect(generateText).toHaveBeenCalledTimes(2)
    expect(prisma.xhsNoteDraft.create).toHaveBeenCalledTimes(1)
  })
})
