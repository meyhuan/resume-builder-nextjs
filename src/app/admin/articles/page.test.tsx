// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminArticlesPage from './page';
vi.mock('@/lib/admin-auth', () => ({ getStoredAdminPassword: () => 'test-only' }));
const article = { id: 'id', slug: 'existing', title: '已有文章', content: '## 正文', summary: '摘要', category: 'career-guide', tags: [], status: 'PUBLISHED', updatedAt: '2026-11-08T00:00:00.000Z', createdAt: '2026-11-08T00:00:00.000Z' };
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('loads an existing article and preserves the version while unpublishing', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ articles: [article] }) });
  render(<AdminArticlesPage />);
  fireEvent.click(await screen.findByRole('button', { name: /已有文章/ }));
  expect((screen.getByLabelText(/文章链接/) as HTMLInputElement).readOnly).toBe(true);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ article: { ...article, status: 'DRAFT' } }) });
  fireEvent.click(screen.getByRole('button', { name: '下架并保存草稿' }));
  await screen.findByText('已保存为草稿，前台不再展示此文章。');
  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body.id).toBe(article.id); expect(body.updatedAt).toBe(article.updatedAt); expect(body.article.status).toBe('DRAFT');
});
it('keeps edits and displays server conflict errors', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ articles: [article] }) });
  render(<AdminArticlesPage />);
  fireEvent.click(await screen.findByRole('button', { name: /已有文章/ }));
  fireEvent.change(screen.getByLabelText('标题'), { target: { value: '尚未保存的修改' } });
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: '版本冲突，请重新打开' }) });
  fireEvent.click(screen.getByRole('button', { name: '更新发布' }));
  expect((await screen.findByRole('alert')).textContent).toContain('版本冲突');
  expect((screen.getByLabelText('标题') as HTMLInputElement).value).toBe('尚未保存的修改');
  expect(screen.getByText('有未保存修改')).toBeTruthy();
});
it('shows configuration failures and lets the administrator retry', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: '文章数据库尚未启用' }) });
  render(<AdminArticlesPage />);
  expect((await screen.findByRole('alert')).textContent).toContain('尚未启用');
  await waitFor(() => expect((screen.getByRole('button', { name: '刷新前台缓存' }) as HTMLButtonElement).disabled).toBe(false));
});
