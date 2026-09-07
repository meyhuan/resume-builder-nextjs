import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { requireExtensionUser } from "@/features/extension-auth/server";
import { prisma } from "@/lib/prisma";
import { trackServerAnalyticsEvent } from "@/lib/server-analytics";
import { extensionEventSchema } from "@/features/extension-analytics/schema";

export async function POST(request: Request) {
  try {
    const authorization = await requireExtensionUser(request, "application-profile:read");
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16_384) return NextResponse.json({ error: "事件过大" }, { status: 413 });
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "事件格式错误" }, { status: 400 }); }
    const parsed = extensionEventSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "不支持的插件事件" }, { status: 400 });
    const event = parsed.data;
    const now = new Date();
    const occurredAt = event.occurredAt ? new Date(event.occurredAt) : now;
    if (occurredAt.getTime() > now.getTime() + 300_000 || occurredAt.getTime() < now.getTime() - 7 * 86400_000) {
      return NextResponse.json({ error: "事件时间超出范围" }, { status: 400 });
    }
    const id = `${authorization.userId}:${event.eventId || randomUUID()}`;
    const inserted = await prisma.extensionTelemetryEvent.createMany({ data: [{
      id, userId: authorization.userId, eventName: event.eventName,
      occurredAt, properties: event.properties,
    }], skipDuplicates: true });
    // Java forwarding is secondary; the dedicated fill report reads the durable receipt.
    if (inserted.count > 0 && process.env.EXTENSION_TELEMETRY_FORWARD_ENABLED !== "false") after(async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: authorization.userId }, select: { wxId: true, javaUserId: true } });
        const userId = [user?.wxId, user?.javaUserId].map(Number).find(value => Number.isFinite(value) && value > 0);
        await trackServerAnalyticsEvent({ eventName: event.eventName, userId,
          platform: "backend", page: "extension/sidepanel", source: "browser_extension", entry: "browser_extension",
          properties: { clientType: "browser_extension", ...event.properties },
        });
      } catch { console.warn("[extension/analytics] secondary forwarding failed"); }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "EXTENSION_UNAUTHORIZED") {
      return NextResponse.json({ error: "插件授权已失效" }, { status: 401 });
    }
    console.warn("[extension/analytics] receipt unavailable");
    return NextResponse.json({ error: "统计暂不可用，请稍后重试" }, { status: 503 });
  }
}
