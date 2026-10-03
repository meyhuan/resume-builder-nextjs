import type { BaseInfo } from '@/entities/user/base-info'

type MetricPrefix = '业绩' | '亮点'

/** Read legacy saved fields without inventing facts for an empty resume. */
export function readSavedMetrics(baseInfo: BaseInfo | null, prefix: MetricPrefix): string[][] {
  return Array.from({ length: 3 }, (_, index) => {
    const field = baseInfo?.customFields?.find((item) => item.label === `${prefix}${index + 1}`)
    if (!field?.value?.trim()) return ['', '']
    const [value, ...description] = field.value.split(/[|｜]/).map((part) => part.trim())
    // A separator-only saved value is not a real achievement.
    if (!value) return ['', '']
    return [value, description.filter(Boolean).join(' / ') || field.label]
  })
}

/** Preserve unrelated user data; clearing a card removes only its legacy field. */
export function writeSavedMetrics(baseInfo: BaseInfo | null, prefix: MetricPrefix, items: string[][]): BaseInfo {
  const labels = new Set(Array.from({ length: 3 }, (_, index) => `${prefix}${index + 1}`))
  const existing = (baseInfo?.customFields ?? []).filter((field) => !labels.has(field.label))
  const saved = items.slice(0, 3).flatMap(([value, description], index) => {
    if (!value?.trim()) return []
    return [{ label: `${prefix}${index + 1}`, value: [value.trim(), description?.trim()].filter(Boolean).join('｜') }]
  })
  return { ...(baseInfo ?? {}), customFields: [...existing, ...saved] }
}
