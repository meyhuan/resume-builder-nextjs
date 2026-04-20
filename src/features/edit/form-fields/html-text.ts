/**
 * Utilities for converting between HTML and plain text, used by mobile
 * textarea fields that drive HTML-backed block content.
 */

/**
 * Strip HTML tags and normalize whitespace into plain text lines.
 */
export function htmlToPlainText(html: string | undefined): string {
  if (!html) return ''
  // Replace <br>, </p>, </li>, </div> with newlines so structure survives.
  const withBreaks: string = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
  const stripped: string = withBreaks.replace(/<[^>]+>/g, '')
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Wrap plain-text lines into safe HTML paragraphs.
 */
export function plainTextToHtml(text: string): string {
  if (!text.trim()) return ''
  const escaped: string = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const paragraphs: string[] = escaped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
  return paragraphs.join('')
}
