export type ExtensionAnalyticsEventName =
  | "extension_sidepanel_open"
  | "extension_onboarding_accept"
  | "extension_connect_success"
  | "extension_disconnect"
  | "extension_fill_start"
  | "extension_fill_result"
  | "extension_permission_denied"
  | "extension_application_created"
  | "extension_mark_applied";

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const API_BASE = import.meta.env.WXT_API_BASE_URL || "https://aijianli.cn";
const ANONYMOUS_ID_KEY = "analyticsAnonymousId";
const SESSION_ID_KEY = "analyticsSessionId";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function getAnalyticsContext(): Promise<{
  accessToken: string;
  anonymousId: string;
  sessionId: string;
} | null> {
  const [local, session] = await Promise.all([
    browser.storage.local.get(["accessToken", ANONYMOUS_ID_KEY]),
    browser.storage.session.get(SESSION_ID_KEY),
  ]);
  if (!local.accessToken) return null;
  const anonymousId = String(local[ANONYMOUS_ID_KEY] || createId("ext_anon"));
  const sessionId = String(session[SESSION_ID_KEY] || createId("ext_sess"));
  await Promise.all([
    local[ANONYMOUS_ID_KEY]
      ? Promise.resolve()
      : browser.storage.local.set({ [ANONYMOUS_ID_KEY]: anonymousId }),
    session[SESSION_ID_KEY]
      ? Promise.resolve()
      : browser.storage.session.set({ [SESSION_ID_KEY]: sessionId }),
  ]);
  return { accessToken: String(local.accessToken), anonymousId, sessionId };
}

export async function trackExtensionEvent(
  eventName: ExtensionAnalyticsEventName,
  properties: AnalyticsProperties = {},
): Promise<void> {
  try {
    const context = await getAnalyticsContext();
    if (!context) return;
    await fetch(`${API_BASE}/next-api/extension/analytics`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName,
        anonymousId: context.anonymousId,
        sessionId: context.sessionId,
        properties,
      }),
    });
  } catch {
    // Analytics must never interrupt authorization or form filling.
  }
}
