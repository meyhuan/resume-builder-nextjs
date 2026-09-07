import type { TelemetryName } from "./telemetry-queue";
export type ExtensionAnalyticsEventName = TelemetryName;
// Sidepanel events are persisted by the background, the only writer of the queue.
export async function trackExtensionEvent(eventName: TelemetryName, properties: Record<string, unknown> = {}): Promise<void> {
  try { await browser.runtime.sendMessage({type: "analytics-track", eventName, properties}); }
  catch { /* Telemetry must not block the UI. */ }
}
