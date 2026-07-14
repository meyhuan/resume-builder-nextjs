import { describe, expect, it } from "vitest";
import type { ResumeFact } from "./fact-extractor";
import {
  buildSupplementalFacts,
  upsertEvidenceAnswer,
  type JobEvidenceAnswer,
} from "./job-evidence";

const sourceFact: ResumeFact = {
  id: "experience:commerce",
  sectionId: "experience",
  blockId: "commerce",
  type: "experience",
  sectionTitle: "工作经历",
  label: "示例科技 · 电商运营",
  text: "负责 618 活动运营和数据复盘。",
};

describe("job supplemental evidence", () => {
  it("binds a confirmed answer to the selected resume block", () => {
    const answer: JobEvidenceAnswer = {
      requirementId: "requirement:付费推广",
      requirementLabel: "付费推广",
      answer: "yes",
      detail: "在双十一期间操作万相台投放，根据 ROI 调整预算与出价。",
      sourceFactId: sourceFact.id,
      updatedAt: "2026-07-14T00:00:00.000Z",
    };

    const result = buildSupplementalFacts([answer], [sourceFact]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      blockId: sourceFact.blockId,
      origin: "job_supplement",
    });
    expect(result[0]?.text).toContain("万相台");
  });

  it("does not turn a no answer into resume evidence", () => {
    const result = buildSupplementalFacts(
      [
        {
          requirementId: "requirement:付费推广",
          requirementLabel: "付费推广",
          answer: "no",
          updatedAt: "2026-07-14T00:00:00.000Z",
        },
      ],
      [sourceFact],
    );
    expect(result).toEqual([]);
  });

  it("replaces the previous answer for the same requirement", () => {
    const previous: JobEvidenceAnswer = {
      requirementId: "requirement:选品",
      requirementLabel: "选品",
      answer: "no",
      updatedAt: "2026-07-13T00:00:00.000Z",
    };
    const next: JobEvidenceAnswer = {
      requirementId: "requirement:选品",
      requirementLabel: "选品",
      answer: "similar",
      detail: "根据活动库存和历史转化协助筛选主推商品。",
      sourceFactId: sourceFact.id,
      updatedAt: "2026-07-14T00:00:00.000Z",
    };
    expect(upsertEvidenceAnswer([previous], next)).toEqual([next]);
  });
});
