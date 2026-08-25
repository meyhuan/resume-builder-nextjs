import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  LogOut,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { FillResult } from "../../lib/types";

interface Status {
  connected: boolean;
  hasProfile: boolean;
  submitDetected: boolean;
  application: {
    id: string;
    companyName: string;
    jobTitle: string;
    status: string;
  } | null;
}

const WEBSITE = "https://aijianli.cn";

export default function App() {
  const [status, setStatus] = useState<Status>({
    connected: false,
    hasProfile: false,
    submitDetected: false,
    application: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FillResult | null>(null);

  const refresh = useCallback(async () => {
    const response = await browser.runtime.sendMessage({ type: "status" });
    if (!response?.error) setStatus(response as Status);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [refresh]);

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
    const response = (await action("fill")) as FillResult | null;
    if (response) setResult(response);
  }

  if (!status.connected)
    return (
      <main className="shell">
        <Brand />
        <section className="hero">
          <div className="heroIcon">
            <Sparkles size={24} />
          </div>
          <h1>告别重复填写网申</h1>
          <p>
            连接智简简历后，插件会读取你维护的网申资料。已登录网站时无需再次扫码。
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("connect")}
          >
            {busy ? "正在连接…" : "连接智简简历"}
          </button>
          <a
            className="textLink"
            href={`${WEBSITE}/dashboard/application-profile`}
            target="_blank"
          >
            先去维护网申资料 <ExternalLink size={13} />
          </a>
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
          点击后扫描当前页，只填写已枚举且资料中有值的字段。
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
              <strong>{result.skipped}</strong>
              <span>已跳过</span>
            </div>
            <div>
              <strong>{result.unmatched.length}</strong>
              <span>未识别</span>
            </div>
          </div>
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
      <div className="logo">智</div>
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
