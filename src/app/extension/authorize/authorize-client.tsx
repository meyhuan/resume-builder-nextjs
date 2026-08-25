"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function ExtensionAuthorizeClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirectUri = params.get("redirect_uri") || "";
  const state = params.get("state") || "";
  const codeChallenge = params.get("code_challenge") || "";
  const valid = useMemo(
    () => Boolean(redirectUri && state && codeChallenge),
    [redirectUri, state, codeChallenge],
  );

  async function authorize(): Promise<void> {
    setLoading(true);
    setError("");
    const response = await fetch("/next-api/extension/auth-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ redirectUri, codeChallenge }),
    });
    if (response.status === 401) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "授权失败，请稍后重试");
      setLoading(false);
      return;
    }
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", payload.code);
    callback.searchParams.set("state", state);
    window.location.assign(callback.toString());
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-violet-100/60">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">
          连接智简网申助手
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-500">
          插件将只读取你的网申资料，并为你创建和更新投递记录。它不会获得智简简历的登录
          Cookie，也不会自动提交申请。
        </p>
        <ul className="mt-6 space-y-2 rounded-2xl bg-violet-50 p-4 text-sm text-slate-700">
          <li>• 读取网申资料用于当前页面填充</li>
          <li>• 创建待投递记录并在你确认后更新状态</li>
          <li>• 授权有效期 90 天，可随时撤销</li>
        </ul>
        {error && (
          <p className="mt-4 text-center text-sm text-rose-600">{error}</p>
        )}
        <button
          type="button"
          disabled={!valid || loading}
          onClick={authorize}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "正在连接…" : "确认连接"}
        </button>
      </section>
    </main>
  );
}
