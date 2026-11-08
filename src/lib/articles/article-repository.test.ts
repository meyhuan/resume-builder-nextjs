import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { article: { findMany: mocks.findMany } } }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
import { getPublishedArticles, getPublishedArticle, getPublishedAdjacentArticles } from './article-repository';
import { getAllArticles } from './article-data';

const row = { id: 'test', slug: 'new-test', title: '数据库文章', content: '## 正文', summary: '摘要', category: 'resume-writing', tags: ['求职'], status: 'PUBLISHED', createdAt: new Date('2026-11-08'), updatedAt: new Date('2026-11-08') };
beforeEach(() => { vi.stubEnv('ARTICLE_DATABASE_ENABLED', 'true'); mocks.findMany.mockReset(); });
describe('published article source', () => {
  it('supports legacy-only rollout without touching the database', async () => {
    vi.stubEnv('ARTICLE_DATABASE_ENABLED', 'false');
    expect(await getPublishedArticles()).toEqual(getAllArticles());
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it('merges published Markdown while hiding draft content', async () => {
    mocks.findMany.mockResolvedValue([row, { ...row, slug: 'secret-draft', status: 'DRAFT', content: 'private-content' }]);
    expect(await getPublishedArticle('new-test')).toMatchObject({ markdownContent: '## 正文', title: '数据库文章' });
    expect(await getPublishedArticle('secret-draft')).toBeUndefined();
    expect(JSON.stringify(await getPublishedArticles())).not.toContain('private-content');
  });
  it('replaces legacy slugs once and does not resurrect unpublished overrides', async () => {
    const slug = getAllArticles()[0].slug;
    mocks.findMany.mockResolvedValue([{ ...row, slug }]);
    expect((await getPublishedArticles()).filter((item) => item.slug === slug)).toHaveLength(1);
    expect((await getPublishedArticle(slug))?.title).toBe(row.title);
    mocks.findMany.mockResolvedValue([{ ...row, slug, status: 'DRAFT' }]);
    expect(await getPublishedArticle(slug)).toBeUndefined();
  });
  it('propagates database failures rather than caching disappearance of published content', async () => {
    mocks.findMany.mockRejectedValue(new Error('offline'));
    await expect(getPublishedArticles()).rejects.toThrow('offline');
  });
  it('returns no neighbors for missing articles', async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await getPublishedAdjacentArticles('not-found')).toEqual({ prev: null, next: null });
  });
});
