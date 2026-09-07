export type ExtensionAuthErrorCode =
  | "login_required"
  | "server_error"
  | "state_mismatch"
  | "missing_code";

export class ExtensionAuthError extends Error {
  constructor(
    public readonly code: ExtensionAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtensionAuthError";
  }
}

export function parseAuthCallback(raw: string, expectedState: string): string {
  const callback = new URL(raw);
  if (callback.searchParams.get("state") !== expectedState) {
    throw new ExtensionAuthError("state_mismatch", "授权状态校验失败");
  }
  const error = callback.searchParams.get("error");
  if (error === "login_required") {
    throw new ExtensionAuthError(
      "login_required",
      "请先登录智简简历，登录后插件会自动连接",
    );
  }
  if (error) {
    throw new ExtensionAuthError("server_error", "暂时无法连接智简简历");
  }
  const code = callback.searchParams.get("code");
  if (!code) {
    throw new ExtensionAuthError("missing_code", "没有收到授权码");
  }
  return code;
}
