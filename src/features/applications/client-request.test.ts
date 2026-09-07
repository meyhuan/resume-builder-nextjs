// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { applicationRequest } from "./client-request";
afterEach(() => vi.unstubAllGlobals());
it("uses credentials and a bounded abort signal", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  vi.stubGlobal("fetch", fetcher);
  expect(await applicationRequest("/next-api/applications")).toEqual({
    ok: true,
  });
  expect(fetcher).toHaveBeenCalledWith(
    "/next-api/applications",
    expect.objectContaining({
      credentials: "include",
      signal: expect.any(AbortSignal),
    }),
  );
});
it("reports uncertain writes without claiming rollback or success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  await expect(
    applicationRequest("/next-api/applications", { method: "PATCH" }),
  ).rejects.toThrow("尚未确认操作结果");
  await expect(applicationRequest("/next-api/applications")).rejects.toThrow(
    "暂时无法读取数据",
  );
});
it("requests re-login on 401 and handles malformed server responses", async () => {
  const onLogin = vi.fn();
  window.addEventListener("re-login-required", onLogin);
  try {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );
    await expect(applicationRequest("/next-api/applications")).rejects.toThrow(
      "登录已失效",
    );
    expect(onLogin).toHaveBeenCalledOnce();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>")),
    );
    await expect(applicationRequest("/next-api/applications")).rejects.toThrow(
      "服务器返回异常",
    );
  } finally {
    window.removeEventListener("re-login-required", onLogin);
  }
});
it("accepts empty successful deletes and exposes server validation errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  expect(
    await applicationRequest("/next-api/item", { method: "DELETE" }),
  ).toBeUndefined();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "投递信息格式不正确" }), {
          status: 400,
        }),
      ),
  );
  await expect(applicationRequest("/next-api/item")).rejects.toThrow(
    "投递信息格式不正确",
  );
});
