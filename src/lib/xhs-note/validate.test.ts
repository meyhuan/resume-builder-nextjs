import { describe, expect, it } from 'vitest'
import { BRAND_TAGS, XHS_CATEGORIES, XHS_TOPICS } from '@/lib/xhs-note/topics'
import { buildXhsSystemPrompt } from '@/lib/xhs-note/prompt'
import { normalizeXhsPackage, validateXhsPackage } from '@/lib/xhs-note/validate'

const code = 'ZJ8K2'
const body = '去年秋招我把流水账改成了具体动作。'.repeat(20)

function pack(overrides: Record<string, unknown> = {}) {
  return {
    titles: ['简历只会写负责？改成这句', '应届简历先别写这 5 句', '简历里的负责怎么改'],
    body,
    tags: [...BRAND_TAGS, '秋招', '应届生', '实习'],
    cover: { line1: '流水账改成具体动作', line2: '3 步改法', badge: '简历改造' },
    ...overrides,
  }
}

describe('validateXhsPackage', () => {
  it('accepts a package with brand tags without requiring a passphrase', () => {
    expect(validateXhsPackage(pack(), code)).toBeNull()
  })

  it('rejects forbidden result promises', () => {
    expect(validateXhsPackage(pack({ body: body.replace('流水账', '保过面试') }), code)).toMatch(/禁用词/)
  })

  it('rejects titles longer than 20 characters', () => {
    expect(validateXhsPackage(pack({ titles: ['这是一个明显超过二十个汉字的发布标题不要用', '短标题', '另一个短标题'] }), code)).toMatch(/20/)
  })

  it('keeps the public copy free of passphrase text while filling render-safe fields', () => {
    const repaired = normalizeXhsPackage(pack({ body: '去年秋招我把流水账改成了具体动作。'.repeat(20) })) as Record<string, unknown>
    expect(validateXhsPackage(repaired, code)).toBeNull()
    expect(repaired.body).not.toContain(code)
    expect(Array.isArray(repaired.beforeAfter)).toBe(true)
    expect((repaired.beforeAfter as unknown[]).length).toBeGreaterThanOrEqual(2)
    expect(Array.isArray(repaired.checklist)).toBe(true)
  })

})

describe('xhs prompt & 12-topic matrix', () => {
  it('defines 12 topics across 3 categories', () => {
    expect(XHS_CATEGORIES.length).toBe(3)
    expect(XHS_TOPICS.length).toBe(12)
  })

  it('puts the three title tiers and feature boundary into the system prompt', () => {
    const prompt = buildXhsSystemPrompt('pdf-import')
    expect(prompt).toContain('A 警示')
    expect(prompt).toContain('B 场景')
    expect(prompt).toContain('C 疑问')
    expect(prompt).toContain('不要要求读者输入邀请码或口令')
    expect(prompt).toContain('保过')
    expect(prompt).toContain('旧 PDF')
  })
})
