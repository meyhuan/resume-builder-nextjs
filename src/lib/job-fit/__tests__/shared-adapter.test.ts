import { describe, expect, it } from "vitest";
import type { JobFitResult } from "@meyhuan/job-fit-engine/contracts";
import type { ResumeData } from "@/entities/resume/resume-data";
import { fromCanonicalResume, toCanonicalResume, toLegacyJobFitResult } from "../shared-adapter";

const source: ResumeData = {
  id: "resume-1",
  name: "林晓",
  baseInfo: { email: "lin@example.com", phone: "13800000000" },
  jobIntention: { position: "电商运营" },
  sections: [
    {
      id: "summary",
      title: "个人总结",
      columns: 1,
      blocks: [{ id: "summary-text", type: "text", html: "<p>三年电商运营经验。</p>" }],
    },
    {
      id: "experience",
      title: "工作经历",
      columns: 1,
      blocks: [{
        id: "job-1",
        type: "experience",
        company: "某零售公司",
        position: "电商运营",
        startDate: "2022.01",
        endDate: "2025.01",
        contentHtml: "<p>负责商品上架和活动执行。</p>",
      }],
    },
  ],
};

describe("shared Job Fit adapter", () => {
  it("round-trips protected product fields while applying generated content", () => {
    const canonical = toCanonicalResume(source);
    canonical.summary = "三年电商运营经验，擅长商品管理与活动执行。";
    canonical.sections[0]!.items[0]!.bullets[0]!.text = "负责商品管理、商品上架和活动执行。";
    const optimized = fromCanonicalResume(source, canonical, "高级电商运营");
    expect(optimized.baseInfo).toEqual(source.baseInfo);
    expect(optimized.sections[1]?.blocks[0]).toMatchObject({ company: "某零售公司", position: "电商运营" });
    expect(optimized.jobIntention?.position).toBe("高级电商运营");
    expect(JSON.stringify(optimized)).toContain("商品管理");
  });

  it("maps shared claims and v2 scoring into the existing result contract", () => {
    const canonical = toCanonicalResume(source);
    const optimized = structuredClone(canonical);
    optimized.summary = "三年电商运营经验，擅长商品管理。";
    const shared = {
      schemaVersion: "1",
      sourceHash: "a".repeat(64),
      optimizedResume: optimized,
      readiness: "READY_WITH_INFERENCES",
      requirements: [{ id: "req-1", type: "KEYWORD", label: "商品管理", keywords: ["商品管理"], weight: 1, reason: "核心职责" }],
      changes: [{ id: "change-1", patchId: "patch-1", locator: {}, category: "KEYWORD", before: canonical.summary, after: optimized.summary, reason: "强化关键词", requirementIds: ["req-1"], evidenceIds: ["evidence-summary"], claimIds: ["claim-1"], contextHash: "b".repeat(64) }],
      claims: [{ id: "claim-1", patchId: "patch-1", locator: {}, status: "AI_INFERRED", text: optimized.summary, evidenceIds: ["evidence-summary"], reason: "相近能力", confidence: 0.8 }],
      scoring: {
        version: "job-fit-score-v2",
        original: 40,
        optimized: 70,
        improvement: 30,
        keyword: { before: 20, after: 80, matchedBefore: 0, matchedAfter: 1, total: 1 },
        capability: { before: 40, after: 60, matchedBefore: 1, matchedAfter: 1, total: 2 },
        experience: { before: 60, after: 70, matchedBefore: 1, matchedAfter: 1, total: 2 },
      },
      evidenceSummary: { sourceBacked: 0, transferred: 0, inferred: 1, estimated: 0 },
      completed: ["强化关键词"],
      suggestions: [],
      rejectedChanges: [],
      run: {
        engineVersion: "0.1.0-beta.6",
        schemaVersion: "1",
        parserVersion: "job-fit-parser-v1",
        promptVersion: "tailor-sprint-v1",
        scoringVersion: "job-fit-score-v2",
        guardVersion: "job-fit-guard-v2",
        provider: "fake",
        model: "fake",
        candidateStage: "MID_CAREER",
        latencyMs: 1,
      },
    } satisfies JobFitResult;
    const result = toLegacyJobFitResult(source, shared, "电商运营");
    expect(result.readiness).toBe("READY_WITH_INFERENCES");
    expect(result.claims?.[0]?.status).toBe("AI_INFERRED");
    expect(result.scoring.version).toBe("job-fit-score-v2");
    expect(result.changes[0]?.claimStatus).toBe("AI_INFERRED");
  });
});
