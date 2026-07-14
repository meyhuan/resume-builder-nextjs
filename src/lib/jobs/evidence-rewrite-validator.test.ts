import { describe, expect, it } from "vitest";
import {
  hasMeaningfulTextChange,
  validateEvidenceBoundRewrite,
} from "./evidence-rewrite-validator";

describe("validateEvidenceBoundRewrite", () => {
  const source =
    "<p>负责私域小程序商城运营，参与双十一活动，助力GMV增长1800万。</p>";

  it("allows professional rephrasing that keeps existing facts", () => {
    const result = validateEvidenceBoundRewrite(
      source,
      "<p>负责私域小程序商城运营，参与双十一大促并助力GMV增长1800万。</p>",
    );
    expect(result.safe).toBe(true);
  });

  it("blocks invented numbers", () => {
    const result = validateEvidenceBoundRewrite(
      source,
      "<p>负责私域商城运营，推动转化率提升30%，GMV增长1800万。</p>",
    );
    expect(result.safe).toBe(false);
    expect(result.issues.join("")).toContain("30%");
  });

  it("blocks concrete platforms and tools missing from confirmed facts", () => {
    const result = validateEvidenceBoundRewrite(
      source,
      "<p>负责天猫店铺运营，使用万相台投放，助力GMV增长1800万。</p>",
    );
    expect(result.safe).toBe(false);
    expect(result.issues.join("")).toContain("天猫");
    expect(result.issues.join("")).toContain("万相台");
  });

  it("allows tools explicitly present in confirmed evidence", () => {
    const confirmedEvidence =
      "在双十一期间使用万相台进行人群投放，根据ROI调整预算与出价。";
    const result = validateEvidenceBoundRewrite(
      `${source}\n${confirmedEvidence}`,
      "<p>参与双十一活动，使用万相台进行人群投放，并根据ROI调整预算与出价。</p>",
    );
    expect(result.safe).toBe(true);
  });

  it("blocks upgrading participation into leadership", () => {
    const result = validateEvidenceBoundRewrite(
      "<p>参与双十一活动配置和数据复盘。</p>",
      "<p>主导双十一活动配置和数据复盘。</p>",
    );
    expect(result.safe).toBe(false);
    expect(result.issues.join("")).toContain("主导");
  });

  it("blocks turning an execution role into independently owned work", () => {
    const result = validateEvidenceBoundRewrite(
      "<p>作为运营执行，参与618单品增长项目。</p>",
      "<p>独立执行618单品增长项目。</p>",
    );
    expect(result.safe).toBe(false);
    expect(result.issues.join("")).toContain("独立执行");
  });

  it("rejects formatting-only keyword emphasis as a meaningful rewrite", () => {
    expect(
      hasMeaningfulTextChange(
        "<p>参与选品测款和竞品分析。</p>",
        "<p>参与<strong>选品</strong>测款和竞品分析。</p>",
      ),
    ).toBe(false);
    expect(
      hasMeaningfulTextChange(
        "<p>参与选品测款和竞品分析。</p>",
        "<p>围绕竞品分析结果，参与选品测款。</p>",
      ),
    ).toBe(true);
  });
});
