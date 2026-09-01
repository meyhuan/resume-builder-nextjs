import { NextResponse } from "next/server";
import { requireExtensionUser } from "@/features/extension-auth/server";
import { prisma } from "@/lib/prisma";
import { trackServerAnalyticsEvent } from "@/lib/server-analytics";

const EVENT_NAMES = new Set([
  "extension_sidepanel_open",
  "extension_onboarding_accept",
  "extension_connect_success",
  "extension_disconnect",
  "extension_fill_start",
  "extension_fill_result",
  "extension_fill_complete",
  "extension_fill_partial",
  "extension_fill_failed",
  "extension_permission_denied",
  "extension_application_created",
  "extension_mark_applied",
]);

const PROPERTY_KEYS = new Set([
  "adapterId",
  "alreadyFilledCount",
  "authMode",
  "durationMs",
  "failedCount",
  "fieldCount",
  "filledCount",
  "missingProfileCount",
  "permission",
  "repeaterAddedCount",
  "repeaterAddedTotal",
  "repeaterAttempts",
  "repeaterDesiredCount",
  "repeaterFailureReason",
  "repeaterFailureCount",
  "repeaterFinalCount",
  "repeaterInitialCount",
  "repeaterStatus",
  "repeaterRuleCount",
  "sourceDomain",
  "status",
  "supportedSite",
  "unmatchedCount",
]);

type Scalar = string | number | boolean | null;

function sanitizeProperties(value: unknown): Record<string, Scalar> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sanitized: Record<string, Scalar> = {};
  for (const [key, property] of Object.entries(value)) {
    if (!PROPERTY_KEYS.has(key)) continue;
    if (
      typeof property === "string" ||
      typeof property === "number" ||
      typeof property === "boolean" ||
      property === null
    ) {
      sanitized[key] =
        typeof property === "string" ? property.slice(0, 120) : property;
    }
  }
  return sanitized;
}

function numericUserId(...values: Array<string | null | undefined>): number | undefined {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    const authorization = await requireExtensionUser(
      request,
      "application-profile:read",
    );
    const body = (await request.json()) as Record<string, unknown>;
    const eventName = typeof body.eventName === "string" ? body.eventName : "";
    if (!EVENT_NAMES.has(eventName)) {
      return NextResponse.json({ error: "不支持的插件埋点事件" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authorization.userId },
      select: { wxId: true, javaUserId: true },
    });
    await trackServerAnalyticsEvent({
      eventName,
      userId: numericUserId(user?.wxId, user?.javaUserId),
      anonymousId:
        typeof body.anonymousId === "string"
          ? body.anonymousId.slice(0, 120)
          : undefined,
      sessionId:
        typeof body.sessionId === "string"
          ? body.sessionId.slice(0, 120)
          : undefined,
      platform: "backend",
      page: "extension/sidepanel",
      source: "browser_extension",
      entry: "browser_extension",
      properties: {
        clientType: "browser_extension",
        ...sanitizeProperties(body.properties),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "EXTENSION_UNAUTHORIZED") {
      return NextResponse.json({ error: "插件授权已失效" }, { status: 401 });
    }
    console.error("[extension/analytics]", error);
    return NextResponse.json({ error: "记录插件事件失败" }, { status: 500 });
  }
}
