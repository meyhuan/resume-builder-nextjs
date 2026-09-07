import { z } from "zod";
import { eventNames, sanitizeExtensionMetrics } from "../../../shared/extension-telemetry";
export { eventNames, sanitizeExtensionMetrics } from "../../../shared/extension-telemetry";

export const extensionEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  eventName: z.enum(eventNames),
  occurredAt: z.string().datetime().optional(),
  properties: z.unknown().transform(sanitizeExtensionMetrics),
});
