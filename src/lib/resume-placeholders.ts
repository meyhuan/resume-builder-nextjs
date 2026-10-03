export function normalizePlaceholderText(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
}

export function hasMeaningfulText(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return normalizePlaceholderText(value).length > 0
}

export function hasMeaningfulHtml(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /<(?:img|video|audio|iframe|svg)\b/i.test(value) || htmlToPlainText(value).length > 0
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' ')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return normalizePlaceholderText(
    stripped
      .replace(/&(?:nbsp|#0*160|#x0*a0);/gi, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"'),
  )
}
