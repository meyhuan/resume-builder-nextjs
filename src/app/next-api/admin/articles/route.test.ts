import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), tag: vi.fn(), path: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { article: { findMany: mocks.findMany, create: mocks.create, updateMany: mocks.updateMany, findUniqueOrThrow: mocks.findUniqueOrThrow } } }));
vi.mock('@/lib/verify-admin-password', () => ({ verifyAdminPassword: mocks.verify }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: mocks.tag, revalidatePath: mocks.path }));
import { POST } from './route';
const article = { slug: 'new-article', title: '求职建议', content: '# 正文', summary: '摘要', category: 'career-guide', tags: [], status: 'PUBLISHED' };
const request = (body: unknown) => POST(new Request('http://localhost/next-api/admin/articles', { method: 'POST', body: JSON.stringify(body) }));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('ARTICLE_DATABASE_ENABLED', 'true'); mocks.verify.mockResolvedValue(true); });
it('denies unauthorized reads and writes before accessing the database', async () => {
  mocks.verify.mockResolvedValue(false);
  for (const action of ['list', 'save', 'refresh']) expect((await request({ action, article })).status).toBe(403);
  expect(mocks.findMany).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.tag).not.toHaveBeenCalled();
});
it('validates JSON and input instead of storing unsafe URLs or empty content', async () => {
  expect((await POST(new Request('http://localhost', { method: 'POST', body: '{' }))).status).toBe(400);
  for (const invalid of [{ ...article, slug: '../private' }, { ...article, content: '' }, { ...article, status: 'OTHER' }]) {
    expect((await request({ action: 'save', article: invalid })).status).toBe(400);
  }
  expect(mocks.create).not.toHaveBeenCalled();
});
it('does not access an unconfigured database', async () => {
  vi.stubEnv('ARTICLE_DATABASE_ENABLED', 'false');
  expect((await request({ action: 'list' })).status).toBe(503);
  expect(mocks.findMany).not.toHaveBeenCalled();
});
it('publishes and invalidates list, detail/404, homepage, recommendations and sitemap', async () => {
  mocks.create.mockResolvedValue({ ...article, id: 'id' });
  const response = await request({ action: 'save', article });
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(mocks.create).toHaveBeenCalledWith({ data: article });
  expect(mocks.tag).toHaveBeenCalledWith('published-articles');
  expect(mocks.path).toHaveBeenCalledWith('/articles/[slug]', 'page');
  expect(mocks.path).toHaveBeenCalledWith('/articles');
  expect(mocks.path).toHaveBeenCalledWith('/sitemap.xml');
  expect(mocks.path).toHaveBeenCalledWith('/');
  expect(mocks.path).toHaveBeenCalledWith('/templates/[role]', 'page');
});
it('guards stale versions and slug changes', async () => {
  mocks.updateMany.mockResolvedValue({ count: 0 });
  expect((await request({ action: 'save', id: 'id', updatedAt: '2026-11-08T00:00:00.000Z', article })).status).toBe(409);
  expect(mocks.tag).not.toHaveBeenCalled();
  expect((await request({ action: 'save', id: 'id', article })).status).toBe(400);
});
it('unpublishes using the version guard and invalidates published pages', async () => {
  mocks.updateMany.mockResolvedValue({ count: 1 }); mocks.findUniqueOrThrow.mockResolvedValue({ ...article, status: 'DRAFT' });
  expect((await request({ action: 'save', id: 'id', updatedAt: '2026-11-08T00:00:00.000Z', article: { ...article, status: 'DRAFT' } })).status).toBe(200);
  expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 'id', slug: article.slug, updatedAt: new Date('2026-11-08T00:00:00.000Z') }, data: { ...article, status: 'DRAFT' } });
  expect(mocks.tag).toHaveBeenCalled();
});
it('reports duplicate slugs and database failures without exposing internals', async () => {
  mocks.create.mockRejectedValue({ code: 'P2002' });
  expect((await request({ action: 'save', article })).status).toBe(409);
  mocks.create.mockRejectedValue(new Error('private connection string'));
  const response = await request({ action: 'save', article });
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('private connection');
});
it('reports cache failure as a saved article with retry advice', async () => {
  mocks.create.mockResolvedValue({ ...article, id: 'id' }); mocks.tag.mockImplementation(() => { throw new Error(); });
  const response = await request({ action: 'save', article });
  expect(response.status).toBe(200); expect((await response.json()).warning).toContain('已保存');
});
it('allows an authenticated refresh after Table Editor changes', async () => {
  expect((await request({ action: 'refresh' })).status).toBe(200); expect(mocks.tag).toHaveBeenCalled();
});
