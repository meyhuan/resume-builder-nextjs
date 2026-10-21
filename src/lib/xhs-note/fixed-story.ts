import packs from './story-packs.json'
import { buildStoryTemplate, EMPTY_STORY_CHOICES, type StoryChoices } from './story-template'
import { storyFeature } from './story-features'
import type { StoryPlatform } from './story-assets'

export type StoryPack = typeof packs[number]
export const STORY_PACKS = packs
export const CORE_STORY_FEATURES = [
  { id: 'templates', label: '简历模板', detail: '选版式，看蓝营成品' },
  { id: 'editing', label: '内容编辑', detail: '从一段经历到整页简历' },
  { id: 'ai-polish', label: 'AI 润色', detail: '对照原文，检查表达' },
] as const
export function packsFor(platform: StoryPlatform, feature: string) {
  return STORY_PACKS.filter(pack => pack.platform === platform && pack.feature === feature)
}
export function featureForPack(pack: StoryPack) {
  const id = pack.feature === 'editing' ? pack.platform === 'mobile' ? 'auto-layout' : pack.variant === 'B' ? 'module-order' : 'live-edit' : pack.feature
  return storyFeature(id, pack.platform as StoryPlatform)!
}
export function packImage(pack: StoryPack, index: number) {
  if (![0, 1, 2].includes(index)) throw new Error('素材序号无效')
  return `/m/story-packs/sage-v3/${pack.id}-${index + 1}.png`
}
export function fixedStory(packId: string, input: Pick<StoryChoices, 'reason' | 'feeling' | 'extra' | 'confirmed'>, platform: StoryPlatform) {
  const pack = STORY_PACKS.find(item => item.id === packId && item.platform === platform)
  if (!pack) throw new Error('请重新选择当前端的素材。')
  const draft = buildStoryTemplate({ ...EMPTY_STORY_CHOICES, ...input, feature: featureForPack(pack).id, limitation: 'specific' }, platform)
  return { ...draft, version: 'fixed-story-sage-v3' }
}
