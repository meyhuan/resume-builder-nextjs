// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { collectPageSnapshot } from "./page-scanner";
import { buildFillPlan } from "./mapping";
import { applyFillActions } from "./fill-executor";
import { runRepeaterEngine } from "./repeater-engine";
import { getSiteAdapter } from "./site-adapters";

const profile = {
  personal: { fullName: "测试用户" },
  contact: { phone: "13800000000" },
  projects: [{ name: "项目甲", description: "开发搜索" }],
  experiences: [
    { company: "公司甲", position: "工程师甲", description: "工作甲" },
    { company: "公司乙", position: "工程师乙", description: "工作乙" },
  ],
};
beforeEach(() => {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(
    () => [{ width: 100, height: 20 }] as unknown as DOMRectList,
  );
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
const field = (label: string, control: string) =>
  `<div class="kuma-uxform-field"><div class="kuma-uxform-field-label">${label}</div><ul><li>${control}</li></ul></div>`;

describe("OpenJob-derived generic autofill (no domain adapter)", () => {
  it("finds deep UXCore cards and adds stable record rows despite changing decoration classes", async () => {
    const wrap = (html: string, depth: number): string => "<div>".repeat(depth) + html + "</div>".repeat(depth);
    document.body.innerHTML = `<div class="uxcore-card"><div class="uxcore-card-header"><span class="uxcore-card-title-text">工作经历</span></div>${wrap(`<div class="uxcore-form-field-group-inner-wrap"><div class="field-group-row field-group-row-with-dividing">${field("公司名称", "<input>")}${field("职务", "<input>")}${field("职务描述", "<textarea></textarea>")}</div><div class="add-more-btn-wrapper"><span class="add-more-btn-link">添加工作经历</span></div></div>`, 14)}</div><section><h2>项目经历</h2>${field("项目名称", "<input>")}</section>`;
    document.querySelector(".add-more-btn-link")!.addEventListener("click", () => {
      const row = document.querySelector(".field-group-row")!.cloneNode(true) as Element;
      row.classList.remove("field-group-row-with-dividing");
      document.querySelector(".add-more-btn-wrapper")!.before(row);
    });
    const scan = collectPageSnapshot(null);
    expect(scan.fields.slice(0, 3).every((f) => f.section === "experiences" && f.rowIndex === 0)).toBe(true);
    expect(scan.fields[3].section).toBe("projects");
    expect(scan.repeaters).toHaveLength(1);
    const repeats = await runRepeaterEngine(scan.repeaters!, { experiences: 2 });
    expect(repeats.diagnostics[0]).toMatchObject({ initial: 1, added: 1, current: 2 });
    const after = collectPageSnapshot(null);
    const result = await applyFillActions(buildFillPlan(profile, after.fields).actions);
    expect(result.filled).toBe(7);
    expect([...document.querySelectorAll("textarea")].map((el) => el.value)).toEqual(["工作甲", "工作乙"]);
    const repeat = await runRepeaterEngine(after.repeaters!, { experiences: 2 });
    expect(repeat.addedRows).toBe(0);
  });

  it("verifies UXCore single selection without including its hidden placeholder", async () => {
    document.body.innerHTML = `<div class="kuma-select2" data-aijianli-field-id="degree"><div role="combobox" aria-expanded="false" aria-controls="degree-options"><div class="kuma-select2-selection__rendered"><div class="kuma-select2-selection__placeholder">请选择</div><div class="kuma-select2-selection-selected-value" style="display:none"></div></div><input></div></div><div id="degree-options" role="listbox" hidden><div role="option">本科</div></div>`;
    const combo = document.querySelector('[role="combobox"]')!;
    const popup = document.getElementById("degree-options")!;
    combo.addEventListener("click", () => {
      combo.setAttribute("aria-expanded", "true");
      popup.hidden = false;
    });
    document.querySelector('[role="option"]')!.addEventListener("click", () => {
      document.querySelector<HTMLElement>(".kuma-select2-selection__placeholder")!.style.display = "none";
      const selected = document.querySelector<HTMLElement>(".kuma-select2-selection-selected-value")!;
      selected.textContent = "本科";
      selected.style.display = "block";
      combo.setAttribute("aria-expanded", "false");
      popup.hidden = true;
    });
    const actions = [{ fieldId: "degree", value: "本科", context: "学历", controlKind: "generic-select" as const }];
    expect(await applyFillActions(actions)).toMatchObject({ filled: 1, failedCount: 0 });
    expect(await applyFillActions(actions)).toMatchObject({ filled: 0, alreadyFilled: 1, failedCount: 0 });
  });

  it("keeps telemetry control counts separate from deduplicated display labels", async () => {
    document.body.innerHTML =
      "<label>姓名<input readonly></label><label>姓名<input readonly></label><label>未知项<input></label><label>未知项<input></label>";
    const scan = collectPageSnapshot(null);
    const plan = buildFillPlan(profile, scan.fields);
    expect(plan.unmatchedCount).toBe(2);
    expect(plan.unmatched).toHaveLength(1);
    const result = await applyFillActions(plan.actions);
    expect(result.failedCount).toBe(2);
    expect(result.failed).toHaveLength(1);
    const emptyProfilePlan = buildFillPlan({}, scan.fields);
    expect(emptyProfilePlan.missingProfileCount).toBe(2);
    expect(emptyProfilePlan.missingProfile).toHaveLength(1);
  });

  it("can serialize scan and fill functions without module-scope dependencies", async () => {
    document.body.innerHTML = "<label>姓名<input></label>";
    const scan = new Function(
      "return (" + collectPageSnapshot.toString() + ")",
    )() as typeof collectPageSnapshot;
    const fill = new Function(
      "return (" + applyFillActions.toString() + ")",
    )() as typeof applyFillActions;
    const result = await fill(
      buildFillPlan(profile, scan(null).fields).actions,
    );
    expect(result.filled).toBe(1);
  });

  it("uses nearby labels and sections instead of matching every name to the applicant", async () => {
    document.body.innerHTML = `<section><h2>个人信息</h2>${field("姓名", '<input name="name" placeholder="请输入">')}${field("手机", '<input placeholder="请输入">')}</section>
      <section><h2>项目经历</h2><div class="resume-item">${field("项目名称", '<input name="name" placeholder="请输入">')}${field("职责描述", '<textarea placeholder="请输入"></textarea>')}</div></section>`;
    const scan = collectPageSnapshot(null);
    const plan = buildFillPlan(profile, scan.fields);
    const result = await applyFillActions(plan.actions);
    expect(result.filled).toBe(4);
    expect(
      [
        ...document.querySelectorAll<HTMLInputElement>('input[name="name"]'),
      ].map((el) => el.value),
    ).toEqual(["测试用户", "项目甲"]);
    expect(scan.fields.every((f) => f.labelSource === "nearby")).toBe(true);
  });

  it("keeps work records aligned when a field is absent from the first record", async () => {
    document.body.innerHTML = `<section><h2>工作经历</h2>
      <div class="resume-item">${field("职务", "<input>")}${field("职务描述", "<textarea></textarea>")}</div>
      <div class="resume-item">${field("公司名称", "<input>")}${field("职务", "<input>")}</div></section>`;
    const scan = collectPageSnapshot(null);
    const company = scan.fields.find((f) => f.context === "公司名称")!;
    expect(company.rowIndex).toBe(1);
    const plan = buildFillPlan(profile, scan.fields);
    expect(plan.actions.find((a) => a.fieldId === company.fieldId)?.value).toBe(
      "公司乙",
    );
    await applyFillActions(plan.actions);
    expect(document.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe(
      "工作甲",
    );
  });

  it("discovers a repeatable group and adds rows without company-specific rules", async () => {
    document.body.innerHTML = `<section><h2>工作经历</h2><div class="resume-item">${field("公司名称", "<input>")}${field("职务", "<input>")}</div><button type="button">添加工作经历</button></section>`;
    document.querySelector("button")!.addEventListener("click", () => {
      const row = document
        .querySelector(".resume-item")!
        .cloneNode(true) as Element;
      row.removeAttribute("data-aijianli-record");
      document.querySelector("button")!.before(row);
    });
    const before = collectPageSnapshot(null);
    expect(before.repeaters).toHaveLength(1);
    const summary = await runRepeaterEngine(before.repeaters!, {
      experiences: 2,
    });
    expect(summary.diagnostics[0]).toMatchObject({ added: 1, current: 2 });
    const after = collectPageSnapshot(null);
    const result = await applyFillActions(
      buildFillPlan(profile, after.fields).actions,
    );
    expect(result.filled).toBe(4);
  });

  it("selects an asynchronously rendered portal option and ignores unrelated options", async () => {
    document.body.innerHTML = `<section><h2>个人信息</h2>${field("当前城市", '<div role="combobox" aria-controls="city-options" aria-expanded="false">请选择</div>')}</section><div role="listbox"><div role="option">深圳</div></div><div id="city-options" role="listbox" hidden></div>`;
    const combo = document.querySelector<HTMLElement>('[role="combobox"]')!;
    combo.addEventListener("click", () => {
      setTimeout(() => {
        const list = document.getElementById("city-options")!;
        list.hidden = false;
        list.innerHTML = '<div role="option">深圳</div>';
        list.firstElementChild!.addEventListener("click", () => {
          combo.textContent = "深圳";
          combo.setAttribute("aria-expanded", "false");
          list.hidden = true;
        });
      }, 20);
    });
    const scan = collectPageSnapshot(null);
    expect(scan.fields).toHaveLength(1);
    const result = await applyFillActions([
      {
        fieldId: scan.fields[0].fieldId,
        value: "深圳",
        controlKind: "generic-select",
      },
    ]);
    expect(result.filled).toBe(1);
    expect(combo.textContent).toBe("深圳");
  });

  it("discovers an unfamiliar record class from its field structure", async () => {
    document.body.innerHTML = `<section><h2>工作经历</h2><div class="unknown-record-v3">${field("公司名称", "<input>")}${field("职务", "<input>")}</div><button type="button">添加工作经历</button></section>`;
    const scan = collectPageSnapshot(null);
    expect(scan.repeaters).toHaveLength(1);
    expect(scan.fields.map((item) => item.rowIndex)).toEqual([0, 0]);
  });

  it("does not report a search query as a successful selection", async () => {
    document.body.innerHTML = field(
      "学校",
      '<div role="combobox"><input></div>',
    );
    const scan = collectPageSnapshot(null);
    expect(scan.fields).toHaveLength(1);
    const result = await applyFillActions([
      {
        fieldId: scan.fields[0].fieldId,
        value: "示例大学",
        controlKind: "generic-select",
      },
    ]);
    expect(result.filled).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(document.querySelector<HTMLInputElement>("input")!.value).toBe("");
  });

  it("preserves existing values and detects a framework reverting the fill", async () => {
    document.body.innerHTML =
      '<label>姓名<input value="已有姓名"></label><label>手机<input></label>';
    const phone = document.querySelectorAll("input")[1];
    phone.addEventListener("input", () => {
      setTimeout(() => {
        phone.value = "";
      }, 10);
    });
    const result = await applyFillActions(
      buildFillPlan(profile, collectPageSnapshot(null).fields).actions,
    );
    expect(result.alreadyFilled).toBe(1);
    expect(result.filled).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(document.querySelector<HTMLInputElement>("input")!.value).toBe(
      "已有姓名",
    );
  });

  it("skips third-party personal contexts and hidden, password and consent controls", () => {
    document.body.innerHTML = `<section><h2>紧急联系人</h2><label>姓名<input></label><label>手机<input></label></section><div hidden><label>姓名<input></label></div><label>姓名<input type="password"></label><label>同意条款<input type="checkbox"></label>`;
    const scan = collectPageSnapshot(null);
    expect(scan.fields).toHaveLength(2);
    const plan = buildFillPlan(profile, scan.fields);
    expect(plan.actions).toHaveLength(0);
    expect(plan.unmatched).toHaveLength(2);
  });

  it("reports unsupported readonly dates instead of excluding them from coverage", () => {
    document.body.innerHTML =
      '<section><h2>工作经历</h2><label>开始日期<input readonly placeholder="开始日期"></label></section>';
    const scan = collectPageSnapshot(null);
    expect(scan.fields[0]).toMatchObject({
      section: "experiences",
      controlKind: "unsupported",
    });
    const plan = buildFillPlan(
      { experiences: [{ startDate: "2020-01" }] },
      scan.fields,
    );
    expect(plan.actions[0].controlKind).toBe("unsupported");
  });

  it("fills a native radio group even though its input has a nonempty value attribute", async () => {
    document.body.innerHTML =
      '<fieldset><legend>性别</legend><label>男<input type="radio" name="sex" value="male"></label><label>女<input type="radio" name="sex" value="female"></label></fieldset>';
    const plan = buildFillPlan(
      { personal: { gender: "女" } },
      collectPageSnapshot(null).fields,
    );
    const result = await applyFillActions(plan.actions);
    expect(result.filled).toBe(1);
    expect(
      document.querySelector<HTMLInputElement>('input[value="female"]')!
        .checked,
    ).toBe(true);
  });
});

describe("existing adapter compatibility", () => {
  it("maps Tencent end dates to their own jobs when the current job omits an end control", () => {
    document.body.innerHTML = `<div class="resume-content"><div class="experience-message"><div class="create-empirical"><input id="company"></div><div class="create-empirical"><input id="company"><div class="resume-module-right end-time"><div class="el-select"><input class="el-input__inner"></div></div></div><div class="create-empirical"><input id="company"><div class="end-time-module"></div></div></div></div>`;
    const scan = collectPageSnapshot(getSiteAdapter("careers.tencent.com"));
    const ends = scan.fields.filter((f) => f.context === "工作结束时间");
    expect(ends.map((f) => f.rowIndex)).toEqual([1, 2]);
    expect(ends.every((f) => f.controlKind === "year-month")).toBe(true);
    const plan = buildFillPlan({ experiences: [{ company: "当前公司" }, { company: "上家公司", endDate: "2023-02" }, { company: "更早公司", endDate: "2018-06" }] }, scan.fields);
    expect(plan.actions.filter((a) => a.context === "工作结束时间").map((a) => a.value)).toEqual(["2023-02", "2018-06"]);
  });

  it("keeps Tencent compound controls exclusive and respects its form boundary", () => {
    document.body.innerHTML = `<input aria-label="姓名"><div class="resume-content"><div class="create-empirical"><input id="company"><div class="start-time-module"><div class="resume-module-left"><div class="el-select"><input class="el-input__inner"></div><div class="el-select"><input class="el-input__inner"></div></div><div class="resume-module-right end-time"></div></div></div></div>`;
    const scan = collectPageSnapshot(getSiteAdapter("careers.tencent.com"));
    expect(
      scan.fields.map((field) => [field.context, field.controlKind]),
    ).toEqual([
      ["公司名称", "native"],
      ["工作开始时间", "year-month"],
      ["工作结束时间", "year-month"],
    ]);
  });

  it("retains JD readonly-date handling and explicit labels", () => {
    document.body.innerHTML =
      '<input id="birthday" readonly placeholder="请选择"><input id="name" placeholder="请输入"><div class="selectMonth"><select><option>一月</option></select></div>';
    const scan = collectPageSnapshot(getSiteAdapter("zhaopin.jd.com"));
    expect(
      scan.fields.map((field) => [field.context, field.controlKind]),
    ).toEqual([
      ["出生日期", "readonly-date"],
      ["姓名", "native"],
    ]);
  });
});
