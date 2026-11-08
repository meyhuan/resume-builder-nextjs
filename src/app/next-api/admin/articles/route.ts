import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/verify-admin-password';
import { articleInput } from '@/lib/articles/article-input';
import { isArticleDatabaseEnabled } from '@/lib/articles/article-repository';
import { revalidateArticles } from '@/lib/articles/revalidate-articles';

export const runtime = 'nodejs';
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('refresh') }),
  z.object({ action: z.literal('save'), article: articleInput, id: z.string().min(1).optional(), updatedAt: z.iso.datetime().optional() }),
]);
const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 500000) return respond({ error: '文章内容过大' }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { return respond({ error: '无效的请求内容' }, 400); }
  if (!await verifyAdminPassword(typeof body.adminPassword === 'string' ? body.adminPassword : '')) {
    return respond({ error: '管理员验证失败，请重新登录' }, 403);
  }
  if (!isArticleDatabaseEnabled()) return respond({ error: '文章数据库尚未启用，请先完成数据库迁移并设置 ARTICLE_DATABASE_ENABLED=true' }, 503);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return respond({ error: '请检查文章链接、标题、摘要和正文是否完整，且未超过长度限制' }, 400);
  const input = parsed.data;
  try {
    if (input.action === 'list') {
      const articles = await prisma.article.findMany({ orderBy: { updatedAt: 'desc' } });
      return respond({ articles });
    }
    if (input.action === 'refresh') {
      revalidateArticles();
      return respond({ ok: true });
    }
    let article;
    if (input.id) {
      if (!input.updatedAt) return respond({ error: '缺少文章版本，请重新打开文章' }, 400);
      // Slugs stay fixed after creation to preserve external links; version guards prevent lost edits.
      const result = await prisma.article.updateMany({
        where: { id: input.id, slug: input.article.slug, updatedAt: new Date(input.updatedAt) },
        data: input.article,
      });
      if (!result.count) return respond({ error: '文章已被其他操作修改或链接发生变化，请重新打开后再保存' }, 409);
      article = await prisma.article.findUniqueOrThrow({ where: { id: input.id } });
    } else {
      article = await prisma.article.create({ data: input.article });
    }
    // A failed invalidation must not be reported as a failed save (a retry could duplicate a new row).
    let warning: string | undefined;
    try { revalidateArticles(); } catch { warning = '文章已保存，但缓存刷新失败，请点击“刷新前台缓存”重试。'; }
    return respond({ article, warning });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return respond({ error: '文章链接已存在，请更换链接或打开原文章编辑' }, 409);
    }
    return respond({ error: '文章操作失败，请检查数据库连接及迁移状态后重试' }, 503);
  }
}
