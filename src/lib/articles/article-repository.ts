import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { getAllArticles as getLegacyArticles, ARTICLE_CATEGORIES } from './article-data';
import type { Article, ArticleCategoryId } from './article-types';

export const ARTICLES_CACHE_TAG = 'published-articles';
export function isArticleDatabaseEnabled() {
  return process.env.ARTICLE_DATABASE_ENABLED === 'true';
}

// Include draft slugs so unpublishing a database override cannot resurrect a legacy article.
const readArticles = unstable_cache(async (): Promise<Article[]> => {
  const rows = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
  const overridden = new Set(rows.map((row) => row.slug));
  const published: Article[] = rows.filter((row) => row.status === 'PUBLISHED').map((row) => ({
    slug: row.slug, title: row.title, abstract: row.summary,
    markdownContent: row.content, htmlContent: '', textContent: row.content,
    category: ARTICLE_CATEGORIES.some((cat) => cat.id !== 'all' && cat.id === row.category)
      ? row.category as ArticleCategoryId : 'career-guide',
    tags: row.tags, cover: '', views: 0, sourceUrl: '',
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  }));
  return [...getLegacyArticles().filter((article) => !overridden.has(article.slug)), ...published]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}, ['articles-v1'], { revalidate: 60, tags: [ARTICLES_CACHE_TAG] });

// Fail loudly on database errors: ISR retains the last good page instead of caching an empty list.
export const getPublishedArticles = cache(async (): Promise<Article[]> =>
  isArticleDatabaseEnabled() ? readArticles() : getLegacyArticles());

export async function getPublishedArticle(slug: string) {
  return (await getPublishedArticles()).find((article) => article.slug === slug);
}

export async function getPublishedAdjacentArticles(slug: string) {
  const articles = await getPublishedArticles();
  const index = articles.findIndex((article) => article.slug === slug);
  return { prev: index > 0 ? articles[index - 1] : null, next: index >= 0 ? articles[index + 1] ?? null : null };
}
