import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      create: mocks.create,
    },
  },
}))

import { syncUserIdentity } from './sync-user-identity'

describe('syncUserIdentity', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset()
    mocks.update.mockReset()
    mocks.create.mockReset()
  })

  it('prefers the Java-linked account when a numeric wxId shadow row exists', async () => {
    const canonical = { id: 'canonical', wxId: 'unionid', javaUserId: '319850' }
    const shadow = { id: 'shadow', wxId: '319850', javaUserId: null }
    mocks.findUnique
      .mockResolvedValueOnce(canonical) // javaUserId
      .mockResolvedValueOnce(shadow) // wxId
    mocks.update.mockResolvedValue(canonical)

    await expect(syncUserIdentity({ wxId: '319850', javaUserId: '319850' })).resolves.toEqual(canonical)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'canonical' },
      data: { name: undefined, avatar: undefined, email: undefined, javaUserId: '319850', wxId: 'unionid' },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('backfills Java ID on an existing wxId account', async () => {
    const existing = { id: 'user-1', wxId: 'unionid', javaUserId: null }
    const linked = { ...existing, javaUserId: '319850' }
    mocks.findUnique
      .mockResolvedValueOnce(null) // javaUserId
      .mockResolvedValueOnce(existing) // wxId
    mocks.update.mockResolvedValue(linked)

    await expect(syncUserIdentity({ wxId: 'unionid', javaUserId: '319850' })).resolves.toEqual(linked)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: undefined, avatar: undefined, email: undefined, javaUserId: '319850', wxId: 'unionid' },
    })
  })

  it('rejects linking a wxId already owned by another Java account', async () => {
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-1', wxId: 'unionid', javaUserId: 'other-java-id' })

    await expect(syncUserIdentity({ wxId: 'unionid', javaUserId: '319850' }))
      .rejects.toThrow('登录身份关联冲突')
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not downgrade a unionid to a numeric login key', async () => {
    const canonical = { id: 'canonical', wxId: 'unionid', javaUserId: '319850' }
    mocks.findUnique.mockResolvedValueOnce(canonical).mockResolvedValueOnce(null)
    mocks.update.mockImplementation(async ({ data }) => ({ ...canonical, ...data }))
    const result = await syncUserIdentity({ wxId: '319850', javaUserId: '319850' })
    expect(result.wxId).toBe('unionid')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('recovers concurrent creation by Java ID even when the winner has another wxId', async () => {
    const winner = { id: 'winner', wxId: 'unionid', javaUserId: '319850' }
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner).mockResolvedValueOnce(null)
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002', clientVersion: 'test', meta: { target: ['javaUserId'] },
    }))
    mocks.update.mockResolvedValue(winner)
    await expect(syncUserIdentity({ wxId: 'openid', javaUserId: '319850' })).resolves.toEqual(winner)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('creates a new user with both verified identifiers', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }))
    const result = await syncUserIdentity({ wxId: 'unionid', javaUserId: '319850' })
    expect(result).toMatchObject({ id: 'new', wxId: 'unionid', javaUserId: '319850' })
  })

  it('does not retry outages or unrelated errors as a successful login', async () => {
    mocks.findUnique.mockRejectedValue(new Error('database unavailable'))
    await expect(syncUserIdentity({ wxId: 'unionid', javaUserId: '319850' })).rejects.toThrow('database unavailable')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('stops retrying unresolved unique conflicts', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002', clientVersion: 'test', meta: { target: ['email'] },
    }))
    await expect(syncUserIdentity({ wxId: 'unionid' })).rejects.toThrow('unique')
    expect(mocks.create).toHaveBeenCalledTimes(3)
  })
})
