import { afterEach, describe, expect, it, vi } from "vitest";
import { trackExtensionEvent } from "./analytics";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function installBrowserStorage(accessToken?: string) {
  const localValues: Record<string, unknown> = accessToken
    ? { accessToken }
    : {};
  const sessionValues: Record<string, unknown> = {};
  const area = (values: Record<string, unknown>) => ({
    get: vi.fn(async (keys: string | string[]) => {
      const selected = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        selected
          .filter((key) => key in values)
          .map((key) => [key, values[key]]),
      );
    }),
    set: vi.fn(async (next: Record<string, unknown>) => {
      Object.assign(values, next);
    }),
  });
  vi.stubGlobal("browser", {
    storage: {
      local: area(localValues),
      session: area(sessionValues),
    },
  });
}

describe("trackExtensionEvent", () => {
  it("skips analytics before the extension is connected", async () => {
    installBrowserStorage();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await trackExtensionEvent("extension_sidepanel_open");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an authenticated event without interrupting the product flow", async () => {
    installBrowserStorage("token-1");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await trackExtensionEvent("extension_fill_result", {
      status: "success",
      filledCount: 6,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      eventName: "extension_fill_result",
      properties: { status: "success", filledCount: 6 },
    });
  });

  it("swallows analytics network failures", async () => {
    installBrowserStorage("token-1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      trackExtensionEvent("extension_mark_applied"),
    ).resolves.toBeUndefined();
  });
});
