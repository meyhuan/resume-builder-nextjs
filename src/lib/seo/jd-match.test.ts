import { describe, expect, it } from "vitest";
import { analyzeJdMatch } from "./jd-match";

describe("analyzeJdMatch for Chinese job seekers", () => {
  const jobDescription = `
岗位职责
负责店铺、品类及核心单品的电商运营，完成销售目标。
需要市场分析、选品测款、爆款打造、竞品分析、搜索优化、付费推广和数据复盘能力。
沉淀可复制的方法论和知识库。
`;
  const resumeText = `
负责电商 CRM 活动运营，完成 618、双十一商品配置和数据复盘，相关活动贡献 5 万订单、1800 万 GMV。
通过选题、素材测试和数据迭代打造 300 万播放内容，并沉淀 SOP。
`;

  it("recognizes direct and transferable evidence instead of only exact keywords", () => {
    const result = analyzeJdMatch({
      jobDescription,
      targetRole: "电商运营",
      resumeText,
    });

    expect(result.matchedKeywords).toContain("复盘");
    expect(result.transferableKeywords).toEqual(
      expect.arrayContaining([
        "电商运营",
        "选品",
        "测款",
        "爆款",
        "销售目标",
        "方法论",
      ]),
    );
    expect(result.missingKeywords).toContain("付费推广");
    expect(
      result.requirements.find((item) => item.label === "付费推广")?.question,
    ).toContain("平台");
  });

  it("keeps source fact ids on requirement evidence", () => {
    const result = analyzeJdMatch({
      jobDescription,
      targetRole: "电商运营",
      resumeText,
      evidenceItems: [
        {
          id: "fact-commerce",
          text: "负责电商 CRM 活动运营，完成 618 商品配置和数据复盘，贡献 1800 万 GMV。",
        },
        {
          id: "fact-content",
          text: "通过素材测试和数据迭代打造 300 万播放内容，并沉淀 SOP。",
        },
      ],
    });

    expect(
      result.requirements.find((item) => item.label === "复盘")?.matchedFactIds,
    ).toContain("fact-commerce");
    expect(
      result.requirements.find((item) => item.label === "测款")?.matchedFactIds,
    ).toContain("fact-content");
  });
});
