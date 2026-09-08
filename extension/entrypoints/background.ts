import { buildFillPlan } from "../lib/mapping";
import { ExtensionAuthError, parseAuthCallback } from "../lib/auth";
import { getSiteAdapter } from "../lib/site-adapters";
import { createTelemetryQueue, type TelemetryName } from "../lib/telemetry-queue";
import { apiRequest } from "../lib/api-request";
import { runRepeaterEngine } from "../lib/repeater-engine";
import { collectPageSnapshot } from "../lib/page-scanner";
import { applyFillActions } from "../lib/fill-executor";
import { isDateCompletionPolicy, readDatePolicy, writeDatePolicy, type DateCompletionPolicy } from "../lib/date-policy";
import { matchingSession, pageSessionKey, samePage, type PageIdentity } from "../lib/page-session";
import { classifyActiveTab, type PageContext } from "../lib/page-context";
import type {
  ApplicationProfileEnvelope,
  FillAction,
  FillResult,
  PageSnapshot,
  RepeaterExecutionSummary,
  SiteAdapter,
} from "../lib/types";

const API_BASE = import.meta.env.WXT_API_BASE_URL || "https://aijianli.cn";
const TELEMETRY_ALARM = "extension-telemetry-retry";
const telemetry = createTelemetryQueue({
  storage: browser.storage.local,
  schedule: async () => {
    if (!await browser.alarms.get(TELEMETRY_ALARM)) await browser.alarms.create(TELEMETRY_ALARM, {periodInMinutes: 1});
  },
  send: async (token, event) => (await fetch(`${API_BASE}/next-api/extension/analytics`, {
    method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
    body: JSON.stringify(event), signal: AbortSignal.timeout(8_000),
  })).status,
});
async function trackExtensionEvent(eventName: TelemetryName, properties: Record<string, unknown> = {}): Promise<void> {
  try { await telemetry.enqueue(eventName, properties); void telemetry.flush(); } catch { /* Non-blocking telemetry. */ }
}

interface ExtensionMessage {
  type: string;
  applicationId?: string;
  page?: PageIdentity;
  datePolicy?: DateCompletionPolicy;
  rememberDatePolicy?: boolean;
  eventName?: TelemetryName;
  properties?: Record<string, unknown>;
}

const SILENT_RETRY_MS = 4_000;
let authInFlight: Promise<Record<string, unknown>> | null = null;
const pageVersions = new Map<number, number>();
const fillingTabs = new Set<number>();

export default defineBackground(() => {
  // WXT's browser wrapper may omit this newer method even when Chrome supports it.
  const nativeStorage = (globalThis as unknown as {chrome?: {storage?: {local?: {
    setAccessLevel?: (options: {accessLevel: "TRUSTED_CONTEXTS"}) => Promise<void>;
  }}}}).chrome?.storage?.local;
  void nativeStorage?.setAccessLevel?.({accessLevel: "TRUSTED_CONTEXTS"})?.catch(() => undefined);
  browser.alarms.onAlarm.addListener(alarm => { if (alarm.name === TELEMETRY_ALARM) void telemetry.flush(); });
  browser.runtime.onStartup.addListener(() => { void telemetry.flush(); });
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse) => {
      const senderPage = sender.tab?.id && sender.url ? { tabId: sender.tab.id, url: sender.url } : null;
      void handleMessage(message, senderPage)
        .then(sendResponse)
        .catch((error) =>
          sendResponse({
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    },
  );
  browser.tabs.onRemoved.addListener((tabId) => {
    pageVersions.set(tabId, (pageVersions.get(tabId) || 0) + 1);
    void browser.storage.session.remove(pageSessionKey(tabId));
  });
  browser.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === "loading" || change.url) {
      pageVersions.set(tabId, (pageVersions.get(tabId) || 0) + 1);
      void browser.storage.session.remove(pageSessionKey(tabId));
    }
  });
});

async function activePage(): Promise<PageIdentity | null> {
  return (await activePageContext()).page;
}
async function activePageContext(): Promise<PageContext> {
  try {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    return classifyActiveTab(tab);
  } catch { return { page: null, pageIssue: "page_unavailable" }; }
}
async function readPageSession(page: PageIdentity | null) {
  if (!page) return null;
  const key = pageSessionKey(page.tabId);
  return matchingSession((await browser.storage.session.get(key))[key], page);
}
async function handleMessage(message: ExtensionMessage, senderPage: PageIdentity | null): Promise<unknown> {
  if (message.type === "analytics-track" && !senderPage && message.eventName) {
    await trackExtensionEvent(message.eventName, message.properties);
    return {ok: true};
  }
  if (message.type === "initialize") {
    await browser.storage.session.remove("silentAuthLastAttemptAt");
    return getStatus(true);
  }
  if (message.type === "status") return getStatus(true);
  if (message.type === "accept-onboarding") return acceptOnboarding();
  if (message.type === "enable-auto-connect") return enableAutoConnect();
  if (message.type === "retry-silent-connect") return retrySilentConnect();
  if (message.type === "open-login") return openLogin();
  if (message.type === "connect") return connect(true);
  if (message.type === "disconnect") return disconnect();
  if (message.type === "set-date-policy") {
    if (!samePage(message.page, await activePage())) throw new Error("页面已切换，请重新设置日期偏好");
    await writeDatePolicy(browser.storage.local, message.page!.url, message.datePolicy);
    return { ok: true };
  }
  if (message.type === "fill") {
    if (!samePage(message.page, await activePage())) throw new Error("页面已切换，请在当前页面重新点击填写");
    const page = message.page!;
    if (fillingTabs.has(page.tabId)) throw new Error("此页面正在填写，请稍候");
    fillingTabs.add(page.tabId);
    try {
      if (message.datePolicy !== undefined && !isDateCompletionPolicy(message.datePolicy)) throw new Error("无效的日期补全选项");
      const policy = message.datePolicy ?? await readDatePolicy(browser.storage.local, page.url);
      if (message.rememberDatePolicy === true && message.datePolicy !== undefined) {
        await writeDatePolicy(browser.storage.local, page.url, policy);
      }
      return await fillCurrentPageWithAnalytics(page, policy);
    }
    finally { fillingTabs.delete(page.tabId); }
  }
  if (message.type === "mark-applied" && message.applicationId)
    return markApplied(message.applicationId, message.page);
  if (message.type === "submit-detected") {
    const session = await readPageSession(senderPage);
    if (session) await browser.storage.session.set({ [pageSessionKey(senderPage!.tabId)]: { ...session, submitDetected: true } });
    return { ok: true };
  }
  throw new Error("不支持的插件操作");
}

async function getStatus(
  trySilentConnection = false,
): Promise<Record<string, unknown>> {
  let local = await browser.storage.local.get([
    "accessToken",
    "expiresAt",
    "onboardingAccepted",
    "autoConnectEnabled",
  ]);
  let session = await browser.storage.session.get([
    "profileEnvelope",
    "draftApplication",
    "submitDetected",
    "authIssue",
    "silentAuthLastAttemptAt",
    "awaitingLoginUntil",
  ]);
  let connected =
    Boolean(local.accessToken) &&
    (!local.expiresAt || new Date(String(local.expiresAt)) > new Date());

  const onboardingAccepted = local.onboardingAccepted === true;
  const autoConnectEnabled = local.autoConnectEnabled === true;
  if (
    trySilentConnection &&
    onboardingAccepted &&
    autoConnectEnabled &&
    !connected
  ) {
    const now = Date.now();
    const lastAttempt = Number(session.silentAuthLastAttemptAt || 0);
    const awaitingLogin = Number(session.awaitingLoginUntil || 0) > now;
    const shouldAttempt =
      lastAttempt === 0 ||
      (awaitingLogin && now - lastAttempt >= SILENT_RETRY_MS);
    if (shouldAttempt) {
      try {
        await connect(false);
      } catch {
        // The status response below explains whether login is required.
      }
      local = await browser.storage.local.get([
        "accessToken",
        "expiresAt",
        "onboardingAccepted",
        "autoConnectEnabled",
      ]);
      session = await browser.storage.session.get([
        "profileEnvelope",
        "draftApplication",
        "submitDetected",
        "authIssue",
        "awaitingLoginUntil",
      ]);
      connected =
        Boolean(local.accessToken) &&
        (!local.expiresAt || new Date(String(local.expiresAt)) > new Date());
    }
  }

  const { page, pageIssue } = await activePageContext();
  const pageSession = await readPageSession(page);
  return {
    page,
    pageIssue,
    datePolicy: page && /^https?:/.test(page.url) ? await readDatePolicy(browser.storage.local, page.url) : "ask",
    connected,
    onboardingAccepted,
    autoConnectEnabled,
    connectionIssue: connected ? null : session.authIssue || null,
    awaitingLogin: Number(session.awaitingLoginUntil || 0) > Date.now(),
    hasProfile: Boolean(session.profileEnvelope),
    application: pageSession?.application || null,
    submitDetected: Boolean(pageSession?.submitDetected),
  };
}

async function acceptOnboarding(): Promise<Record<string, unknown>> {
  await browser.storage.local.set({
    onboardingAccepted: true,
    autoConnectEnabled: true,
  });
  await browser.storage.session.remove([
    "authIssue",
    "silentAuthLastAttemptAt",
  ]);
  try {
    await connect(false);
  } catch {
    // A missing website session is rendered as a login prompt, not an error.
  }
  void trackExtensionEvent("extension_onboarding_accept", {
    authMode: "silent",
  });
  return getStatus(false);
}

async function enableAutoConnect(): Promise<Record<string, unknown>> {
  await browser.storage.local.set({ autoConnectEnabled: true });
  return retrySilentConnect();
}

async function retrySilentConnect(): Promise<Record<string, unknown>> {
  await browser.storage.session.remove([
    "authIssue",
    "silentAuthLastAttemptAt",
  ]);
  try {
    await connect(false);
  } catch {
    // Return a useful state instead of surfacing a technical auth exception.
  }
  return getStatus(false);
}

async function openLogin(): Promise<Record<string, unknown>> {
  await browser.storage.session.set({
    authIssue: "login_required",
    silentAuthLastAttemptAt: 0,
    awaitingLoginUntil: Date.now() + 2 * 60 * 1000,
  });
  await browser.tabs.create({
    url: `${API_BASE}/login?redirect=${encodeURIComponent("/dashboard/application-profile")}`,
  });
  return getStatus(false);
}

async function connect(interactive: boolean): Promise<Record<string, unknown>> {
  if (authInFlight) return authInFlight;
  authInFlight = performConnection(interactive).finally(() => {
    authInFlight = null;
  });
  return authInFlight;
}

async function performConnection(
  interactive: boolean,
): Promise<Record<string, unknown>> {
  await browser.storage.session.set({ silentAuthLastAttemptAt: Date.now() });
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const state = base64Url(crypto.getRandomValues(new Uint8Array(24)));
  const redirectUri = browser.identity.getRedirectURL("oauth2");
  const authorizeUrl = new URL(
    interactive
      ? "/extension/authorize"
      : "/next-api/extension/silent-authorize",
    API_BASE,
  );
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  let code: string;
  try {
    const callbackRaw = await browser.identity.launchWebAuthFlow({
      url: authorizeUrl.toString(),
      interactive,
      ...(interactive
        ? {}
        : {
            abortOnLoadForNonInteractive: false,
            timeoutMsForNonInteractive: 8_000,
          }),
    });
    if (!callbackRaw) throw new Error("未完成智简简历授权");
    code = parseAuthCallback(callbackRaw, state);
  } catch (error) {
    const issue =
      error instanceof ExtensionAuthError ? error.code : "server_error";
    await browser.storage.session.set({ authIssue: issue });
    throw error;
  }
  const response = await apiRequest(`${API_BASE}/next-api/extension/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      codeVerifier: verifier,
      redirectUri,
      deviceName: `${navigator.userAgent.includes("Edg/") ? "Edge" : "Chrome"} 扩展`,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "插件授权失败");
  await browser.storage.local.set({
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
    onboardingAccepted: true,
    autoConnectEnabled: true,
  });
  await browser.storage.session.remove([
    "authIssue",
    "awaitingLoginUntil",
    "silentAuthLastAttemptAt",
  ]);
  await loadProfile(true);
  void trackExtensionEvent("extension_connect_success", {
    authMode: interactive ? "interactive" : "silent",
  });
  return { connected: true, hasProfile: true };
}

async function disconnect(): Promise<{ connected: false }> {
  void trackExtensionEvent("extension_disconnect");
  await browser.storage.local.set({ autoConnectEnabled: false });
  await clearConnectionState();
  return { connected: false };
}

async function clearConnectionState(): Promise<void> {
  await telemetry.clear();
  await browser.storage.local.remove(["accessToken", "expiresAt"]);
  await browser.storage.session.clear();
}

async function loadProfile(force = false): Promise<ApplicationProfileEnvelope> {
  let [{ accessToken }, cached] = await Promise.all([
    browser.storage.local.get("accessToken"),
    browser.storage.session.get(["profileEnvelope", "profileEtag"]),
  ]);
  if (!accessToken) {
    await connect(false);
    [{ accessToken }, cached] = await Promise.all([
      browser.storage.local.get("accessToken"),
      browser.storage.session.get(["profileEnvelope", "profileEtag"]),
    ]);
  }
  if (!accessToken) throw new Error("请先登录智简简历");
  if (!force && cached.profileEnvelope) {
    void refreshProfile(
      String(accessToken),
      cached.profileEtag as string | undefined,
    ).catch(() => undefined);
    return cached.profileEnvelope as ApplicationProfileEnvelope;
  }
  return refreshProfile(
    String(accessToken),
    force ? undefined : (cached.profileEtag as string | undefined),
  );
}

async function refreshProfile(
  token: string,
  etag?: string,
): Promise<ApplicationProfileEnvelope> {
  const response = await apiRequest(`${API_BASE}/next-api/extension/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(etag ? { "If-None-Match": etag } : {}),
    },
  });
  if (response.status === 304) {
    const cached = await browser.storage.session.get("profileEnvelope");
    return cached.profileEnvelope as ApplicationProfileEnvelope;
  }
  if (response.status === 401) {
    await clearConnectionState();
    await browser.storage.session.set({ authIssue: "login_required" });
    throw new Error("登录状态已过期，请重新登录智简简历");
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "读取网申资料失败");
  const envelope = payload as ApplicationProfileEnvelope;
  await browser.storage.session.set({
    profileEnvelope: envelope,
    profileEtag: response.headers.get("etag") || "",
  });
  return envelope;
}

async function fillCurrentPage(page: PageIdentity, datePolicy: DateCompletionPolicy): Promise<FillResult> {
  const version = pageVersions.get(page.tabId) || 0;
  const assertUnchanged = async () => {
    const current = await browser.tabs.get(page.tabId);
    if (current.url !== page.url || (pageVersions.get(page.tabId) || 0) !== version)
      throw new Error("页面已变化，本次填写已停止，请重新点击填写");
  };
  // A user-triggered fill must use the latest profile. Returning the session
  // cache here can miss newly synced repeatable rows such as work experience.
  const profile = await loadProfile(true);
  const tab = await browser.tabs.get(page.tabId);
  if (tab.url !== page.url) throw new Error("页面已变化，请重新填写");
  if (!tab?.id) throw new Error("没有找到当前活动标签页，请重新打开招聘页面");
  if (!tab.url)
    throw new Error("未获得当前网站访问权限，请点击一键填写并允许 Chrome 授权");
  if (!/^https?:/.test(tab.url)) throw new Error("请在招聘申请页面使用插件");
  const siteAdapter = getSiteAdapter(new URL(tab.url).hostname);
  let repeaterSummary: RepeaterExecutionSummary | undefined;
  let snapshotResult;
  try {
    snapshotResult = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageSnapshot,
      args: [siteAdapter],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/permission|cannot access|not allowed|host/i.test(message)) {
      throw new Error(
        "Chrome 尚未允许插件访问当前网站，请重新点击一键填写并允许访问权限",
      );
    }
    throw new Error(`无法扫描当前页面：${message}`);
  }
  let snapshot = snapshotResult[0]?.result as PageSnapshot | undefined;
  if (!snapshot) throw new Error("无法读取当前页面表单");
  const repeaters = siteAdapter?.repeaters?.length
    ? siteAdapter.repeaters
    : snapshot.repeaters || [];
  if (repeaters.length) {
    const desiredCounts = Object.fromEntries(
      repeaters.map((rule) => {
        const rows = profile.profile[rule.profilePath];
        return [rule.profilePath, Array.isArray(rows) ? rows.length : 0];
      }),
    );
    await assertUnchanged();
    const preparation = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: runRepeaterEngine,
      args: [repeaters, desiredCounts],
    });
    repeaterSummary = preparation[0]?.result;
    const refreshed = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageSnapshot,
      args: [siteAdapter],
    });
    snapshot = refreshed[0]?.result as PageSnapshot | undefined;
    if (!snapshot) throw new Error("新增经历后无法读取表单");
  }
  const plan = buildFillPlan(profile.profile, snapshot.fields);
  await assertUnchanged();
  const fillResult = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: applyFillActions,
    args: [plan.actions, { allowMonthStart: datePolicy === "first-day" }],
  });
  const summary = fillResult[0]?.result as {
    filled: number;
    alreadyFilled: number;
    failedCount: number;
    failed: string[];
    controlMetrics?: Record<string, number>;
  };
  const result: FillResult = {
    controlMetrics: summary?.controlMetrics,
    filled: summary?.filled || 0,
    skipped: (summary?.alreadyFilled || 0) + (summary?.failedCount || 0),
    failedCount: summary?.failedCount || 0,
    missingProfileCount: plan.missingProfileCount,
    unmatchedCount: plan.unmatchedCount,
    alreadyFilled: summary?.alreadyFilled || 0,
    failed: summary?.failed || [],
    missingProfile: plan.missingProfile,
    unmatched: plan.unmatched,
    job: snapshot.job,
    profileExperienceCount: Array.isArray(profile.profile.experiences)
      ? profile.profile.experiences.length
      : 0,
    pageExperienceCount: repeaterSummary?.diagnostics.find(
      (item) => item.profilePath === "experiences",
    )?.current,
    addedExperienceRows: repeaterSummary?.diagnostics.find(
      (item) => item.profilePath === "experiences",
    )?.added,
    repeaterDiagnostics: repeaterSummary?.diagnostics,
    detectedFieldCount: snapshot.fields.length,
    contextualFieldCount: snapshot.fields.filter(
      (field) =>
        field.labelSource === "nearby" || field.labelSource === "label",
    ).length,
  };
  if (result.filled + result.alreadyFilled > 0) {
    await assertUnchanged();
    try {
    const application = await createDraft(
      snapshot.job,
      profile.defaultResumeId,
    );
    result.applicationId = String(application.id);
    await assertUnchanged();
    await browser.storage.session.set({
      [pageSessionKey(tab.id)]: { page, application, submitDetected: false },
    });
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: attachSubmitMonitor,
    });
    } catch {
      await assertUnchanged();
      result.recordingError = "网页填写结果已保留，但投递记录同步未完成。请稍后重试，或到投递管理中核对记录。";
    }
  }
  return result;
}

async function fillCurrentPageWithAnalytics(page: PageIdentity, datePolicy: DateCompletionPolicy): Promise<FillResult> {
  const startedAt = Date.now();
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const sourceDomain = getSourceDomain(tab?.url);
  const adapterId = sourceDomain
    ? getSiteAdapter(sourceDomain)?.id || "generic"
    : "unknown";
  void trackExtensionEvent("extension_fill_start", {
    engineVersion: "openjob-context-v4",
    extensionVersion: browser.runtime.getManifest().version,
    sourceDomain,
    adapterId,
    supportedSite: adapterId !== "generic" && adapterId !== "unknown",
  });
  try {
    const result = await fillCurrentPage(page, datePolicy);
    const experienceRepeater = result.repeaterDiagnostics?.find(
      (item) => item.profilePath === "experiences",
    );
    const repeaterIncomplete = result.repeaterDiagnostics?.some((item) =>
      ["partial", "button_not_found", "button_unresponsive"].includes(
        item.status,
      ),
    );
    const compatibilityIncomplete =
      !!result.recordingError ||
      repeaterIncomplete ||
      result.failed.length > 0 ||
      result.unmatched.length > 0 ||
      result.missingProfile.length > 0 ||
      !result.detectedFieldCount ||
      result.filled + result.alreadyFilled === 0;
    const fillStatus = compatibilityIncomplete ? "partial" : "success";
    const fillProperties = {
      dateCompletionPolicy: datePolicy,
      engineVersion: "openjob-context-v4",
      recordingFailed: !!result.recordingError,
      extensionVersion: browser.runtime.getManifest().version,
      detectedFieldCount: result.detectedFieldCount,
      contextualFieldCount: result.contextualFieldCount,
      status: fillStatus,
      sourceDomain: result.job?.sourceDomain || sourceDomain,
      adapterId,
      durationMs: Date.now() - startedAt,
      filledCount: result.filled,
      alreadyFilledCount: result.alreadyFilled,
      failedCount: result.failedCount,
      missingProfileCount: result.missingProfileCount,
      unmatchedCount: result.unmatchedCount,
      ...result.controlMetrics,
      repeaterStatus: experienceRepeater?.status,
      repeaterFailureReason: experienceRepeater?.failureReason,
      repeaterDesiredCount: experienceRepeater?.desired,
      repeaterInitialCount: experienceRepeater?.initial,
      repeaterFinalCount: experienceRepeater?.current,
      repeaterAddedCount: experienceRepeater?.added,
      repeaterAttempts: experienceRepeater?.attempts,
      repeaterRuleCount: result.repeaterDiagnostics?.length || 0,
      repeaterFailureCount:
        result.repeaterDiagnostics?.filter((item) => item.failureReason)
          .length || 0,
      repeaterAddedTotal:
        result.repeaterDiagnostics?.reduce(
          (total, item) => total + item.added,
          0,
        ) || 0,
    } as const;
    await trackExtensionEvent("extension_fill_result", fillProperties);
    await trackExtensionEvent(
      compatibilityIncomplete
        ? "extension_fill_partial"
        : "extension_fill_complete",
      fillProperties,
    );
    return result;
  } catch (error) {
    await trackExtensionEvent("extension_fill_result", {
      engineVersion: "openjob-context-v4",
      extensionVersion: browser.runtime.getManifest().version,
      status: "failed",
      sourceDomain,
      adapterId,
      durationMs: Date.now() - startedAt,
    });
    void trackExtensionEvent("extension_fill_failed", {
      status: "failed",
      sourceDomain,
      adapterId,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

async function createDraft(
  job: PageSnapshot["job"],
  resumeId: string | null,
): Promise<Record<string, unknown>> {
  const { accessToken } = await browser.storage.local.get("accessToken");
  const response = await apiRequest(`${API_BASE}/next-api/extension/applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...job, resumeId }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "创建投递记录失败");
  void trackExtensionEvent("extension_application_created", {
    sourceDomain: job.sourceDomain,
    status: "DRAFT",
  });
  return payload.application;
}

async function markApplied(
  applicationId: string,
  page?: PageIdentity,
): Promise<Record<string, unknown>> {
  const current = await activePage();
  const session = await readPageSession(current);
  if (!samePage(page, current) || session?.application?.id !== applicationId)
    throw new Error("页面或投递记录已变化，请在对应页面重新确认");
  const { accessToken } = await browser.storage.local.get("accessToken");
  const response = await apiRequest(
    `${API_BASE}/next-api/extension/applications/${applicationId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "APPLIED" }),
    },
  );
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "更新投递状态失败");
  await browser.storage.session.set({
    [pageSessionKey(current!.tabId)]: { ...session, application: payload, submitDetected: false },
  });
  void trackExtensionEvent("extension_mark_applied", { status: "APPLIED" });
  return payload;
}

function getSourceDomain(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.hostname : "";
  } catch {
    return "";
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function attachSubmitMonitor(): void {
  if (document.documentElement.dataset.aijianliSubmitMonitor === "true") return;
  document.documentElement.dataset.aijianliSubmitMonitor = "true";
  const runtime = (
    globalThis as unknown as {
      chrome: { runtime: { sendMessage(message: unknown): Promise<unknown> } };
    }
  ).chrome.runtime;
  const notify = (): void => {
    void runtime.sendMessage({ type: "submit-detected" });
  };
  document.addEventListener(
    "click",
    (event) => {
      const target = (event.target as HTMLElement | null)?.closest(
        'button, input[type="submit"], [role="button"]',
      ) as HTMLElement | null;
      const text = `${target?.textContent || ""} ${(target as HTMLInputElement | null)?.value || ""}`;
      if (target && /提交|投递|申请|submit|apply/i.test(text))
        setTimeout(notify, 800);
    },
    true,
  );
  const observer = new MutationObserver(() => {
    if (
      /投递成功|申请成功|提交成功|application submitted|thank you for applying/i.test(
        document.body.innerText.slice(-20_000),
      )
    )
      notify();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
