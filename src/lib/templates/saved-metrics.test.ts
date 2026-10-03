import { describe, expect, it } from 'vitest'
import { readSavedMetrics, writeSavedMetrics } from '@/templates/_originals/saved-metrics'
import type { BaseInfo } from '@/entities/user/base-info'

describe('resume templates never invent achievements', () => {
  it.each(['业绩', '亮点'] as const)('returns no facts when %s fields are absent, blank or malformed', (prefix) => {
    const empty = [['', ''], ['', ''], ['', '']]
    expect(readSavedMetrics(null, prefix)).toEqual(empty)
    expect(readSavedMetrics({ email: 'user@example.com' }, prefix)).toEqual(empty)
    expect(readSavedMetrics({ customFields: [
      { label: `${prefix}1`, value: ' ' },
      { label: `${prefix}2`, value: '｜说明' },
    ] }, prefix)).toEqual(empty)
  })

  it('renders only explicit saved values without fabricated fallback descriptions', () => {
    expect(readSavedMetrics({ customFields: [
      { label: '亮点2', value: ' 12% ｜ 用户填写的改善结果 ' },
      { label: '亮点3', value: '用户自述' },
    ] }, '亮点')).toEqual([['', ''], ['12%', '用户填写的改善结果'], ['用户自述', '亮点3']])
  })

  it('keeps legacy slot order, removes cleared cards and preserves all unrelated data', () => {
    const base: BaseInfo = { email: 'user@example.com', customFields: [
      { label: '亮点1', value: '原有成果' },
      { label: '业绩1', value: '真实业绩' },
      { label: '作品链接', value: 'https://example.com' },
      { label: '亮点4', value: '普通自定义字段' },
    ] }
    const before = JSON.stringify(base)
    const saved = writeSavedMetrics(base, '亮点', [['', '不要保存'], [' 真实值 ', ' 真实说明 '], ['', '']])
    expect(saved.email).toBe(base.email)
    expect(saved.customFields).toEqual([
      ...base.customFields!.slice(1), { label: '亮点2', value: '真实值｜真实说明' },
    ])
    expect(readSavedMetrics(saved, '亮点')).toEqual([['', ''], ['真实值', '真实说明'], ['', '']])
    expect(JSON.stringify(base)).toBe(before)
  })
})
