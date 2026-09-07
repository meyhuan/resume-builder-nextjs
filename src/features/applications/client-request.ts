export async function applicationRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      init.method && init.method !== "GET"
        ? "网络异常，尚未确认操作结果。请保留当前内容，恢复网络后刷新核对。"
        : "网络异常，暂时无法读取数据，请重试。",
    );
  }
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("re-login-required"));
    throw new Error("登录已失效，请重新登录；当前编辑内容尚未保存。");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body?.error === "string" && body.error !== "Unauthorized"
        ? body.error
        : "操作未成功，请保留当前内容后重试。",
    );
  if (body === null) throw new Error("服务器返回异常，请刷新核对操作结果。");
  return body as T;
}
