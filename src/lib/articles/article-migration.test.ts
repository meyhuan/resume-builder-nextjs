import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('migrates PostgreSQL, defaults Table Editor inserts, enforces unique slugs and updates timestamps', async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync('prisma/migrations/202611080001_articles/migration.sql', 'utf8'));
    const inserted = await db.query<{ id: string; status: string; tags: string[]; updatedAt: Date }>(`INSERT INTO "Article" (slug, title, content, summary, "updatedAt") VALUES ('test', '标题', '正文', '摘要', '2020-01-01') RETURNING *`);
    expect(inserted.rows[0].id).toBeTruthy(); expect(inserted.rows[0].status).toBe('DRAFT'); expect(inserted.rows[0].tags).toEqual([]);
    await expect(db.exec(`INSERT INTO "Article" (slug, title, content, summary) VALUES ('test', '重复', '正文', '摘要')`)).rejects.toThrow();
    const updated = await db.query<{ updatedAt: Date }>(`UPDATE "Article" SET status = 'PUBLISHED' WHERE slug = 'test' RETURNING "updatedAt"`);
    expect(updated.rows[0].updatedAt.getTime()).toBeGreaterThan(inserted.rows[0].updatedAt.getTime());
    const policy = await db.query<{ relrowsecurity: boolean }>(`SELECT relrowsecurity FROM pg_class WHERE relname = 'Article'`);
    expect(policy.rows[0].relrowsecurity).toBe(true);
  } finally { await db.close(); }
});
