// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyFillActions } from "./fill-executor";

beforeEach(() => { vi.spyOn(Element.prototype, "getClientRects").mockImplementation(() => [{}] as unknown as DOMRectList); });
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

it.each([false, true])("native dates require consent and count only verified completion (%s)", async allowMonthStart => {
  document.body.innerHTML = '<input type="date" data-aijianli-field-id="date">';
  const result = await applyFillActions([{ fieldId: "date", value: "2023-2" }], { allowMonthStart });
  expect(result.filled).toBe(allowMonthStart ? 1 : 0);
  expect(document.querySelector("input")!.value).toBe(allowMonthStart ? "2023-02-01" : "");
  expect(result.controlMetrics.dateCompletionAppliedCount || 0).toBe(allowMonthStart ? 1 : 0);
  expect(result.controlMetrics.controlDatePrecisionMissingCount || 0).toBe(allowMonthStart ? 0 : 1);
});

it.each(["至今", "2023-13", "2023-02-30"])("does not turn invalid or ongoing dates into day values: %s", async value => {
  document.body.innerHTML = '<input type="date" data-aijianli-field-id="date">';
  expect(await applyFillActions([{ fieldId: "date", value }], { allowMonthStart: true })).toMatchObject({ filled: 0 });
  expect(document.querySelector("input")!.value).toBe("");
});

it("keeps existing dates, complete dates and native month precision", async () => {
  document.body.innerHTML = '<input type="date" value="2020-05-19" data-aijianli-field-id="existing"><input type="date" data-aijianli-field-id="full"><input type="month" data-aijianli-field-id="month">';
  const result = await applyFillActions([
    { fieldId: "existing", value: "2023-02" },
    { fieldId: "full", value: "2023-02-17" },
    { fieldId: "month", value: "2023-02" },
  ], { allowMonthStart: true });
  expect(result).toMatchObject({ filled: 2, alreadyFilled: 1 });
  expect([...document.querySelectorAll("input")].map(n => n.value)).toEqual(["2020-05-19", "2023-02-17", "2023-02"]);
  expect(result.controlMetrics.dateCompletionAppliedCount || 0).toBe(0);
});

it.each([true, false])("consented day calendar uses its own editor and verifies commit (%s)", async accepts => {
  document.body.innerHTML = '<span class="kuma-calendar-picker-input"><input readonly data-aijianli-field-id="date"></span><div class="kuma-calendar" hidden><div class="kuma-calendar-date-panel"></div><input class="kuma-calendar-input"></div>';
  const input = document.querySelector("input")!;
  const panel = document.querySelector<HTMLElement>(".kuma-calendar")!;
  const editor = panel.querySelector("input")!;
  input.onclick = () => { panel.hidden = false; };
  editor.onkeydown = e => { if (e.key === "Enter" && accepts) { input.value = editor.value; panel.hidden = true; } };
  const close = () => { panel.hidden = true; };
  document.body.addEventListener("mousedown", close);
  try {
    const result = await applyFillActions([{ fieldId: "date", value: "2023-02", controlKind: "popup-date" }], { allowMonthStart: true });
    expect(result.filled).toBe(accepts ? 1 : 0);
    expect(result.controlMetrics.dateCompletionAppliedCount || 0).toBe(accepts ? 1 : 0);
    expect(input.value).toBe(accepts ? "2023-02-01" : "");
    if (!accepts) expect(editor.value).toBe("");
    expect(panel.hidden).toBe(true);
  } finally { document.body.removeEventListener("mousedown", close); }
});
