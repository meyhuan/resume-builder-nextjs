export function normalizePlaceholderText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function hasMeaningfulText(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return normalizePlaceholderText(value).length > 0
}

export function hasMeaningfulHtml(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return htmlToPlainText(value).length > 0
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' ')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return normalizePlaceholderText(
    stripped
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"'),
  )
}
