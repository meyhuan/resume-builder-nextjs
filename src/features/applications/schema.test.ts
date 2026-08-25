import { describe, expect, it } from "vitest";
import { applicationFingerprint, canonicalizeUrl } from "./schema";

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
