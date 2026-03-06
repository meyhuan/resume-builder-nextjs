import type {
  RawArticle,
  Article,
  ArticleCategoryId,
  ArticleCategoryMeta,
  TocHeading,
  AdjacentArticles,
} from './article-types';
import rawArticles from '../../../files/aijianli.articles.json';

// ---------------------------------------------------------------------------
// Category registry
// ---------------------------------------------------------------------------

const CATEGORY_RAW_MAP: Record<string, ArticleCategoryId> = {
  '简历写作': 'resume-writing',
  '应届生求职': 'fresh-graduate',
  '面试技巧': 'interview-tips',
  '职场指南': 'career-guide',
};

export const ARTICLE_CATEGORIES: readonly ArticleCategoryMeta[] = [
  { id: 'all', label: '全部', rawLabel: '', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { id: 'resume-writing', label: '简历写作', rawLabel: '简历写作', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'fresh-graduate', label: '应届生求职', rawLabel: '应届生求职', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'interview-tips', label: '面试技巧', rawLabel: '面试技巧', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'career-guide', label: '职场指南', rawLabel: '职场指南', color: 'text-rose-600', bgColor: 'bg-rose-50' },
];

// ---------------------------------------------------------------------------
// Slug derivation
// ---------------------------------------------------------------------------

const SLUG_MAX_LENGTH = 64;

function hashString(value: string): string {
  let hash = 5381;
  for (const ch of value) {
    hash = ((hash << 5) + hash) ^ ch.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}

function normalizeSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, SLUG_MAX_LENGTH);
}

function deriveSlug(raw: RawArticle): string {
  const explicitSlug = raw.article_slug?.trim();
  if (explicitSlug) return normalizeSlug(explicitSlug);
  const sourceUrl = raw.source_url?.trim();
  if (sourceUrl) {
    const parts = sourceUrl.split('/');
    const filename = parts[parts.length - 1] ?? '';
    const slugFromFilename = filename.replace('.html', '').trim();
    if (slugFromFilename) return normalizeSlug(slugFromFilename);
  }
  const titleSlug = normalizeSlug(raw.article_title);
  if (titleSlug) return titleSlug;
  return `article-${hashString(raw.article_title || 'untitled')}`;
}

// ---------------------------------------------------------------------------
// Transform raw → clean Article
// ---------------------------------------------------------------------------

function transformArticle(raw: RawArticle): Article {
  return {
    slug: deriveSlug(raw),
    title: raw.article_title,
    abstract: raw.article_abstract,
    htmlContent: raw.article_html_content,
    textContent: raw.article_text_content,
    tags: raw.article_tags,
    category: CATEGORY_RAW_MAP[raw.article_category] ?? 'career-guide',
    cover: raw.article_cover,
    views: raw.article_views,
    sourceUrl: raw.source_url ?? '',
    createdAt: raw.createDate,
    updatedAt: raw.updateDate,
  };
}

// ---------------------------------------------------------------------------
// Cached article list (built once at import time — fine for SSG/SSR)
// ---------------------------------------------------------------------------

const RAW_ARTICLES: RawArticle[] = Array.isArray(rawArticles) ? (rawArticles as RawArticle[]) : [];
const ALL_ARTICLES: Article[] = RAW_ARTICLES.map(transformArticle);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get all articles sorted by creation date (newest first) */
export function getAllArticles(): Article[] {
  return [...ALL_ARTICLES].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Get a single article by slug */
export function getArticleBySlug(slug: string): Article | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

/** Get articles filtered by category id */
export function getArticlesByCategory(categoryId: ArticleCategoryId): Article[] {
  if (categoryId === 'all') return getAllArticles();
  return getAllArticles().filter((a) => a.category === categoryId);
}

/** Get previous and next articles relative to the given slug (within same sort order) */
export function getAdjacentArticles(slug: string): AdjacentArticles {
  const sorted = getAllArticles();
  const idx = sorted.findIndex((a) => a.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

/** Get category metadata by id */
export function getCategoryMeta(id: ArticleCategoryId): ArticleCategoryMeta {
  return ARTICLE_CATEGORIES.find((c) => c.id === id) ?? ARTICLE_CATEGORIES[0];
}

/** Extract h2/h3 headings from article HTML for TOC generation */
export function extractHeadings(html: string): TocHeading[] {
  const regex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings: TocHeading[] = [];
  let match: RegExpExecArray | null = regex.exec(html);
  while (match !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) {
      const id = `heading-${headings.length}`;
      headings.push({ id, text, level: parseInt(match[1], 10) as 2 | 3 });
    }
    match = regex.exec(html);
  }
  return headings;
}

/**
 * Inject id attributes into h2/h3 tags so TOC anchors work.
 * Returns the modified HTML string.
 */
export function injectHeadingIds(html: string): string {
  let idx = 0;
  return html.replace(/<h([23])([^>]*)>/gi, (_full, level: string, attrs: string) => {
    const id = `heading-${idx++}`;
    return `<h${level}${attrs} id="${id}">`;
  });
}

/** Get count of articles per category */
export function getCategoryCounts(): Record<ArticleCategoryId, number> {
  const counts: Record<string, number> = { all: ALL_ARTICLES.length };
  for (const cat of ARTICLE_CATEGORIES) {
    if (cat.id !== 'all') {
      counts[cat.id] = ALL_ARTICLES.filter((a) => a.category === cat.id).length;
    }
  }
  return counts as Record<ArticleCategoryId, number>;
}
