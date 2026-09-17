// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { collectPageSnapshot } from "./page-scanner";
import { buildFillPlan } from "./mapping";
import { applyFillActions } from "./fill-executor";

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

it("review fixture uses the real generic engine, preserves existing data and has no submission code", async () => {
  const html = readFileSync(resolve(__dirname, "../../public/extension-review.html"), "utf8");
  document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
  expect(document.querySelector("script, form, [type=submit]")).toBeNull();
  expect(html).toContain("form-action 'none'");
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(() => [{ width: 100, height: 20 }] as unknown as DOMRectList);
  const profile = {
    personal: { fullName: "测试用户", gender: "女" },
    contact: { email: "review@example.com", phone: "13800000000" },
    education: [{ school: "示例大学", major: "计算机科学与技术" }],
  };
  const plan = buildFillPlan(profile, collectPageSnapshot(null).fields);
  const result = await applyFillActions(plan.actions);
  expect(result.failedCount).toBe(0);
  expect(result.filled).toBe(5);
  expect(document.querySelector<HTMLInputElement>('[name=name]')!.value).toBe("已有测试姓名");
  for (const [name, value] of Object.entries({ email: "review@example.com", phone: "13800000000", gender: "女", school: "示例大学", major: "计算机科学与技术" })) {
    expect(document.querySelector<HTMLInputElement>(`[name=${name}]`)!.value).toBe(value);
  }
  expect(document.querySelector<HTMLTextAreaElement>("textarea")!.value).toBe("");
  expect(plan.missingProfileCount).toBe(1);
  const repeated = await applyFillActions(buildFillPlan(profile, collectPageSnapshot(null).fields).actions);
  expect(repeated.filled).toBe(0);
});
