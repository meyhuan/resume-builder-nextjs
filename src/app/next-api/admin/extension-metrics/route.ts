import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeFillEvents } from "@/features/extension-analytics/report";

export async function POST(request:Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 4096) return NextResponse.json({error:"请求内容过大"},{status:413});
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_BODY");
    body = parsed as Record<string, unknown>;
  } catch { return NextResponse.json({error:"无效的统计请求"},{status:400}); }
  const expected=process.env.ADMIN_PASSWORD || "";
  const password=typeof body.adminPassword === "string" ? body.adminPassword : "";
  if (!expected || Buffer.byteLength(password)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(password),Buffer.from(expected))) {
    return NextResponse.json({error:"管理员验证失败"},{status:403});
  }
  const days=body.days ?? 7;
  if (typeof days !== "number" || !Number.isInteger(days) || days<1 || days>90) return NextResponse.json({error:"统计范围为1至90天"},{status:400});
  const since=new Date(Date.now()-days*86400_000);
  try {
    const where={eventName:"extension_fill_result",occurredAt:{gte:since}};
    const [events,total]=await Promise.all([
      prisma.extensionTelemetryEvent.findMany({where,select:{properties:true},orderBy:{occurredAt:"desc"},take:10000}),
      prisma.extensionTelemetryEvent.count({where}),
    ]);
    return NextResponse.json({rows:summarizeFillEvents(events),total,sampled:events.length,since:since.toISOString(),truncated:total>events.length},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"读取统计失败，请检查数据库连接和迁移状态"},{status:503}); }
}
