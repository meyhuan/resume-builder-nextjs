import { afterEach, expect, it, vi } from "vitest";
import { trackExtensionEvent } from "./analytics";
afterEach(() => vi.unstubAllGlobals());
it("forwards UI telemetry to the sole background writer", async () => {
  const sendMessage = vi.fn(async () => ({ok:true}));
  vi.stubGlobal("browser", {runtime:{sendMessage}});
  await trackExtensionEvent("extension_fill_result", {filledCount: 6});
  expect(sendMessage).toHaveBeenCalledWith({type:"analytics-track", eventName:"extension_fill_result", properties:{filledCount:6}});
});
it("does not interrupt UI when the background is unavailable", async () => {
  vi.stubGlobal("browser", {runtime:{sendMessage:vi.fn().mockRejectedValue(new Error("closed"))}});
  await expect(trackExtensionEvent("extension_sidepanel_open")).resolves.toBeUndefined();
});
