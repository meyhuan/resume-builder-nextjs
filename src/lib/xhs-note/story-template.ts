import { storyFeature } from './story-features'
import type { StoryPlatform } from './story-assets'

export const STORY_REASONS = [
  { id: 'advice', label: '求助听劝 · 让大家把把关', text: '最近改了版简历，心里没底，想发出来让大家帮我把把关。' },
  { id: 'checkin', label: '求职打卡 · 记录备战日常', text: '今天终于把拖延很久的简历理顺了，打个卡给自己加个油。' },
  { id: 'tips', label: '避坑经验 · 聊聊踩过的坑', text: '之前改简历踩过不少坑，今天理顺了，顺手分享几个注意点。' },
  { id: 'update', label: '随手记录 · 换个版式很舒心', text: '最近把旧简历拿出来重新整理了一下，换个版式清爽很多。' },
  { id: 'job', label: '准备找工作', text: '最近准备找工作，想把简历好好整理一下。' },
  { id: 'change', label: '想换工作', text: '最近想换工作，就把之前的简历重新整理了一下。' },
] as const
export type StoryChoices = { reason: string; feature: string; supporting: string[]; feeling: string; limitation: string; confirmed: boolean; extra: string }
export const EMPTY_STORY_CHOICES: StoryChoices = { reason: '', feature: '', supporting: [], feeling: '', limitation: '', confirmed: false, extra: '' }
export function storyLimitations(featureId: string, platform: StoryPlatform) {
  const feature = storyFeature(featureId, platform)
  return feature ? [{ id: 'specific', label: feature.limitation, text: feature.limitation }, { id: 'none', label: '暂时没有补充', text: '' }] : []
}
export function parseStoryChoices(value: unknown, platform: StoryPlatform = 'mobile'): StoryChoices {
  const raw = value && typeof value === 'object' ? value as Partial<StoryChoices> : {}
  const feature = typeof raw.feature === 'string' ? storyFeature(raw.feature, platform) : undefined
  return {
    reason: STORY_REASONS.some(item => item.id === raw.reason) ? raw.reason! : '',
    feature: feature?.id || '',
    supporting: Array.isArray(raw.supporting) ? [...new Set(raw.supporting.filter((id): id is string => typeof id === 'string' && id !== feature?.id && Boolean(storyFeature(id, platform))))].slice(0, 2) : [],
    feeling: feature?.feelings.some(item => item.id === raw.feeling) ? raw.feeling! : '',
    limitation: storyLimitations(feature?.id || '', platform).some(item => item.id === raw.limitation) ? raw.limitation! : '',
    confirmed: Boolean(feature) && raw.confirmed === true,
    extra: typeof raw.extra === 'string' ? raw.extra.slice(0, 150) : '',
  }
}
export function choiceExperience(choices: StoryChoices) {
  return { reason: choices.reason, trouble: choices.feature, change: JSON.stringify([choices.feeling, choices.limitation, choices.supporting, choices.confirmed]), extra: choices.extra }
}
export function buildStoryTemplate(choices: StoryChoices, platform: StoryPlatform) {
  const normalized = parseStoryChoices(choices, platform)
  const feature = storyFeature(choices.feature, platform)
  const reason = STORY_REASONS.find(item => item.id === choices.reason)
  const feeling = feature?.feelings.find(item => item.id === choices.feeling)
  const limitation = storyLimitations(choices.feature, platform).find(item => item.id === choices.limitation)
  if (!feature || !reason || !feeling || !limitation || !normalized.confirmed || JSON.stringify(normalized.supporting) !== JSON.stringify(choices.supporting)) throw new Error('请选择实际用过的功能、原因和感受，并确认这次的使用经历。')
  const support = normalized.supporting.map(id => storyFeature(id, platform)!)
  const paragraphs = [reason.text, `这次在${platform === 'mobile' ? '手机端' : '电脑网页版'}用智简简历，${feature.action}。${feeling.text}`,
    support.length ? `这次还用到了${support.map(item => item.mention || item.label).join('和')}。` : '', limitation.text, normalized.extra.trim()].filter(Boolean)
  return { title: feeling.id === 'trying' ? `试用${feature.label}的一点记录` : feature.title, body: paragraphs.join('\n\n'), tags: ['简历整理', feature.label.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '')], version: 'feature-story-v2' }
}
