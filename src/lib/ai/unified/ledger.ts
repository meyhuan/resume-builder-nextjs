import { prisma } from '@/lib/prisma';
import { getQuotaLimit } from '@/lib/quota/membership-benefits';
import { quotaFeature, type AssistantTask, type AssistantTurn } from './types';

type TaskRow = {
  id: string;
  owner: string;
  context: AssistantTask;
  turns: AssistantTurn[];
};
type RequestRow = {
  digest: string;
  status: string;
  result: AssistantTurn | null;
  charged: boolean;
};
export class AssistantError extends Error {
  constructor(
    message: string,
    public status = 400,
    public quotaExceeded = false,
  ) {
    super(message);
  }
}
/** Raw, parameterized queries allow deployment without coupling the old generated client to the additive tables. */
export async function reserveRequest(
  owner: string,
  context: AssistantTask,
  id: string,
  digest: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO "AssistantTask" ("id", "owner", "context") VALUES (${context.id}, ${owner}, ${JSON.stringify(context)}::jsonb) ON CONFLICT ("id") DO NOTHING`;
    const [task] = await tx.$queryRaw<
      TaskRow[]
    >`SELECT * FROM "AssistantTask" WHERE "id"=${context.id} FOR UPDATE`;
    if (!task || task.owner !== owner)
      throw new AssistantError('任务不可用', 403);
    if (
      task.context.resumeId !== context.resumeId ||
      task.context.blockId !== context.blockId ||
      task.context.feature !== context.feature
    )
      throw new AssistantError('任务对象已变化，请新建任务', 409);
    const [existing] = await tx.$queryRaw<
      RequestRow[]
    >`SELECT * FROM "AssistantRequest" WHERE "id"=${id}`;
    if (existing) {
      if (existing.digest !== digest)
        throw new AssistantError('重试内容已变化，请重新发送', 409);
      if (existing.status === 'complete' && existing.result)
        return { task, replay: existing.result };
      throw new AssistantError(
        existing.status === 'failed'
          ? '上次请求未完成，请重新生成（将按新请求计次）'
          : '请求仍在处理中，请稍后重试原请求',
        409,
      );
    }
    const busy = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "AssistantRequest" WHERE "taskId"=${context.id} AND "status"='running' AND "createdAt">CURRENT_TIMESTAMP-INTERVAL '3 minutes'`;
    if (busy.length) throw new AssistantError('当前任务仍在处理中', 409);
    await tx.$executeRaw`UPDATE "AssistantRequest" SET "status"='failed' WHERE "taskId"=${context.id} AND "status"='running'`;
    await tx.$executeRaw`INSERT INTO "AssistantRequest" ("id","taskId","digest") VALUES (${id},${context.id},${digest})`;
    return { task, replay: null };
  });
}
export async function chargeRequest(
  owner: string,
  isVip: boolean,
  id: string,
  feature: AssistantTask['feature'],
) {
  const key = quotaFeature(feature);
  const user = await prisma.user.upsert({
    where: { wxId: owner },
    update: {},
    create: { wxId: owner },
    select: { id: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO "UserQuota" ("userId","quotas","updatedAt") VALUES (${user.id},'{}'::jsonb,CURRENT_TIMESTAMP) ON CONFLICT ("userId") DO NOTHING`;
    const [row] = await tx.$queryRaw<
      { quotas: Record<string, { used: number; date: string }> }[]
    >`SELECT "quotas" FROM "UserQuota" WHERE "userId"=${user.id} FOR UPDATE`;
    const [request] = await tx.$queryRaw<
      { charged: boolean; status: string }[]
    >`SELECT "charged","status" FROM "AssistantRequest" WHERE "id"=${id} FOR UPDATE`;
    if (!request || request.status !== 'running')
      throw new AssistantError('请求已结束，请重新发送', 409);
    if (request.charged) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const previous = row.quotas[key];
    const used = previous?.date === date ? previous.used : 0;
    if (!isVip && used >= getQuotaLimit(key))
      throw new AssistantError(
        '此功能今日额度已用完，可升级会员后继续',
        429,
        true,
      );
    if (!isVip) {
      const value = JSON.stringify({ used: used + 1, date });
      await tx.$executeRaw`UPDATE "UserQuota" SET "quotas"=jsonb_set("quotas",ARRAY[${key}],${value}::jsonb,true), "updatedAt"=CURRENT_TIMESTAMP WHERE "userId"=${user.id}`;
    }
    await tx.$executeRaw`UPDATE "AssistantRequest" SET "charged"=true,"feature"=${key} WHERE "id"=${id}`;
  });
}
export async function finishRequest(taskId: string, result: AssistantTurn) {
  await prisma.$transaction(async (tx) => {
    const changed =
      await tx.$executeRaw`UPDATE "AssistantRequest" SET "status"='complete',"result"=${JSON.stringify(result)}::jsonb WHERE "id"=${result.requestId} AND "taskId"=${taskId} AND "status"='running'`;
    if (changed !== 1)
      throw new AssistantError('请求已结束，未保存重复结果', 409);
    await tx.$executeRaw`UPDATE "AssistantTask" SET "turns"="turns" || ${JSON.stringify([result])}::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${taskId}`;
  });
}
export async function failRequest(id: string) {
  await prisma.$executeRaw`UPDATE "AssistantRequest" SET "status"='failed' WHERE "id"=${id} AND "status"='running'`;
}
