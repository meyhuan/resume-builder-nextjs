import { expect, it } from "vitest";
import { extensionEventSchema, sanitizeExtensionMetrics } from "./schema";
it("retains bounded metrics, never form values, URLs or arbitrary errors", () => {
  expect(sanitizeExtensionMetrics({filledCount:5, status:"partial", dateCompletionPolicy:"first-day", sourceDomain:"Careers.Tencent.com", fieldValue:"secret", token:"secret", fullUrl:"https://site/?email=private", failedCount:NaN, durationMs:Infinity, missingProfileCount:-1, engineVersion:"user@example.com"})).toEqual({filledCount:5,status:"partial",dateCompletionPolicy:"first-day",sourceDomain:"careers.tencent.com"});
  expect(sanitizeExtensionMetrics({sourceDomain:"site.com/?user=private", adapterId:"错误：简历正文",status:"private text"})).toEqual({});
});
it("requires an allowed event and a valid retry ID", () => {
  expect(extensionEventSchema.safeParse({eventName:"extension_fill_result",eventId:"bad"}).success).toBe(false);
  expect(extensionEventSchema.safeParse({eventName:"arbitrary"}).success).toBe(false);
  expect(extensionEventSchema.safeParse({eventName:"extension_fill_result",eventId:"f3e0f276-8d8c-4c7b-a1dd-f60f2e37b328",properties:{filledCount:1}}).success).toBe(true);
});
