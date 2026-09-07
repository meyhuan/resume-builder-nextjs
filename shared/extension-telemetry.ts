export const eventNames = [
  "extension_sidepanel_open", "extension_onboarding_accept", "extension_connect_success",
  "extension_disconnect", "extension_fill_start", "extension_fill_result", "extension_fill_complete",
  "extension_fill_partial", "extension_fill_failed", "extension_permission_denied",
  "extension_application_created", "extension_mark_applied",
] as const;

const numericKeys = new Set([
  "controlDatePrecisionMissingCount", "dateCompletionAppliedCount", "controlPopupCloseFailedCount",
  "controlInvalidValueCount", "controlPopupUnavailableCount", "controlOptionUnavailableCount",
  "controlVerificationFailedCount", "controlDriverErrorCount", "popupDateAttemptCount",
  "popupDateFilledCount", "popupDateExistingCount", "popupDateFailedCount", "cascaderAttemptCount",
  "cascaderFilledCount", "cascaderExistingCount", "cascaderFailedCount", "detectedFieldCount",
  "contextualFieldCount", "alreadyFilledCount", "durationMs", "failedCount", "fieldCount", "filledCount",
  "missingProfileCount", "repeaterAddedCount", "repeaterAddedTotal", "repeaterAttempts", "repeaterDesiredCount",
  "repeaterFailureCount", "repeaterFinalCount", "repeaterInitialCount", "repeaterRuleCount", "unmatchedCount",
]);
const codeKeys = new Set(["engineVersion", "extensionVersion", "adapterId", "repeaterFailureReason", "repeaterStatus"]);
const enumValues: Record<string, readonly string[]> = {
  status: ["success", "partial", "failed", "DRAFT", "APPLIED", "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  dateCompletionPolicy: ["ask", "first-day", "manual"],
  authMode: ["silent", "interactive"], permission: ["host_access"],
};

export function sanitizeExtensionMetrics(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (numericKeys.has(key) && typeof item === "number" && Number.isFinite(item) && item >= 0 && item <= 3_600_000) result[key] = Math.floor(item);
    else if (codeKeys.has(key) && typeof item === "string" && /^[a-zA-Z0-9_.-]{1,64}$/.test(item)) result[key] = item;
    else if (enumValues[key]?.includes(String(item))) result[key] = String(item);
    else if (key === "sourceDomain" && typeof item === "string" && item.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(item)) result[key] = item.toLowerCase();
    else if (["supportedSite", "recordingFailed"].includes(key) && typeof item === "boolean") result[key] = item;
  }
  return result;
}
