import { describe, expect, it } from 'vitest'
import { BRAND_TAGS, passphraseSentence } from '@/lib/xhs-note/topics'
import { buildXhsSystemPrompt } from '@/lib/xhs-note/prompt'
import { ensurePassphrase, validateXhsPackage } from '@/lib/xhs-note/validate'

const code = 'ZJ8K2'
const sentence = passphraseSentence(code)
const body = `${'去年秋招我把流水账改成了具体动作。'.repeat(16)}\n${sentence}`

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
  it('accepts a package that keeps the passphrase and brand tags', () => {
    expect(validateXhsPackage(pack(), code)).toBeNull()
  })

  it('rejects forbidden result promises', () => {
    expect(validateXhsPackage(pack({ body: body.replace('流水账', '保过面试') }), code)).toMatch(/禁用词/)
  })

  it('rejects titles longer than 20 characters', () => {
    expect(validateXhsPackage(pack({ titles: ['这是一个明显超过二十个汉字的发布标题不要用', '短标题', '另一个短标题'] }), code)).toMatch(/20/)
  })

  it('appends the passphrase before validation when the model omitted it', () => {
    const repaired = ensurePassphrase(pack({ body: '去年秋招我把流水账改成了具体动作。'.repeat(20) }), code)
    expect(validateXhsPackage(repaired, code)).toBeNull()
  })
})

describe('xhs prompt', () => {
  it('puts the three title tiers and the passphrase into the system prompt', () => {
    const prompt = buildXhsSystemPrompt('before-after', sentence)
    expect(prompt).toContain('A 警示')
    expect(prompt).toContain('B 场景')
    expect(prompt).toContain('C 疑问')
    expect(prompt).toContain(sentence)
    expect(prompt).toContain('保过')
  })
})
