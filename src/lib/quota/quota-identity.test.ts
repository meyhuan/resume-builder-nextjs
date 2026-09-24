import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sync: vi.fn(), vip: vi.fn(), miniVip: vi.fn(), consume: vi.fn(),
  upsert: vi.fn(), legacy: vi.fn(), update: vi.fn(),
}))
vi.mock('@/lib/sync-user-identity', () => ({ syncUserIdentity: mocks.sync }))
vi.mock('@/lib/api/vip-api', () => ({
  checkVipStatus: mocks.vip, checkVipStatusForWxId: mocks.miniVip,
  consumeFreeExportFromJava: mocks.consume,
}))
vi.mock('@/lib/prisma', () => ({ prisma: { userQuota: {
  upsert: mocks.upsert, findFirst: mocks.legacy, update: mocks.update,
} } }))

import { checkQuota, checkQuotaForUser } from './quota-checker'

describe('quota account identity', () => {
  afterEach(() => vi.useRealTimers())
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 24, 12))
    mocks.vip.mockResolvedValue({ isVip: false, userId: '319850', unionid: 'unionid', freeExportCount: 2 })
    mocks.miniVip.mockResolvedValue({ isVip: false, userId: '319850', javaUserId: '319850', unionid: 'openid' })
    mocks.sync.mockResolvedValue({ id: 'canonical', wxId: 'unionid', javaUserId: '319850' })
    mocks.upsert.mockResolvedValue({ userId: 'canonical', quotas: {} })
    mocks.legacy.mockResolvedValue(null)
  })

  it('passes wxId and Java ID separately even if no local link exists yet', async () => {
    await checkQuota('ai:polish-section', true)
    expect(mocks.sync).toHaveBeenCalledWith({ wxId: 'unionid', javaUserId: '319850' })
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'canonical' } }))
  })

  it('uses the same account for mini-program quota checks', async () => {
    await checkQuotaForUser('openid', 'ai:polish-section', true)
    expect(mocks.sync).toHaveBeenCalledWith({ wxId: 'openid', javaUserId: '319850' })
  })

  it('does not infer a Java mapping when the backend only returned a wxId fallback', async () => {
    mocks.miniVip.mockResolvedValue({ isVip: false, userId: '319850', unionid: '319850' })
    await checkQuotaForUser('319850', 'ai:polish-section', true)
    expect(mocks.sync).toHaveBeenCalledWith({ wxId: '319850', javaUserId: undefined })
  })

  it('counts legacy usage without copying it repeatedly into the canonical counter', async () => {
    let quotas = { 'ai:polish-section': { used: 1, date: '2026-09-24' } }
    mocks.upsert.mockImplementation(async () => ({ userId: 'canonical', quotas: structuredClone(quotas) }))
    mocks.update.mockImplementation(async ({ data }) => { quotas = data.quotas; return { quotas } })
    mocks.legacy.mockResolvedValue({ quotas: { 'ai:polish-section': { used: 2, date: '2026-09-24' } } })
    expect((await checkQuota('ai:polish-section')).used).toBe(4)
    expect(quotas['ai:polish-section'].used).toBe(2)
    expect((await checkQuota('ai:polish-section')).used).toBe(5)
    expect(quotas['ai:polish-section'].used).toBe(3)
    expect((await checkQuota('ai:polish-section')).allowed).toBe(false)
    expect(mocks.update).toHaveBeenCalledTimes(2)
  })

  it('ignores expired daily legacy usage', async () => {
    mocks.legacy.mockResolvedValue({ quotas: { 'ai:polish-section': { used: 5, date: '2026-09-23' } } })
    expect((await checkQuota('ai:polish-section', true)).used).toBe(0)
  })

  it('preserves lifetime export usage while charging the real Java login identity', async () => {
    mocks.legacy.mockResolvedValue({ quotas: { 'pdf:export': { used: 6, date: 'lifetime' } } })
    mocks.consume.mockResolvedValue({ ok: true, freeExportCount: 1 })
    const result = await checkQuota('pdf:export')
    expect(result).toMatchObject({ used: 7, remaining: 1 })
    expect(mocks.consume).toHaveBeenCalledWith('unionid', expect.any(String))
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quotas: { 'pdf:export': { used: 1, date: 'lifetime' } } }),
    }))
  })

  it('does not create an account when authentication lacks a login identity', async () => {
    mocks.vip.mockResolvedValue({ isVip: false, userId: '319850' })
    expect((await checkQuota('ai:polish-section')).allowed).toBe(false)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
})
