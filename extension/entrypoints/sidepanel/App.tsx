import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { FillResult } from "../../lib/types";
import { trackExtensionEvent } from "../../lib/analytics";
import { samePage, type PageIdentity } from "../../lib/page-session";
import type { DateCompletionPolicy } from "../../lib/date-policy";
import { PAGE_ISSUE_MESSAGES, type PageIssue } from "../../lib/page-context";

interface Status {
  page?: PageIdentity | null;
  pageIssue?: PageIssue | null;
  datePolicy?: DateCompletionPolicy;
  connected: boolean;
  onboardingAccepted: boolean;
  autoConnectEnabled: boolean;
  connectionIssue: "login_required" | "server_error" | null;
  awaitingLogin: boolean;
  hasProfile: boolean;
  submitDetected: boolean;
  application: {
    id: string;
    companyName: string;
    jobTitle: string;
    status: string;
  } | null;
}

const WEBSITE = import.meta.env.WXT_API_BASE_URL || "https://aijianli.cn";

export default function App() {
  const [status, setStatus] = useState<Status>({
    connected: false,
    onboardingAccepted: false,
    autoConnectEnabled: false,
    connectionIssue: null,
    awaitingLogin: false,
    hasProfile: false,
    submitDetected: false,
    application: null,
  });
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [checkingPage, setCheckingPage] = useState(false);
  const checkingPageRef = useRef(false);
  const [result, setResult] = useState<FillResult | null>(null);
  const [rememberDates, setRememberDates] = useState(false);
  const [datePromptDismissed, setDatePromptDismissed] = useState(false);
  const openTracked = useRef(false);
  const pageRef = useRef<PageIdentity | null>(null);
  const epoch = useRef(0);
  const refreshSequence = useRef(0);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async (initialize = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    const sequence = ++refreshSequence.current;
    const requestEpoch = epoch.current;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        browser.runtime.sendMessage({ type: initialize ? "initialize" : "status" }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("status_timeout")), 12000); }),
      ]);
      if (sequence !== refreshSequence.current || requestEpoch !== epoch.current) return;
      if (!response || response.error) throw new Error("status_unavailable");
      setStatusError("");
      if ((pageRef.current || response.page) && !samePage(pageRef.current, response.page)) {
        pageRef.current = response.page || null;
        epoch.current++;
        setResult(null);
        setDatePromptDismissed(false);
        setRememberDates(false);
        setError("");
        setBusy(false);
      }
      setStatus(response as Status);
    } catch {
      if (sequence === refreshSequence.current && requestEpoch === epoch.current) {
        setStatusError("插件状态检测失败，请重新检测；如果仍失败，请关闭侧栏后重新打开插件。");
      }
    } finally {
      clearTimeout(timeout);
      refreshInFlight.current = false;
      setInitialized(true);
    }
  }, []);

  async function recoverPage(requestAccess: boolean) {
    if (checkingPageRef.current) return;
    checkingPageRef.current = true;
    setCheckingPage(true);
    setError("");
    try {
      // Keep this request directly in the click gesture, before any awaited status call.
      if (requestAccess) {
        const granted = await browser.permissions.request({ origins: ["https://*/*", "http://*/*"] });
        if (!granted) {
          void trackExtensionEvent("extension_permission_denied", { permission: "host_access" });
          throw new Error("未获得网页访问权限，尚未填写任何内容。你可以再次点击“授权并重新检测”，或在招聘页面点击浏览器工具栏中的插件图标后重新检测。");
        }
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法申请网页访问权限，请重新打开插件后重试。");
    } finally {
      checkingPageRef.current = false;
      setCheckingPage(false);
    }
  }

  useEffect(() => {
    void refresh(true);
    const invalidate = () => {
      epoch.current++;
      pageRef.current = null;
      setResult(null);
      setDatePromptDismissed(false);
      setRememberDates(false);
      setError("");
      setBusy(false);
      setStatus((previous) => ({ ...previous, page: null, application: null, submitDetected: false }));
      void refresh();
    };
    const updated = (id: number, change: { url?: string; status?: string }) => {
      if (id === pageRef.current?.tabId && (change.url || change.status === "loading")) invalidate();
    };
    browser.tabs.onActivated.addListener(invalidate);
    browser.tabs.onUpdated.addListener(updated);
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => {
      window.clearInterval(timer);
      browser.tabs.onActivated.removeListener(invalidate);
      browser.tabs.onUpdated.removeListener(updated);
    };
  }, [refresh]);

  useEffect(() => {
    if (!status.connected || openTracked.current) return;
    openTracked.current = true;
    void trackExtensionEvent("extension_sidepanel_open");
  }, [status.connected]);

  async function action(
    type: string,
    extra: Record<string, unknown> = {},
  ): Promise<unknown> {
    const requestEpoch = epoch.current;
    setBusy(true);
    setError("");
    try {
      const response = await browser.runtime.sendMessage({ type, page: pageRef.current, ...extra });
      if (requestEpoch !== epoch.current) return null;
      if (response?.error) throw new Error(response.error);
      await refresh();
      return response;
    } catch (cause) {
      if (requestEpoch === epoch.current) setError(cause instanceof Error ? cause.message : "操作失败，请重试");
      return null;
    } finally {
      if (requestEpoch === epoch.current) setBusy(false);
    }
  }

  async function fill(datePolicy?: DateCompletionPolicy): Promise<void> {
    const requestEpoch = epoch.current;
    const page = pageRef.current;
    setBusy(true);
    setError("");
    try {
      const granted = await browser.permissions.request({
        origins: ["https://*/*", "http://*/*"],
      });
      if (!granted) {
        void trackExtensionEvent("extension_permission_denied", {
          permission: "host_access",
        });
        throw new Error(
          "需要网页访问权限才能填写招聘表单。你可以稍后再次点击并允许。",
        );
      }
      if (requestEpoch !== epoch.current || !page) return;
      const response = await browser.runtime.sendMessage({ type: "fill", page,
        ...(datePolicy ? { datePolicy, rememberDatePolicy: rememberDates } : {}),
      });
      if (requestEpoch !== epoch.current) return;
      if (response?.error) throw new Error(response.error);
      setResult(response as FillResult);
      setDatePromptDismissed(false);
      await refresh();
    } catch (cause) {
      if (requestEpoch === epoch.current) setError(cause instanceof Error ? cause.message : "操作失败，请重试");
    } finally {
      if (requestEpoch === epoch.current) setBusy(false);
    }
  }

  if (!initialized)
    return (
      <main className="shell">
        <Brand />
        <section className="loadingState">
          <RefreshCw className="spin" size={22} />
          <p>正在检查智简简历登录状态…</p>
        </section>
      </main>
    );

  if (statusError && !status.connected) return (
    <main className="shell"><Brand /><section className="card">
      <ErrorMessage text={statusError} />
      <button className="secondary" disabled={checkingPage} onClick={() => void recoverPage(false)}>{checkingPage ? "正在重新检测…" : "重新检测插件状态"}</button>
    </section><Privacy /></main>
  );

  const pageIssue = status.pageIssue || (!status.page ? "site_access_required" : null);

  if (!status.onboardingAccepted)
    return (
      <main className="shell">
        <Brand />
        <section className="hero onboarding">
          <div className="heroIcon">
            <ShieldCheck size={24} />
          </div>
          <h1>开始前，了解一下</h1>
          <p>智简网申助手会在你操作时：</p>
          <ul className="permissionList">
            <li>记录站点域名、填写数量和固定失败分类，用于改进兼容性；不上传简历正文</li>
            <li>同步你维护的网申资料，用于填写当前页面</li>
            <li>创建投递记录，方便后续跟进状态</li>
            <li>不会自动提交、处理验证码或读取浏览历史</li>
          </ul>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("accept-onboarding")}
          >
            {busy ? "正在检查登录状态…" : "同意并开始使用"}
          </button>
          <a className="textLink" href={`${WEBSITE}/privacy`} target="_blank">
            查看隐私说明 <ExternalLink size={13} />
          </a>
          {error && <ErrorMessage text={error} />}
        </section>
        <Privacy />
      </main>
    );

  if (!status.connected)
    return (
      <main className="shell">
        <Brand />
        <section className="hero">
          <div className="heroIcon">
            {status.autoConnectEnabled ? (
              <LogIn size={24} />
            ) : (
              <Sparkles size={24} />
            )}
          </div>
          <h1>
            {status.autoConnectEnabled ? "登录后自动连接" : "自动连接已关闭"}
          </h1>
          <p>
            {status.autoConnectEnabled
              ? status.awaitingLogin
                ? "正在等待你完成登录。登录成功后，无需返回授权，插件会自动获取网申资料。"
                : "如果你已经登录智简简历，可以直接重新检测；否则先打开登录页。"
              : "重新启用后，插件会优先复用智简简历的现有登录状态，不需要再次扫码。"}
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void action(
                status.autoConnectEnabled
                  ? status.connectionIssue === "login_required"
                    ? "open-login"
                    : "retry-silent-connect"
                  : "enable-auto-connect",
              )
            }
          >
            {busy
              ? "正在检测…"
              : !status.autoConnectEnabled
                ? "重新启用自动连接"
                : status.connectionIssue === "login_required"
                  ? "打开智简简历登录"
                  : "重新检测登录状态"}
          </button>
          {status.autoConnectEnabled && (
            <button
              className="secondary subtle"
              disabled={busy}
              onClick={() => void action("retry-silent-connect")}
            >
              我已登录，重新检测
            </button>
          )}
          <a
            className="textLink"
            href={`${WEBSITE}/dashboard/application-profile`}
            target="_blank"
          >
            维护网申资料 <ExternalLink size={13} />
          </a>
          {status.connectionIssue === "server_error" && (
            <ErrorMessage text="暂时无法连接智简简历，请稍后重试。" />
          )}
          {error && <ErrorMessage text={error} />}
        </section>
        <Privacy />
      </main>
    );

  return (
    <main className="shell">
      <Brand />
      <section className="card compact">
        <div className="statusRow">
          <div>
            <span className="dot" />
            已连接智简简历
          </div>
          <button
            className="iconButton"
            title="断开连接"
            onClick={() => void action("disconnect")}
          >
            <LogOut size={16} />
          </button>
        </div>
        <a
          className="textLink left"
          href={`${WEBSITE}/dashboard/application-profile`}
          target="_blank"
        >
          维护网申资料 <ExternalLink size={12} />
        </a>
      </section>
      <section className="card">
        <h2>当前申请页面</h2>
        <p className="muted">
          根据字段标签和所属经历识别当前表单，只填写资料中有值的内容。首次使用时，Chrome
          会请求网页访问权限。
        </p>
        <button className="primary" aria-describedby={pageIssue || statusError ? "page-availability" : undefined} disabled={busy || checkingPage || !status.page || !!statusError} onClick={() => void fill()}>
          {busy ? (
            <>
              <RefreshCw className="spin" size={17} /> 正在填写…
            </>
          ) : (
            "一键填写此页面"
          )}
        </button>
        {(pageIssue || statusError) && <div id="page-availability" className="pageAvailability" role="status">
          <p>{statusError || PAGE_ISSUE_MESSAGES[pageIssue!]}</p>
          <button className={!statusError && pageIssue === "site_access_required" ? "primary" : "secondary"} disabled={busy || checkingPage} onClick={() => void recoverPage(!statusError && pageIssue === "site_access_required")}>
            {checkingPage ? "正在重新检测…" : !statusError && pageIssue === "site_access_required" ? "授权并重新检测" : "重新检测当前页面"}
          </button>
          {!statusError && pageIssue === "site_access_required" && <p className="muted">授权只用于识别页面，不会自动填写或提交。若浏览器要求选择网站访问范围，请按提示确认。</p>}
        </div>}
        {status.datePolicy && status.datePolicy !== "ask" && (
          <div className="datePreference">
            <p className="muted">此网站的日期偏好：{status.datePolicy === "first-day" ? "缺少具体日期时使用当月1日，请核对" : "缺少具体日期时留空，手动填写"}。</p>
            <button className="textLink" disabled={busy} onClick={async () => {
              const response = await action("set-date-policy", { datePolicy: "ask" });
              if (response) setDatePromptDismissed(false);
            }}>重新询问日期补全</button>
          </div>
        )}
        {error && <ErrorMessage text={error} />}
      </section>
      {!!result?.controlMetrics?.controlDatePrecisionMissingCount && (status.datePolicy || "ask") === "ask" && !datePromptDismissed && (
        <section className="card dateConfirmation" aria-labelledby="date-confirmation-title">
          <h2 id="date-confirmation-title">这些日期需要你确认</h2>
          <p className="muted">有 {result.controlMetrics.controlDatePrecisionMissingCount} 个日期只有年月，但网站要求具体到日。是否临时使用当月1日？例如：2023年3月 → 2023年3月1日。</p>
          <p className="muted">1日并非资料中的真实日期，请确认适用后再选择。不修改原始网申资料，不替换已有日期，“至今”不会变成结束日期。</p>
          <label className="dateRemember"><input type="checkbox" checked={rememberDates} disabled={busy} onChange={event => setRememberDates(event.target.checked)} />在此网站记住选择（仅此浏览器）</label>
          <button className="primary" disabled={busy || !status.page} onClick={() => void fill("first-day")}>使用当月1日继续填写</button>
          <button className="secondary subtle" disabled={busy} onClick={async () => {
            const requestEpoch = epoch.current;
            if (rememberDates) {
              const response = await action("set-date-policy", { datePolicy: "manual" });
              if (!response) return;
            }
            if (requestEpoch === epoch.current) setDatePromptDismissed(true);
          }}>保持空白，手动填写</button>
        </section>
      )}
      {result && (
        <section className="card">
          <h2>填写结果</h2>
          {result.recordingError && <ErrorMessage text={result.recordingError} />}
          {!!result.controlMetrics?.dateCompletionAppliedCount && <p className="repeaterSummary">已按你的选择，将 {result.controlMetrics.dateCompletionAppliedCount} 个日期补为当月1日。请核对真实日期后再提交。</p>}
          {typeof result.detectedFieldCount === "number" && (
            <p className="muted">
              检测到 {result.detectedFieldCount} 个控件，其中{" "}
              {result.contextualFieldCount || 0}{" "}
              个取得了标签或上下文（不代表已匹配或填写）。请核对结果后再提交。
            </p>
          )}
          <div className="metrics">
            <div>
              <strong>{result.filled}</strong>
              <span>已填写</span>
            </div>
            <div>
              <strong>{result.alreadyFilled}</strong>
              <span>原本有值</span>
            </div>
            <div>
              <strong>{result.missingProfileCount ?? result.missingProfile.length}</strong>
              <span>资料待补充</span>
            </div>
            <div>
              <strong>{(result.failedCount ?? result.failed.length) + (result.unmatchedCount ?? result.unmatched.length)}</strong>
              <span>暂未填写</span>
            </div>
          </div>
          {typeof result.profileExperienceCount === "number" && (
            <p className="repeaterSummary">
              工作经历：资料 {result.profileExperienceCount} 条
              {typeof result.pageExperienceCount === "number" && (
                <>
                  ，填写前{" "}
                  {result.pageExperienceCount -
                    (result.addedExperienceRows || 0)}{" "}
                  条，新增 {result.addedExperienceRows || 0} 条，最终{" "}
                  {result.pageExperienceCount} 条
                </>
              )}
              {result.repeaterDiagnostics
                ?.filter(
                  (item) =>
                    item.profilePath === "experiences" && item.failureReason,
                )
                .map((item) => (
                  <span className="repeaterFailure" key={item.profilePath}>
                    {item.failureReason === "button_not_found"
                      ? "。未找到新增按钮"
                      : "。新增按钮点击后页面没有响应"}
                  </span>
                ))}
            </p>
          )}
          {result.missingProfile.length > 0 && (
            <details>
              <summary>查看需要补充的资料</summary>
              <ul>
                {result.missingProfile.slice(0, 10).map((field, index) => (
                  <li key={`${field}-${index}`}>{field}</li>
                ))}
              </ul>
            </details>
          )}
          {result.failed.length > 0 && (
            <details>
              <summary>查看控件填写失败项</summary>
              <ul>
                {result.failed.slice(0, 10).map((field, index) => (
                  <li key={`${field}-${index}`}>{field}</li>
                ))}
              </ul>
            </details>
          )}
          {result.unmatched.length > 0 && (
            <details>
              <summary>查看未识别字段</summary>
              <ul>
                {result.unmatched.slice(0, 10).map((field, index) => (
                  <li key={`${field}-${index}`}>{field}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {status.application && (
        <section className="card">
          <div className="applicationTitle">
            <ClipboardCheck size={18} />
            <div>
              <h2>{status.application.jobTitle}</h2>
              <p>{status.application.companyName}</p>
            </div>
          </div>
          {status.application.status === "DRAFT" ? (
            <>
              <div
                className={`submitHint ${status.submitDetected ? "active" : ""}`}
              >
                {status.submitDetected ? (
                  <CircleAlert size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {status.submitDetected
                  ? "检测到你可能已经提交，请确认结果。"
                  : "已创建“待投递”记录。提交完成后请确认。"}
              </div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void action("mark-applied", {
                    applicationId: status.application!.id,
                  })
                }
              >
                我已完成投递
              </button>
            </>
          ) : (
            <div className="success">
              <CheckCircle2 size={17} />
              已记录为“已投递”
            </div>
          )}
          <a
            className="textLink left"
            href={`${WEBSITE}/dashboard/applications`}
            target="_blank"
          >
            打开投递管理 <ExternalLink size={12} />
          </a>
        </section>
      )}
      <Privacy />
    </main>
  );
}

function Brand() {
  return (
    <header className="brand">
      <img
        className="logo"
        src={browser.runtime.getURL("/icon/128.png")}
        alt="智简简历"
      />
      <div>
        <strong>智简网申助手</strong>
        <span>快速填表 · 投递留痕</span>
      </div>
    </header>
  );
}
function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="error">
      <CircleAlert size={15} />
      {text}
    </div>
  );
}
function Privacy() {
  return (
    <p className="privacy">
      仅在你点击插件时读取当前页面，不自动提交、不处理验证码。
    </p>
  );
}
