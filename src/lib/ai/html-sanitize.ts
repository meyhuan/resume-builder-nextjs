const ALLOWED_TAGS = new Set(['p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'br']);

/**
 * Very small HTML sanitizer for AI-generated resume fragments.
 * Keeps a whitelist of tags and strips attributes / scripts.
 */
export function sanitizeResumeHtml(input: string): string {
  if (!input) return '';
  const withoutScripts = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');

  return withoutScripts.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    const isClose = full.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (isClose) return `</${tag}>`;
    if (tag === 'br') return '<br />';
    void attrs;
    return `<${tag}>`;
  });
}
