import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseJobFitModelResult } from "../generator";

const validPatch = {
  sectionId: "section-1",
  blockId: "block-1",
  field: "contentHtml",
  optimizedHtml: "<p>负责<strong>用户增长</strong>与数据分析</p>",
  category: "KEYWORD",
  reason: "突出岗位关键词",
  requirementId: "req-1",
  evidence: "用户增长",
};

describe("Job Fit model output parsing", () => {
  it("accepts the documented patch schema and strips a JSON code fence", () => {
    const parsed = parseJobFitModelResult(
      `\`\`\`json\n${JSON.stringify({ patches: [validPatch], suggestions: [] })}\n\`\`\``,
    );

    expect(parsed.patches).toHaveLength(1);
    expect(parsed.patches[0]).toMatchObject(validPatch);
  });

  it("reports the exact required fields missing from a model patch", () => {
    const invalid = JSON.stringify({
      patches: [
        {
          sectionId: "section-1",
          blockId: "block-1",
          field: "contentHtml",
          category: "keyword",
        },
      ],
      suggestions: [],
    });

    expect(() => parseJobFitModelResult(invalid)).toThrow(
      /patches\.0\.optimizedHtml/,
    );
    expect(() => parseJobFitModelResult(invalid)).toThrow(
      /patches\.0\.category/,
    );
    expect(() => parseJobFitModelResult(invalid)).toThrow(/patches\.0\.reason/);
    expect(() => parseJobFitModelResult(invalid)).toThrow(
      /patches\.0\.evidence/,
    );
  });

  it("returns a concise error when the response is not valid JSON", () => {
    expect(() => parseJobFitModelResult("这里是优化结果")).toThrow(
      /不是有效 JSON/,
    );
  });

  it("trims display-only model text instead of failing a usable patch", () => {
    const parsed = parseJobFitModelResult(JSON.stringify({
      patches: [{ ...validPatch, reason: "a".repeat(300), evidence: "b".repeat(600) }],
      suggestions: ["c".repeat(400)],
    }));

    expect(parsed.patches[0].reason).toHaveLength(240);
    expect(parsed.patches[0].evidence).toHaveLength(500);
    expect(parsed.suggestions[0]).toHaveLength(300);
  });
});
