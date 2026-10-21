import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { buildStoryTemplate, EMPTY_STORY_CHOICES, parseStoryChoices, STORY_REASONS, storyLimitations, type StoryChoices } from './story-template'
import { featureStoryAssets, STORY_FEATURES, storyFeature, storyFeaturesFor } from './story-features'
import { storyAssetSource } from './story-assets'

const choice = (feature = 'templates'): StoryChoices => ({ ...EMPTY_STORY_CHOICES, reason: 'update', feature, supporting: [], feeling: 'helpful', limitation: 'specific', confirmed: true })
describe('feature-based experience templates', () => {
  it('requires a real selection and confirmation, with no default testimonial', () => {
    expect(() => buildStoryTemplate(EMPTY_STORY_CHOICES, 'mobile')).toThrow()
    expect(() => buildStoryTemplate({ ...choice(), confirmed: false }, 'mobile')).toThrow()
    expect(parseStoryChoices({ feature: 'fake', reason: 'injected', confirmed: 'true', supporting: 'bad' })).toEqual(EMPTY_STORY_CHOICES)
  })
  it('checks every feature, reason, feeling and limitation on every supported platform', () => {
    for (const platform of ['mobile', 'desktop'] as const) for (const feature of storyFeaturesFor(platform)) {
      for (const reason of STORY_REASONS) for (const feeling of feature.feelings) for (const limitation of storyLimitations(feature.id, platform)) {
        const input = { ...choice(feature.id), reason: reason.id, feeling: feeling.id, limitation: limitation.id }
        const result = buildStoryTemplate(input, platform)
        expect(result).toEqual(buildStoryTemplate(input, platform))
        expect(result.title.length).toBeLessThanOrEqual(20)
        expect(result.body.length).toBeLessThanOrEqual(1000)
        expect(result.body).toContain(feature.action)
        expect(result.body).toContain(feeling.text)
        expect(result.body).toContain(platform === 'mobile' ? '手机端' : '电脑网页版')
        if (feature.id !== 'one-page') expect(result.body).not.toContain('一页模式')
        if (feeling.id === 'trying') expect(result.body).not.toContain(feature.feelings[0].text)
      }
    }
  })
  it('rejects unsupported functions, old feelings, excess or duplicate supporting claims', () => {
    expect(() => buildStoryTemplate(choice('jd-match'), 'mobile')).toThrow()
    expect(() => buildStoryTemplate(choice('auto-layout'), 'desktop')).toThrow()
    expect(() => buildStoryTemplate({ ...choice(), feeling: 'layout' }, 'mobile')).toThrow()
    for (const supporting of [['templates'], ['jd-match'], ['ai-polish', 'ai-polish'], ['ai-polish', 'import', 'translate']]) {
      expect(() => buildStoryTemplate({ ...choice(), supporting }, 'mobile')).toThrow()
    }
  })
  it('retains neutral experience and only the chosen additional functions', () => {
    const result = buildStoryTemplate({ ...choice('ai-polish'), feeling: 'trying', supporting: ['import', 'translate'], extra: '我还想再改改。' }, 'mobile')
    expect(result.body).toContain('没有特别明显的感受')
    expect(result.body).toContain('简历导入和简历翻译')
    expect(result.body).not.toMatch(/一页模式|面试准备|岗位匹配/)
    expect(result.body.endsWith('我还想再改改。')).toBe(true)
  })
  it('normalizes restored drafts to the current platform without transferring unsupported feelings', () => {
    const restored = parseStoryChoices({ ...choice('jd-match'), supporting: ['ai-polish', 'jd-match', 'import', 'translate'] }, 'mobile')
    expect(restored.feature).toBe('')
    expect(restored.feeling).toBe('')
    expect(restored.confirmed).toBe(false)
    expect(restored.supporting).toEqual(['ai-polish', 'import'])
    expect(storyFeature('translate', 'mobile')).toBeDefined()
    expect(storyFeature('interview', 'mobile')).toBeUndefined()
  })
  it('only recommends matching platform assets and every referenced file exists', () => {
    for (const platform of ['mobile', 'desktop'] as const) for (const feature of STORY_FEATURES) {
      const assets = featureStoryAssets([feature.id], platform)
      for (const asset of assets) {
        expect(asset.platform).toBe(platform)
        expect(feature.assets[platform]).toContain(asset.id)
        expect(existsSync(`public${storyAssetSource(asset.id)}`)).toBe(true)
      }
      if (!feature.platforms.includes(platform)) expect(assets).toEqual([])
    }
    expect(featureStoryAssets(['translate'], 'mobile')).toEqual([])
    expect(featureStoryAssets(['templates'], 'mobile').map(item => item.id)).toEqual(['mobile-preview-settings-template-sheet'])
  })
})
