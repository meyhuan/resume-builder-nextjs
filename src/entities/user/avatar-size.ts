export type AvatarSize = 'default' | 'large' | 'max'

export const AVATAR_SIZE_OPTIONS = [
  { value: 'default', label: '默认' },
  { value: 'large', label: '较大' },
  { value: 'max', label: '最大' },
] as const

/** Layout limits, shared by the template, desktop controls and mobile form. */
export function getAvatarMaxScale(templateId = ''): number {
  if (['jingrui', 'shanglan', 'shaoniangan'].includes(templateId)) return 1
  if (['huiying', 'lanqi', 'mixu', 'warm', 'lanmu', 'xingmiao', 'zixunhui', 'jilan', 'heiyao'].includes(templateId)) return 1.2
  if (['lanzhe', 'ziji', 'tablegrid', 'lanjiao'].includes(templateId)) return 1.3
  return 1.4
}

export function normalizeAvatarSize(value: unknown): AvatarSize {
  return value === 'large' || value === 'max' ? value : 'default'
}

export function getAvatarScale(value: unknown, maxScale = 1.4): number {
  const size = normalizeAvatarSize(value)
  return size === 'max' ? maxScale : size === 'large' ? 1 + (maxScale - 1) / 2 : 1
}
