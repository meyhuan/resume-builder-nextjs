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

interface Status {
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
  const [result, setResult] = useState<FillResult | null>(null);
  const openTracked = useRef(false);

  const refresh = useCallback(async (initialize = false) => {
    const response = await browser.runtime.sendMessage({
      type: initialize ? "initialize" : "status",
    });
    if (!response?.error) setStatus(response as Status);
    setInitialized(true);
  }, []);

  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
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
    setBusy(true);
    setError("");
    try {
      const response = await browser.runtime.sendMessage({ type, ...extra });
      if (response?.error) throw new Error(response.error);
      await refresh();
      return response;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function fill(): Promise<void> {
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
      const response = await browser.runtime.sendMessage({ type: "fill" });
      if (response?.error) throw new Error(response.error);
      setResult(response as FillResult);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试");
    } finally {
      setBusy(false);
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
          点击后扫描当前页，只填写已枚举且资料中有值的字段。首次使用时，Chrome
          会请求网页访问权限。
        </p>
        <button className="primary" disabled={busy} onClick={() => void fill()}>
          {busy ? (
            <>
              <RefreshCw className="spin" size={17} /> 正在填写…
            </>
          ) : (
            "一键填写此页面"
          )}
        </button>
        {error && <ErrorMessage text={error} />}
      </section>
      {result && (
        <section className="card">
          <h2>填写结果</h2>
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
              <strong>{result.missingProfile.length}</strong>
              <span>资料待补充</span>
            </div>
            <div>
              <strong>{result.failed.length + result.unmatched.length}</strong>
              <span>暂未填写</span>
            </div>
          </div>
          {typeof result.profileExperienceCount === "number" && (
            <p className="repeaterSummary">
              工作经历：资料 {result.profileExperienceCount} 条
              {typeof result.pageExperienceCount === "number" && (
                <>
                  ，页面现有 {result.pageExperienceCount} 条，本次新增{" "}
                  {result.addedExperienceRows || 0} 条
                </>
              )}
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
