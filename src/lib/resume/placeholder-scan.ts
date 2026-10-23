import type { ResumeData } from '@/entities/resume/resume-data';

export interface PlaceholderLocation {
  readonly blockId: string;
  readonly label: string;
  readonly snippet: string;
}

export interface PlaceholderScanResult {
  readonly hasPlaceholders: boolean;
  readonly count: number;
  readonly locations: readonly PlaceholderLocation[];
}

const PLACEHOLDER_REGEX = /\[X\](?:%|\+)?|\[建议补充[^\]]*\]/gi;

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Scans resume data for unresolved AI placeholders like [X]%, [X]+, [建议补充: ...].
 * Used before exporting to warn users if placeholders remain.
 */
export function scanResumePlaceholders(resume: ResumeData): PlaceholderScanResult {
  const locations: PlaceholderLocation[] = [];
  let totalCount = 0;

  for (const section of resume.sections || []) {
    for (const block of section.blocks || []) {
      const html =
        ('contentHtml' in block && typeof block.contentHtml === 'string'
          ? block.contentHtml
          : '') ||
        ('html' in block && typeof block.html === 'string' ? block.html : '') ||
        ('courseHtml' in block && typeof block.courseHtml === 'string'
          ? block.courseHtml
          : '') ||
        (block.type === 'list' && Array.isArray(block.items)
          ? block.items.map((it) => it.html || '').join(' ')
          : '');

      if (!html) continue;

      const matches = html.match(PLACEHOLDER_REGEX);
      if (matches && matches.length > 0) {
        totalCount += matches.length;
        const plain = stripTags(html);
        const matchIdx = plain.search(PLACEHOLDER_REGEX);
        const start = Math.max(0, matchIdx - 15);
        const end = Math.min(plain.length, matchIdx + 35);
        const snippet = (start > 0 ? '...' : '') + plain.slice(start, end) + (end < plain.length ? '...' : '');

        locations.push({
          blockId: block.id,
          label: `${section.title}`,
          snippet,
        });
      }
    }
  }

  return {
    hasPlaceholders: totalCount > 0,
    count: totalCount,
    locations,
  };
}
