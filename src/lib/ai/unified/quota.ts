import { prisma } from '@/lib/prisma';
import { getQuotaLimit } from '@/lib/quota/membership-benefits';
import { quotaFeature, type AssistantTask } from './types';

export class AssistantError extends Error {
  constructor(
    message: string,
    public status = 400,
    public quotaExceeded = false,
  ) {
    super(message);
  }
}
export async function consumeAssistantQuota(
  owner: string,
  isVip: boolean,
  feature: AssistantTask['feature'],
) {
  if (isVip) return;
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
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const previous = row.quotas[key];
    const used = previous?.date === date ? previous.used : 0;
    if (used >= getQuotaLimit(key))
      throw new AssistantError(
        '此功能今日额度已用完，可升级会员后继续',
        429,
        true,
      );
    const value = JSON.stringify({ used: used + 1, date });
    await tx.$executeRaw`UPDATE "UserQuota" SET "quotas"=jsonb_set("quotas",ARRAY[${key}],${value}::jsonb,true), "updatedAt"=CURRENT_TIMESTAMP WHERE "userId"=${user.id}`;
  });
}
