import { BRAND_TAGS, passphraseSentence } from '@/lib/xhs-note/topics'

export interface XhsCover {
  line1: string
  line2: string
  badge: string
}

export interface XhsNotePackage {
  titles: [string, string, string]
  body: string
  tags: string[]
  cover: XhsCover
}

const FORBIDDEN = ['保过', '包offer', '包 offer', '100%', '必过', '通过率', '录用率', '最好', '最强', '保证拿到']

export function charCount(value: string): number {
  return Array.from(value).length
}

export function validateXhsPackage(raw: unknown, inviteCode: string): string | null {
  if (!raw || typeof raw !== 'object') return '生成结果不是 JSON'
  const value = raw as Record<string, unknown>
  if (!Array.isArray(value.titles) || value.titles.length !== 3) return '需要 3 个标题'
  for (const title of value.titles) {
    if (typeof title !== 'string' || charCount(title.trim()) === 0 || charCount(title.trim()) > 20) {
      return '标题需在 20 字以内'
    }
  }
  if (typeof value.body !== 'string') return '缺少正文'
  const bodyLength = charCount(value.body.trim())
  if (bodyLength < 300 || bodyLength > 600) return '正文需在 300 到 600 字'
  if (!value.body.includes(passphraseSentence(inviteCode))) return '正文缺少口令句'
  if (!Array.isArray(value.tags) || value.tags.length < 6) return '话题不足 6 个'
  for (const brand of BRAND_TAGS) {
    if (!value.tags.includes(brand)) return '缺少品牌话题'
  }
  const cover = value.cover as Record<string, unknown> | undefined
  if (!cover || typeof cover.line1 !== 'string' || typeof cover.line2 !== 'string' || typeof cover.badge !== 'string') {
    return '封面文案不完整'
  }
  if (charCount(cover.line1.trim()) === 0 || charCount(cover.line1.trim()) > 18) return '封面主标题过长'
  const haystack = `${value.titles.join(' ')} ${value.body} ${cover.line1} ${cover.line2}`
  const hit = FORBIDDEN.find((word) => haystack.toLowerCase().includes(word.toLowerCase()))
  if (hit) return `包含禁用词：${hit}`
  return null
}

export function ensurePassphrase(raw: unknown, inviteCode: string): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const value = { ...(raw as Record<string, unknown>) }
  const sentence = passphraseSentence(inviteCode)
  const body = typeof value.body === 'string' ? value.body : ''
  if (!body.includes(sentence)) {
    value.body = `${body.trim()}\n${sentence}`.trim()
  }
  const tags = Array.isArray(value.tags) ? value.tags.filter((tag) => typeof tag === 'string') : []
  value.tags = [...BRAND_TAGS, ...tags.filter((tag) => !BRAND_TAGS.includes(tag as typeof BRAND_TAGS[number]))].slice(0, 8)
  return value
}
