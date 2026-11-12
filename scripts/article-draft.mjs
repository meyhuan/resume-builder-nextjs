#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { z } from 'zod';

const draftSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9\u4e00-\u9fa5]+(?:-[a-z0-9\u4e00-\u9fa5]+)*$/),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(1000),
  content: z.string().trim().min(1).max(100000),
  category: z.enum(['resume-writing', 'fresh-graduate', 'interview-tips', 'career-guide']),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  status: z.literal('DRAFT').default('DRAFT'),
}).strict();

export function parseDraft(input) {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) throw new Error('草稿格式无效：检查必填字段、长度和分类；status 只能是 DRAFT，文件不能包含凭据或其他字段。');
  return parsed.data;
}

export function validateOrigin(value = 'https://aijianli.cn') {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol);
  if ((!local && url.origin !== 'https://aijianli.cn') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('仅允许 https://aijianli.cn 或本机测试 origin，禁止向其他地址发送管理员凭据。');
  }
  return url.origin;
}

export async function saveDraft({ input, origin, password, receipt, fetchImpl = fetch }) {
  const article = parseDraft(input);
  origin = validateOrigin(origin);
  if (!password) throw new Error('缺少 ADMIN_PASSWORD。请使用已有私有配置；不要在聊天中发送密码。');
  async function api(body) {
    const response = await fetchImpl(`${origin}/next-api/admin/articles`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, adminPassword: password }),
    });
    if (!response.ok) throw new Error(`文章接口 HTTP ${response.status}；403 检查凭据，409 重新核对版本，503 检查服务配置。不要盲目重试写入。`);
    return response.json();
  }
  const listed = await api({ action: 'list' });
  const existing = listed.articles.find((row) => row.slug === article.slug);
  if (receipt) {
    if (receipt.origin !== origin || receipt.article?.slug !== article.slug || !receipt.article.id || !receipt.article.updatedAt) {
      throw new Error('回执与目标站点或文章不匹配。');
    }
    if (!existing || existing.id !== receipt.article.id || existing.updatedAt !== receipt.article.updatedAt || existing.status !== 'DRAFT') {
      throw new Error('草稿版本已变化或文章已发布，请重新读取并人工核对；不会覆盖或下架现有文章。');
    }
  } else {
    if (existing) throw new Error('此链接已有数据库文章，请检查原草稿回执或使用新的唯一链接。');
    const response = await fetchImpl(`${origin}/articles/${encodeURIComponent(article.slug)}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (response.status !== 404) throw new Error('此链接已公开存在或无法确认不存在，请更换链接或排查访问状态。');
  }
  const result = await api({ action: 'save', article, ...(receipt ? { id: receipt.article.id, updatedAt: receipt.article.updatedAt } : {}) });
  const saved = result.article;
  if (!saved?.id || !saved.updatedAt || saved.slug !== article.slug || saved.status !== 'DRAFT') {
    throw new Error('保存返回值异常，请在后台核对结果，禁止自动重试创建。');
  }
  const verified = (await api({ action: 'list' })).articles.find((row) => row.id === saved.id);
  if (!verified || verified.updatedAt !== saved.updatedAt || Object.keys(article).some((key) => JSON.stringify(verified[key]) !== JSON.stringify(article[key]))) {
    throw new Error('保存后回读不一致，请在后台核对，不要继续发布或重复创建。');
  }
  return {
    origin, adminUrl: `${origin}/admin/articles`,
    publicUrl: `${origin}/articles/${encodeURIComponent(article.slug)}`,
    article: { ...article, id: saved.id, updatedAt: saved.updatedAt },
    warning: result.warning ? '已保存，但服务端提示缓存刷新异常，请到后台检查。' : undefined,
    reviewState: 'AWAITING_USER_APPROVAL',
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('用法：pnpm article:draft --file <article.json> --receipt <receipt.json> [--origin http://localhost:3000] [--dry-run]\n只保存草稿；回执存在时按该版本更新。不会发布文章。');
    return;
  }
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--dry-run') { options.dryRun = true; continue; }
    if (!['--file', '--receipt', '--origin'].includes(key) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('参数无效，请使用 --help。');
    options[key.slice(2)] = args[++index];
  }
  if (!options.file || !options.receipt || resolve(options.file) === resolve(options.receipt)) throw new Error('请指定不同的 --file 和 --receipt 路径。');
  const input = parseDraft(JSON.parse((await readFile(options.file, 'utf8')).replace(/^\uFEFF/, '')));
  const origin = validateOrigin(options.origin);
  if (options.dryRun) { console.log(JSON.stringify({ valid: true, status: 'DRAFT', slug: input.slug, origin, networkRequests: 0 })); return; }
  let receipt;
  try { receipt = JSON.parse((await readFile(options.receipt, 'utf8')).replace(/^\uFEFF/, '')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('回执文件不可读取或格式无效，不能忽略已有回执继续创建。'); }
  await mkdir(dirname(resolve(options.receipt)), { recursive: true });
  if (!process.env.ADMIN_PASSWORD) {
    const require = createRequire(import.meta.url);
    createRequire(require.resolve('next/package.json'))('@next/env').loadEnvConfig(process.cwd(), false);
  }
  const result = await saveDraft({ input, origin, password: process.env.ADMIN_PASSWORD, receipt });
  await writeFile(options.receipt, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ status: 'DRAFT', id: result.article.id, slug: result.article.slug, updatedAt: result.article.updatedAt, receipt: resolve(options.receipt), adminUrl: result.adminUrl, warning: result.warning, next: '向用户展示完整内容和本次版本，等待明确发布确认。' }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    // Never log request objects, credential values, response bodies or fetch error causes.
    const known = /^(草稿|仅允许|缺少|文章接口|回执|草稿版本|此链接|保存|参数|请指定)/.test(error.message);
    console.error(known ? error.message : '操作失败：请检查本地文件、网络或回执写入权限。远端可能已保存，请先在后台核对，禁止盲目重试。');
    process.exitCode = 1;
  });
}
