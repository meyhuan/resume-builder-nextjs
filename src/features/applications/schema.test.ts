import { describe, expect, it } from "vitest";
import {
  applicationFingerprint,
  canonicalizeUrl,
  updateApplicationSchema,
} from "./schema";

describe("job application identity", () => {
  it("drops tracking parameters from application URLs", () => {
    expect(
      canonicalizeUrl("https://jobs.example.com/apply?id=1&utm_source=x#form"),
    ).toBe("https://jobs.example.com/apply?id=1");
  });

  it("creates stable fingerprints for equivalent applications", () => {
    const first = applicationFingerprint({
      companyName: "示例公司",
      jobTitle: "前端工程师",
      applicationUrl: "https://jobs.example.com/apply?id=1&utm_source=a",
    });
    const second = applicationFingerprint({
      companyName: " 示例公司 ",
      jobTitle: "前端工程师",
      applicationUrl: "https://jobs.example.com/apply?id=1&utm_source=b",
    });
    expect(first).toBe(second);
  });
});

describe("application workflow fields", () => {
  it("accepts a scheduled next action", () => {
    const value = updateApplicationSchema.parse({
      nextActionType: "INTERVIEW",
      nextActionAt: "2026-09-01T06:00:00.000Z",
      deadlineAt: "2026-08-31T15:59:00.000Z",
    });

    expect(value.nextActionType).toBe("INTERVIEW");
    expect(value.nextActionAt).toBe("2026-09-01T06:00:00.000Z");
  });

  it("allows clearing a scheduled action", () => {
    const value = updateApplicationSchema.parse({
      nextActionType: null,
      nextActionAt: null,
    });

    expect(value).toEqual({ nextActionType: null, nextActionAt: null });
  });
});
