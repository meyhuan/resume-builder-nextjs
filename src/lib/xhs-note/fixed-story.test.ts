import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CORE_STORY_FEATURES, STORY_PACKS, featureForPack, fixedStory, packImage, packsFor } from './fixed-story'

describe('fixed promotional story packs', () => {
  it('has two complete, distinct triptychs per platform and core feature', () => {
    expect(STORY_PACKS).toHaveLength(12)
    const paths = new Set<string>()
    for (const platform of ['mobile', 'desktop'] as const) for (const feature of CORE_STORY_FEATURES) {
      const packs = packsFor(platform, feature.id)
      expect(packs.map(pack => pack.variant)).toEqual(['A', 'B'])
      for (const pack of packs) {
        expect(pack.titles).toHaveLength(3)
        for (let i = 0; i < 3; i++) {
          const file = packImage(pack, i); paths.add(file)
          const data = readFileSync(`public${file}`)
          expect(data.subarray(1, 4).toString()).toBe('PNG')
          expect(file).toContain('/sage-v3/')
          expect(data.readUInt32BE(16)).toBeGreaterThanOrEqual(1000)
          expect(data.readUInt32BE(16) / data.readUInt32BE(20)).toBeCloseTo(0.75, 1)
        }
      }
    }
    expect(paths.size).toBe(36)
  })
  it('keeps feature, platform and selected feeling aligned without personal screenshot requirements', () => {
    for (const pack of STORY_PACKS) for (const feeling of featureForPack(pack).feelings) {
      const result = fixedStory(pack.id, { reason: 'update', feeling: feeling.id, extra: '这是我自己补充的话。', confirmed: true }, pack.platform as 'mobile' | 'desktop')
      expect(result.body).toContain(featureForPack(pack).action)
      expect(result.body).toContain(feeling.text)
      expect(result.body).not.toContain('配图为智简简历产品示例')
      expect(result.body).toContain('这是我自己补充的话。')
      expect(result.title.length).toBeLessThanOrEqual(20)
      if (feeling.id === 'trying') expect(result.body).not.toContain(featureForPack(pack).feelings[0].text)
    }
    expect(featureForPack(STORY_PACKS.find(pack => pack.id === '08-desktop-edit-b')!).id).toBe('module-order')
  })
  it('rejects unconfirmed, empty, invalid and cross-platform choices', () => {
    const valid = { reason: 'update', feeling: 'helpful', extra: '', confirmed: true }
    for (const patch of [{ confirmed: false }, { reason: '' }, { feeling: '' }, { feeling: 'invented' }]) expect(() => fixedStory(STORY_PACKS[0].id, { ...valid, ...patch }, 'mobile')).toThrow()
    expect(() => fixedStory(STORY_PACKS[0].id, valid, 'desktop')).toThrow()
    expect(() => fixedStory('unknown', valid, 'mobile')).toThrow()
    expect(() => packImage(STORY_PACKS[0], 3)).toThrow()
  })
})
