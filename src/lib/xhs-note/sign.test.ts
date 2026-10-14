import { createHmac } from 'crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { verifyMiniSign } from '@/lib/verify-mini-sign'

const secret = 'test-import-secret'

function sign(wxId: string, timestamp: number): string {
  return createHmac('md5', secret).update(`${timestamp}.${wxId}`).digest('hex')
}

describe('verifyMiniSign', () => {
  afterEach(() => {
    delete process.env.IMPORT_SECRET
  })

  it('accepts a fresh signature', () => {
    process.env.IMPORT_SECRET = secret
    const timestamp = Date.now()
    expect(verifyMiniSign({ wxId: 'union-1', timestamp, sign: sign('union-1', timestamp) })).toBeNull()
  })

  it('rejects an expired timestamp', () => {
    process.env.IMPORT_SECRET = secret
    const timestamp = Date.now() - 10 * 60 * 1000
    expect(verifyMiniSign({ wxId: 'union-1', timestamp, sign: sign('union-1', timestamp) })).toBe('Timestamp expired')
  })

  it('rejects a wrong signature', () => {
    process.env.IMPORT_SECRET = secret
    expect(verifyMiniSign({ wxId: 'union-1', timestamp: Date.now(), sign: 'deadbeef' })).toBe('Invalid signature')
  })
})
