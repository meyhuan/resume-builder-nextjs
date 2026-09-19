// @vitest-environment node
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), execute: vi.fn() }));
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
import {
  reserveRequest,
  chargeRequest,
  finishRequest,
  failRequest,
} from './ledger';
import type { AssistantTask, AssistantTurn } from './types';
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
const task: AssistantTask = {
  id: '00000000-0000-4000-8000-000000000001',
  resumeId: 'r',
  feature: 'polish',
  blockId: 'b',
  label: '经历',
  entry: 'module',
};
beforeAll(async () => {
  await db.exec(
    `CREATE TABLE "UserQuota" ("userId" TEXT PRIMARY KEY,"quotas" JSONB NOT NULL DEFAULT '{}',"updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  await db.exec(
    readFileSync(
      'prisma/migrations/202609190001_unified_ai_tasks/migration.sql',
      'utf8',
    ),
  );
  mocks.transaction.mockImplementation((fn) =>
    db.transaction((tx: typeof db) => fn(adapter(tx))),
  );
  mocks.execute.mockImplementation(adapter(db).$executeRaw);
});
beforeEach(async () => {
  await db.exec(
    'TRUNCATE "AssistantRequest","AssistantTask","UserQuota" CASCADE',
  );
});
afterAll(async () => db.close());
it('binds tasks to authenticated owner and immutable target', async () => {
  await reserveRequest('u', task, 'req', 'digest');
  await expect(
    reserveRequest('attacker', task, 'other', 'x'),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    reserveRequest('u', { ...task, blockId: 'other' }, 'other', 'x'),
  ).rejects.toMatchObject({ status: 409 });
});
it('replays completed requests without consuming twice and rejects changed payload', async () => {
  await reserveRequest('u', task, 'req', 'digest');
  await chargeRequest('u', false, 'req', 'polish');
  await chargeRequest('u', false, 'req', 'polish');
  const turn = {
    requestId: 'req',
    text: '润色',
    answer: '',
    questions: [],
    proposals: [],
    followups: [],
    direct: false,
    charged: true,
    feature: 'polish',
  } as AssistantTurn;
  await finishRequest(task.id, turn);
  const replay = await reserveRequest('u', task, 'req', 'digest');
  expect(replay.replay).toEqual(turn);
  await expect(
    reserveRequest('u', task, 'req', 'different'),
  ).rejects.toMatchObject({ status: 409 });
  const result = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(result.rows[0].quotas['ai:polish-section'].used).toBe(1);
});
it('does not replay failed requests as successful changes', async () => {
  await reserveRequest('u', task, 'req', 'digest');
  await failRequest('req');
  await expect(
    reserveRequest('u', task, 'req', 'digest'),
  ).rejects.toMatchObject({ status: 409 });
});
it('caps concurrent attempts at the original feature limit', async () => {
  await reserveRequest('u', task, 'req', 'digest');
  for (let i = 1; i < 6; i++)
    await db.query(
      'INSERT INTO "AssistantRequest" ("id","taskId","digest") VALUES ($1,$2,$3)',
      ['req' + i, task.id, 'd' + i],
    );
  const results = await Promise.allSettled(
    ['req', 'req1', 'req2', 'req3', 'req4', 'req5'].map((id) =>
      chargeRequest('u', false, id, 'polish'),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const result = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(result.rows[0].quotas['ai:polish-section'].used).toBe(5);
});
it('VIP generation does not decrement free balance', async () => {
  await reserveRequest('u', task, 'req', 'digest');
  await chargeRequest('u', true, 'req', 'polish');
  const result = await db.query('SELECT "quotas" FROM "UserQuota"');
  expect(result.rows[0].quotas).toEqual({});
});
