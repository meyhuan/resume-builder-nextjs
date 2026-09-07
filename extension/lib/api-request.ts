export async function apiRequest(url: string, init: RequestInit = {}): Promise<Response> {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) }); }
  catch (cause) {
    if (cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name)) throw new Error("连接智简简历超时，请稍后重试；已填写的网页内容不会被清除");
    throw new Error("暂时无法连接智简简历，请检查网络或稍后重试");
  }
}
