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
    expect(adapter?.contextRules).toContainEqual({
      selector: "#birthday",
      context: "出生日期",
      controlKind: "readonly-date",
      allowReadOnly: true,
    });
    expect(adapter?.repeaters?.map((rule) => rule.profilePath)).toEqual([
      "experiences",
      "projects",
      "education",
    ]);
  });

  it("selects the Tencent careers adapter and excludes custom selectors", () => {
    const adapter = getSiteAdapter("careers.tencent.com");
    expect(adapter?.id).toBe("tencent-careers");
    expect(adapter?.ignoreSelectors).toContain(".el-select__input");
    expect(adapter?.contextRules.some((rule) => rule.context === "姓名")).toBe(
      true,
    );
    expect(
      adapter?.contextRules.some(
        (rule) =>
          rule.context === "学历" && rule.controlKind === "custom-select",
      ),
    ).toBe(true);
    expect(adapter?.repeaters).toHaveLength(2);
    expect(adapter?.repeaters?.[0]?.addButtonSelectors[0]).toBe(
      ".experience-message > .add-experience .add-text.experience",
    );
    expect(adapter?.repeaters?.[1]?.addButtonSelectors[0]).toBe(
      ".education-message > .add-experience .add-text.education",
    );
  });

  it("falls back to generic scanning for other sites", () => {
    expect(getSiteAdapter("jobs.example.com")).toBeNull();
  });
});
