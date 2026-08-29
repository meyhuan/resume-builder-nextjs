import { describe, expect, it } from "vitest";
import { getSiteAdapter } from "./site-adapters";

describe("getSiteAdapter", () => {
  it("selects the JD careers adapter", () => {
    const adapter = getSiteAdapter("zhaopin.jd.com");
    expect(adapter?.id).toBe("jd-careers");
    expect(adapter?.contextRules).toContainEqual({
      selector: "#telephone",
      context: "手机号码",
    });
  });

  it("selects the Tencent careers adapter and excludes custom selectors", () => {
    const adapter = getSiteAdapter("careers.tencent.com");
    expect(adapter?.id).toBe("tencent-careers");
    expect(adapter?.ignoreSelectors).toContain(".el-select__input");
    expect(adapter?.contextRules.some((rule) => rule.context === "姓名")).toBe(
      true,
    );
  });

  it("falls back to generic scanning for other sites", () => {
    expect(getSiteAdapter("jobs.example.com")).toBeNull();
  });
});
