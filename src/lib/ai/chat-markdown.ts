const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function htmlToMarkdown(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/(ul|ol)>/gi, '\n')
    .replace(/<(ul|ol)[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/?(strong|b)[^>]*>/gi, '**')
    .replace(/<\/?(em|i)[^>]*>/gi, '*')
    .replace(/<[^>]+>/g, '');

  text = decodeEntities(text);
  return collapseBlankLines(text);
}

function collapseBlankLines(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Chat replies sometimes include resume HTML or empty tags.
 * Convert those into compact markdown so the bubble does not grow a blank block.
 */
export function prepareAssistantMarkdown(text: string): string {
  if (!text) return '';

  let next = text.replace(/```(?:html|xml|xhtml)?\s*\n?([\s\S]*?)```/gi, (_match, html: string) => (
    htmlToMarkdown(html)
  ));

  if (HTML_TAG_RE.test(next)) {
    next = htmlToMarkdown(next);
  }

  return collapseBlankLines(next);
}
