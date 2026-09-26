// @vitest-environment node
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    $executeRaw: mocks.execute,
    user: {
      upsert: async ({ where }: { where: { wxId: string } }) => ({
        id: where.wxId,
      }),
    },
  },
}));
import { consumeAssistantQuota } from './quota';
const require = createRequire(import.meta.url);
const runtime = (() => {
  try {
    return require.resolve('@electric-sql/pglite');
  } catch {
    return resolve(
      'test-artifacts/ai-runtime/node_modules/@electric-sql/pglite',
    );
  }
})();
const { PGlite } = require(runtime);
const db = new PGlite();
function adapter(connection: typeof db) {
  const query = async (strings: TemplateStringsArray, ...values: unknown[]) =>
    connection.query(
      strings.reduce((sql, part, i) => sql + (i ? '$' + i : '') + part, ''),
      values,
    );
  return {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) =>
      (await query(strings, ...values)).rows,
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) =>
      (await query(strings, ...values)).affectedRows,
  };
}
beforeAll(async () => {
  await db.exec(
    `CREATE TABLE "UserQuota" ("userId" TEXT PRIMARY KEY,"quotas" JSONB NOT NULL DEFAULT '{}',"updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  mocks.transaction.mockImplementation((fn) =>
    db.transaction((tx: typeof db) => fn(adapter(tx))),
  );
  mocks.execute.mockImplementation(adapter(db).$executeRaw);
});
beforeEach(async () => {
  await db.exec('TRUNCATE "UserQuota"');
});
afterAll(async () => db.close());
it('caps concurrent generation at the existing daily feature limit', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      consumeAssistantQuota('u', false, 'polish'),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const result = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(result.rows[0].quotas['ai:polish-section'].used).toBe(5);
});
it('updates only the charged feature without overwriting other balances', async () => {
  await consumeAssistantQuota('u', false, 'generate');
  await consumeAssistantQuota('u', false, 'polish');
  await consumeAssistantQuota('u', false, 'chat');
  const { rows } = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(rows[0].quotas['ai:generate-section'].used).toBe(1);
  expect(rows[0].quotas['ai:polish-section'].used).toBe(1);
  expect(rows[0].quotas['ai:editor-assist'].used).toBe(1);
});
it('starts a new daily count and keeps different users isolated', async () => {
  await db.query(
    'INSERT INTO "UserQuota" ("userId", "quotas") VALUES ($1, $2)',
    [
      'u',
      JSON.stringify({
        'ai:polish-section': { used: 5, date: '2000-01-01' },
      }),
    ],
  );
  await consumeAssistantQuota('u', false, 'polish');
  await consumeAssistantQuota('other', false, 'polish');
  const { rows } = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(rows).toHaveLength(2);
  expect(
    rows.every(
      (r: { quotas: Record<string, { used: number }> }) =>
        r.quotas['ai:polish-section'].used === 1,
    ),
  ).toBe(true);
});
it('VIP generation leaves existing free balance unchanged', async () => {
  await consumeAssistantQuota('u', false, 'polish');
  await consumeAssistantQuota('u', true, 'polish');
  const { rows } = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(rows[0].quotas['ai:polish-section'].used).toBe(1);
});
