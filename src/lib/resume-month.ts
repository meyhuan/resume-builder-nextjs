export interface ResumeMonth { readonly year: number; readonly month: number }

/** Both separators are persisted by existing PC/mobile resumes. */
export function parseResumeMonth(value: string): ResumeMonth | null {
  const match = value.trim().match(/^(\d{4})[.-](\d{1,2})$/)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2])
  return year >= 1900 && month >= 1 && month <= 12 ? { year, month } : null
}

export function monthOrdinal(value: string): number | null {
  const parsed = parseResumeMonth(value)
  return parsed ? parsed.year * 12 + parsed.month - 1 : null
}

export function monthRangeError(start: string, end: string, now = new Date()): string | null {
  const first = monthOrdinal(start), last = monthOrdinal(end)
  if (start && first == null) return '请选择有效的开始月份'
  if (end && end !== '至今' && last == null) return '请选择有效的结束月份'
  const effectiveEnd = end === '至今' ? now.getFullYear() * 12 + now.getMonth() : last
  if (first != null && effectiveEnd != null && first > effectiveEnd) {
    return end === '至今' ? '未来的开始月份不能选择“至今”' : '结束月份不能早于开始月份'
  }
  return null
}
