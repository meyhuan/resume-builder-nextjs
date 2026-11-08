'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredAdminPassword } from '@/lib/admin-auth';
import { ARTICLE_CATEGORIES } from '@/lib/articles/article-data';
import { articleInput, type ArticleInput } from '@/lib/articles/article-input';
import { ArticleMarkdown } from '@/components/articles/article-markdown';
import '@/styles/article-prose.css';

type SavedArticle = ArticleInput & { id: string; updatedAt: string; createdAt: string };
const emptyArticle: ArticleInput = { slug: '', title: '', summary: '', content: '', category: 'career-guide', tags: [], status: 'DRAFT' };
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

async function requestArticles(body: Record<string, unknown>) {
  const response = await fetch('/next-api/admin/articles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, adminPassword: getStoredAdminPassword() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '操作失败，请稍后重试');
  return data;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [form, setForm] = useState<ArticleInput>({ ...emptyArticle });
  const [selected, setSelected] = useState<SavedArticle | null>(null);
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    requestArticles({ action: 'list' }).then((data) => setArticles(data.articles))
      .catch((err: Error) => setError(err.message)).finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  function openArticle(article: SavedArticle | null) {
    if (dirty && !window.confirm('当前修改尚未保存，确定放弃修改？')) return;
    setSelected(article); setForm(article ?? { ...emptyArticle }); setTags(article?.tags.join('，') ?? '');
    setDirty(false); setError(''); setMessage(''); setPreview(false);
  }
  function change<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value })); setDirty(true);
  }
  async function save(status: ArticleInput['status']) {
    setError(''); setMessage('');
    const parsed = articleInput.safeParse({ ...form, status, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) });
    if (!parsed.success) { setError('请填写完整标题、链接、摘要与正文；链接仅支持小写字母、数字、中文及短横线，最多 100 字符。标签最多 20 个，每个不超过 40 字符。'); return; }
    setBusy(true);
    try {
      const data = await requestArticles({ action: 'save', article: parsed.data, id: selected?.id, updatedAt: selected?.updatedAt });
      const article = data.article as SavedArticle;
      setSelected(article); setForm(article); setDirty(false);
      setArticles((previous) => [article, ...previous.filter((item) => item.id !== article.id)]);
      setMessage(data.warning ?? (status === 'PUBLISHED' ? '已发布，前台将在下次访问时重新生成。' : '已保存为草稿，前台不再展示此文章。'));
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true); setError(''); setMessage('');
    try {
      await requestArticles({ action: 'refresh' });
      const data = await requestArticles({ action: 'list' }); setArticles(data.articles);
      setMessage('已刷新前台缓存和文章列表。若在数据库中改过当前文章，请重新打开再编辑。');
    } catch (err) { setError(err instanceof Error ? err.message : '刷新失败'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-slate-900">文章管理</h1><p className="mt-1 text-sm text-slate-500">Markdown 写作、预览与发布，发布后无需重新打包。</p></div>
      <button type="button" disabled={busy} onClick={refresh} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">刷新前台缓存</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">{message}</p>}
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-2">
        <button type="button" disabled={busy} onClick={() => openArticle(null)} className="w-full rounded-lg bg-violet-600 p-2.5 text-sm text-white disabled:opacity-50">新建文章</button>
        <p className="text-xs leading-5 text-slate-500">这里显示数据库文章。原有攻略继续保留，创建相同链接可覆盖原文章。</p>
        {articles.map((article) => <button type="button" disabled={busy} key={article.id} onClick={() => openArticle(article)} className={`w-full rounded-lg border p-3 text-left text-sm ${selected?.id === article.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white'}`}>
          <span className="block break-words font-medium">{article.title}</span><span className="text-xs text-slate-500">{article.status === 'PUBLISHED' ? '已发布' : '草稿'}</span>
        </button>)}
      </aside>
      <form onSubmit={(event) => { event.preventDefault(); void save('PUBLISHED'); }} className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-medium">标题<input autoFocus required maxLength={200} value={form.title} onChange={(event) => change('title', event.target.value)} className={fieldClass} /></label>
          <label className="block text-sm font-medium">文章链接（创建后固定）<input required maxLength={100} readOnly={!!selected} placeholder="例如 interview-preparation" value={form.slug} onChange={(event) => change('slug', event.target.value)} className={fieldClass} /><span className="mt-1 block break-all text-xs text-slate-500">/articles/{form.slug}</span></label>
          <label className="block text-sm font-medium">摘要<textarea required maxLength={1000} rows={3} value={form.summary} onChange={(event) => change('summary', event.target.value)} className={fieldClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">分类<select value={form.category} onChange={(event) => change('category', event.target.value as ArticleInput['category'])} className={fieldClass}>{ARTICLE_CATEGORIES.filter((category) => category.id !== 'all').map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
            <label className="block text-sm font-medium">标签（逗号分隔）<input value={tags} onChange={(event) => { setTags(event.target.value); setDirty(true); }} className={fieldClass} /></label>
          </div>
          <div className="flex items-center justify-between"><label htmlFor="article-content" className="text-sm font-medium">正文（Markdown）</label><button type="button" onClick={() => setPreview(!preview)} className="text-sm text-violet-600">{preview ? '继续编辑' : '预览正文'}</button></div>
          {preview ? <div className="article-prose min-h-80 rounded-lg border p-4"><ArticleMarkdown content={form.content} /></div> : <textarea id="article-content" required maxLength={100000} rows={18} value={form.content} onChange={(event) => change('content', event.target.value)} className={`${fieldClass} font-mono`} />}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">{busy ? '处理中…' : selected?.status === 'PUBLISHED' ? '更新发布' : '发布文章'}</button>
            <button type="button" onClick={() => save('DRAFT')} className="rounded-lg border px-4 py-2 text-sm">{selected?.status === 'PUBLISHED' ? '下架并保存草稿' : '保存草稿'}</button>
            {selected?.status === 'PUBLISHED' && <Link target="_blank" href={`/articles/${encodeURIComponent(selected.slug)}`} className="text-sm text-violet-600">查看文章</Link>}
            {dirty && <span className="text-xs text-amber-700">有未保存修改</span>}
          </div>
        </fieldset>
      </form>
    </div>
  </div>;
}
