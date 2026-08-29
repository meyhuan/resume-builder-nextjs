import { buildFillActions } from "../lib/mapping";
import { ExtensionAuthError, parseAuthCallback } from "../lib/auth";
import { getSiteAdapter } from "../lib/site-adapters";
import type {
  ApplicationProfileEnvelope,
  FillAction,
  FillResult,
  PageSnapshot,
  SiteAdapter,
} from "../lib/types";

const API_BASE = import.meta.env.WXT_API_BASE_URL || "https://aijianli.cn";

interface ExtensionMessage {
  type: string;
  applicationId?: string;
}

const SILENT_RETRY_MS = 4_000;
let authInFlight: Promise<Record<string, unknown>> | null = null;

export default defineBackground(() => {
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      void handleMessage(message)
        .then(sendResponse)
        .catch((error) =>
          sendResponse({
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    },
  );
});

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
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
  if (message.type === "fill") return fillCurrentPage();
  if (message.type === "mark-applied" && message.applicationId)
    return markApplied(message.applicationId);
  if (message.type === "submit-detected") {
    await browser.storage.session.set({ submitDetected: true });
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

  return {
    connected,
    onboardingAccepted,
    autoConnectEnabled,
    connectionIssue: connected ? null : session.authIssue || null,
    awaitingLogin: Number(session.awaitingLoginUntil || 0) > Date.now(),
    hasProfile: Boolean(session.profileEnvelope),
    application: session.draftApplication || null,
    submitDetected: Boolean(session.submitDetected),
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
  const response = await fetch(`${API_BASE}/next-api/extension/token`, {
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
  return { connected: true, hasProfile: true };
}

async function disconnect(): Promise<{ connected: false }> {
  await browser.storage.local.set({ autoConnectEnabled: false });
  await clearConnectionState();
  return { connected: false };
}

async function clearConnectionState(): Promise<void> {
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
    cached.profileEtag as string | undefined,
  );
}

async function refreshProfile(
  token: string,
  etag?: string,
): Promise<ApplicationProfileEnvelope> {
  const response = await fetch(`${API_BASE}/next-api/extension/profile`, {
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

async function fillCurrentPage(): Promise<FillResult> {
  const profile = await loadProfile();
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) throw new Error("没有找到当前活动标签页，请重新打开招聘页面");
  if (!tab.url)
    throw new Error("未获得当前网站访问权限，请点击一键填写并允许 Chrome 授权");
  if (!/^https?:/.test(tab.url)) throw new Error("请在招聘申请页面使用插件");
  const siteAdapter = getSiteAdapter(new URL(tab.url).hostname);
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
  const snapshot = snapshotResult[0]?.result as PageSnapshot | undefined;
  if (!snapshot) throw new Error("无法读取当前页面表单");
  const actions = buildFillActions(profile.profile, snapshot.fields);
  const fillResult = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: applyFillActions,
    args: [actions],
  });
  const summary = fillResult[0]?.result as { filled: number; skipped: number };
  const result: FillResult = {
    filled: summary?.filled || 0,
    skipped: summary?.skipped || 0,
    unmatched: snapshot.fields
      .filter(
        (field) => !actions.some((action) => action.fieldId === field.fieldId),
      )
      .map((field) => field.context)
      .filter(Boolean)
      .slice(0, 20),
    job: snapshot.job,
  };
  if (result.filled > 0) {
    const application = await createDraft(
      snapshot.job,
      profile.defaultResumeId,
    );
    result.applicationId = String(application.id);
    await browser.storage.session.set({
      draftApplication: application,
      submitDetected: false,
    });
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: attachSubmitMonitor,
    });
  }
  return result;
}

async function createDraft(
  job: PageSnapshot["job"],
  resumeId: string | null,
): Promise<Record<string, unknown>> {
  const { accessToken } = await browser.storage.local.get("accessToken");
  const response = await fetch(`${API_BASE}/next-api/extension/applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...job, resumeId }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "创建投递记录失败");
  return payload.application;
}

async function markApplied(
  applicationId: string,
): Promise<Record<string, unknown>> {
  const { accessToken } = await browser.storage.local.get("accessToken");
  const response = await fetch(
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
    draftApplication: payload,
    submitDetected: false,
  });
  return payload;
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

function collectPageSnapshot(adapter: SiteAdapter | null): PageSnapshot {
  const blocked =
    /password|密码|验证码|captcha|银行卡|bank card|协议|同意条款|csrf|token|tracking/i;
  const controls = [
    ...document.querySelectorAll<HTMLElement>(
      'input, textarea, select, [contenteditable="true"]',
    ),
  ];
  const fields = controls.flatMap((element, index) => {
    const input = element as HTMLInputElement;
    const type = (input.type || "").toLowerCase();
    if (adapter?.rootSelector && !element.closest(adapter.rootSelector))
      return [];
    if (adapter?.ignoreSelectors.some((selector) => element.matches(selector)))
      return [];
    if (
      [
        "hidden",
        "password",
        "file",
        "submit",
        "reset",
        "button",
        "image",
      ].includes(type)
    )
      return [];
    if (
      input.disabled ||
      input.readOnly ||
      element.getAttribute("aria-hidden") === "true"
    )
      return [];
    if (
      element.offsetParent === null &&
      getComputedStyle(element).position !== "fixed"
    )
      return [];
    const fieldId = `aijianli-${Date.now()}-${index}`;
    element.setAttribute("data-aijianli-field-id", fieldId);
    const explicitLabel = input.id
      ? document.querySelector<HTMLLabelElement>(
          `label[for="${CSS.escape(input.id)}"]`,
        )?.innerText
      : "";
    const wrappingLabel = element.closest("label")?.innerText || "";
    const group = element.closest('[role="group"], fieldset, tr');
    const groupLabel =
      group?.querySelector('legend, th, [class*="label"]')?.textContent || "";
    const optionText =
      type === "radio" || type === "checkbox"
        ? wrappingLabel || element.parentElement?.textContent || ""
        : "";
    const adapterContext =
      adapter?.contextRules.find((rule) => element.matches(rule.selector))
        ?.context || "";
    const contextParts = adapterContext
      ? [adapterContext]
      : [
          explicitLabel,
          wrappingLabel,
          input.getAttribute("aria-label"),
          input.placeholder,
          input.name,
          input.id,
          groupLabel,
        ];
    const context = contextParts
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (!context || blocked.test(context)) return [];
    return [
      {
        fieldId,
        tag: element.tagName.toLowerCase(),
        type,
        context,
        optionText: optionText.trim().slice(0, 200),
        options:
          element instanceof HTMLSelectElement
            ? [...element.options].map((option) => option.text.trim())
            : [],
      },
    ];
  });

  let structured: Record<string, unknown> = {};
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    try {
      const value = JSON.parse(script.textContent || "{}");
      const candidates = Array.isArray(value)
        ? value
        : value["@graph"] || [value];
      const job = candidates.find(
        (item: Record<string, unknown>) => item?.["@type"] === "JobPosting",
      );
      if (job) {
        structured = job;
        break;
      }
    } catch {
      /* ignore invalid publisher JSON-LD */
    }
  }
  const organization = structured.hiringOrganization as
    | Record<string, unknown>
    | undefined;
  const address = (
    structured.jobLocation as Record<string, unknown> | undefined
  )?.address as Record<string, unknown> | undefined;
  const companyName = String(
    organization?.name ||
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") ||
      location.hostname.replace(/^www\./, ""),
  );
  const jobTitle = String(
    structured.title ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title ||
      "未识别职位",
  ).slice(0, 300);
  return {
    fields,
    job: {
      companyName: companyName.slice(0, 300),
      jobTitle,
      location: String(address?.addressLocality || "").slice(0, 300),
      jobUrl: location.href,
      applicationUrl: location.href,
      sourceDomain: location.hostname,
    },
  };
}

function applyFillActions(actions: FillAction[]): {
  filled: number;
  skipped: number;
} {
  let filled = 0;
  let skipped = 0;
  const normalize = (value: string): string =>
    value.toLowerCase().replace(/[\s:：*＊()（）_\-/]/g, "");
  for (const action of actions) {
    const element = document.querySelector<HTMLElement>(
      `[data-aijianli-field-id="${action.fieldId}"]`,
    );
    if (!element) {
      skipped++;
      continue;
    }
    const input = element as HTMLInputElement;
    if (
      input.value?.trim() ||
      (input.type === "checkbox" && input.checked) ||
      (input.type === "radio" && input.checked)
    ) {
      skipped++;
      continue;
    }
    if (element instanceof HTMLSelectElement) {
      const option = [...element.options].find(
        (candidate) =>
          normalize(candidate.text) === normalize(action.value) ||
          normalize(candidate.text).includes(normalize(action.value)),
      );
      if (!option) {
        skipped++;
        continue;
      }
      element.value = option.value;
    } else if (input.type === "checkbox" || input.type === "radio") {
      input.click();
    } else if (element.isContentEditable) {
      element.textContent = action.value;
    } else {
      const value =
        input.type === "date"
          ? action.value
              .replace(/[./年]/g, "-")
              .replace(/月/g, "-")
              .replace(/日/g, "")
              .slice(0, 10)
          : action.value;
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
        element,
        value,
      );
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    element.setAttribute("data-aijianli-filled", "true");
    filled++;
  }
  return { filled, skipped };
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
