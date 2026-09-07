// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectPageSnapshot } from "./page-scanner";
import { applyFillActions } from "./fill-executor";
import { buildFillPlan } from "./mapping";
import { runRepeaterEngine } from "./repeater-engine";

beforeEach(() => {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(() => [{}] as unknown as DOMRectList);
});
afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

const dateFixture = (commit: boolean) => {
  document.body.innerHTML = `<label>开始日期<span class="kuma-calendar-picker-input"><input readonly></span></label><div class="kuma-calendar" hidden><input class="kuma-calendar-input"></div>`;
  const input = document.querySelector<HTMLInputElement>('input')!;
  const panel = document.querySelector<HTMLElement>('.kuma-calendar')!;
  const editor = panel.querySelector('input')!;
  input.addEventListener('click', () => { panel.hidden = false; });
  input.addEventListener('keydown', (event) => { if (event.key === 'Escape') panel.hidden = true; });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && commit) { input.value = editor.value; panel.hidden = true; }
  });
  const scan = collectPageSnapshot(null);
  return { input, panel, editor, action: { fieldId: scan.fields[0].fieldId, context: '开始日期', controlKind: scan.fields[0].controlKind, value: '2020-03' } };
};

describe('generic component drivers', () => {
  it('detects and commits readonly dates through the calendar editor, then preserves existing data', async () => {
    const { input, action } = dateFixture(true);
    expect(action.controlKind).toBe('popup-date');
    expect(await applyFillActions([action])).toMatchObject({ filled: 1, failedCount: 0, controlMetrics: { popupDateAttemptCount: 1, popupDateFilledCount: 1 } });
    expect(input.value).toBe('2020-03');
    expect(await applyFillActions([action])).toMatchObject({ alreadyFilled: 1, filled: 0, controlMetrics: { popupDateExistingCount: 1 } });
  });

  it('does not count an uncommitted calendar search/input as a successful date', async () => {
    const { input, editor, action } = dateFixture(false);
    expect(await applyFillActions([action])).toMatchObject({ filled: 0, failedCount: 1, controlMetrics: { popupDateFailedCount: 1 } });
    expect(input.value).toBe('');
    expect(editor.value).toBe('');
  });

  it.each(['2023-02-29', '2024-13', '至今'])('rejects invalid or unspecified date %s without opening a popup', async (value) => {
    const { input, action } = dateFixture(true);
    const click = vi.spyOn(input, 'click');
    expect(await applyFillActions([{ ...action, value }])).toMatchObject({ filled: 0, failedCount: 1 });
    expect(click).not.toHaveBeenCalled();
  });

  it('clicks an exact full-date cell, not an unrelated visible calendar or same day number', async () => {
    document.body.innerHTML = `<div class="ant-picker"><input readonly></div><div class="ant-picker-dropdown"><table><tr><td title="2024-02-29">29</td></tr></table></div><div class="ant-picker-dropdown" hidden id="own"><table><tr><td title="2024-01-29">29</td><td title="2024-02-29">29</td></tr></table></div>`;
    const input = document.querySelector('input')!;
    const own = document.getElementById('own')!;
    input.addEventListener('click', () => { own.hidden = false; });
    own.querySelector('[title="2024-02-29"]')!.addEventListener('click', () => { input.value = '2024-02-29'; own.hidden = true; });
    const unrelated = vi.fn();
    document.querySelector('.ant-picker-dropdown')!.addEventListener('click', unrelated);
    const field = collectPageSnapshot(null).fields[0];
    expect(await applyFillActions([{ ...field, value: '2024-02-29' }])).toMatchObject({ filled: 1 });
    expect(unrelated).not.toHaveBeenCalled();
  });

  it('does not select a disabled date', async () => {
    document.body.innerHTML = `<span class="rc-calendar-picker"><input readonly></span><div class="rc-calendar" hidden><table><tr><td title="2024-02-29" class="rc-calendar-disabled-cell">29</td></tr></table></div>`;
    document.querySelector('input')!.addEventListener('click', () => { document.querySelector<HTMLElement>('.rc-calendar')!.hidden = false; });
    const click = vi.fn();
    document.querySelector('td')!.addEventListener('click', click);
    const field = collectPageSnapshot(null).fields[0];
    expect(await applyFillActions([{ ...field, value: '2024-02-29' }])).toMatchObject({ filled: 0, failedCount: 1 });
    expect(click).not.toHaveBeenCalled();
  });

  const cascadeFixture = () => {
    document.body.innerHTML = `<label>期望工作城市<div class="ant-cascader"><input readonly role="combobox" aria-controls="cities"></div></label><div class="ant-cascader-menus" id="cities" hidden><ul class="ant-cascader-menu"><li class="ant-cascader-menu-item"><span class="ant-cascader-menu-item-content">广东省</span></li></ul></div>`;
    const input = document.querySelector('input')!;
    const panel = document.getElementById('cities')!;
    input.addEventListener('click', () => { panel.hidden = false; });
    input.addEventListener('keydown', (event) => { if (event.key === 'Escape') panel.hidden = true; });
    panel.querySelector('li')!.addEventListener('click', () => {
      setTimeout(() => {
        const column = document.createElement('ul');
        column.className = 'ant-cascader-menu';
        column.innerHTML = '<li class="ant-cascader-menu-item"><span class="ant-cascader-menu-item-content">深圳市</span></li>';
        column.querySelector('li')!.addEventListener('click', () => { input.value = '广东省 / 深圳市'; panel.hidden = true; });
        panel.append(column);
      }, 30);
    });
    const scan = collectPageSnapshot(null);
    expect(scan.fields).toHaveLength(1);
    expect(scan.fields[0].controlKind).toBe('cascader');
    return { input, panel, field: scan.fields[0] };
  };

  it('selects an explicit city path through asynchronously loaded columns', async () => {
    const { input, field } = cascadeFixture();
    const plan = buildFillPlan({ jobPreference: { targetCity: '广东省 / 深圳市' } }, [field]);
    expect(plan.actions).toHaveLength(1);
    expect(await applyFillActions(plan.actions)).toMatchObject({ filled: 1, controlMetrics: { cascaderFilledCount: 1 } });
    expect(input.value).toBe('广东省 / 深圳市');
  });

  it('does not infer a province from a city alone', async () => {
    const { input, field } = cascadeFixture();
    const click = vi.spyOn(input, 'click');
    expect(await applyFillActions([{ ...field, value: '深圳市' }])).toMatchObject({ failedCount: 1, filled: 0 });
    expect(click).not.toHaveBeenCalled();
  });

  it('supports Element-style cascader nodes without a site adapter', async () => {
    document.body.innerHTML = `<label>当前城市<div class="el-cascader"><input readonly></div></label><div class="el-cascader__dropdown" hidden><ul class="el-cascader-menu"><li class="el-cascader-node"><span class="el-cascader-node__label">浙江省</span></li></ul><ul class="el-cascader-menu" hidden><li class="el-cascader-node"><span class="el-cascader-node__label">杭州市</span></li></ul></div>`;
    const input = document.querySelector('input')!;
    const panel = document.querySelector<HTMLElement>('.el-cascader__dropdown')!;
    document.querySelector('.el-cascader')!.addEventListener('click', () => { panel.hidden = false; });
    const columns = panel.querySelectorAll<HTMLElement>('ul');
    columns[0].querySelector('li')!.addEventListener('click', () => { columns[1].hidden = false; });
    columns[1].querySelector('li')!.addEventListener('click', () => { input.value = '浙江省 / 杭州市'; panel.hidden = true; });
    const field = collectPageSnapshot(null).fields[0];
    expect(await applyFillActions([{ ...field, value: '浙江省 / 杭州市' }])).toMatchObject({ filled: 1 });
  });

  it('keeps diagnostic metrics free of field labels, profile values and page text', async () => {
    const { field } = cascadeFixture();
    const result = await applyFillActions([{ ...field, context: '用户私密字段', value: '用户私密内容' }]);
    expect(result.controlMetrics).toEqual({ cascaderAttemptCount: 1, controlInvalidValueCount: 1, cascaderFailedCount: 1 });
    expect(JSON.stringify(result.controlMetrics)).not.toContain('私密');
  });

  it('stops on ambiguous cascade options and reports no false success', async () => {
    const { panel, field } = cascadeFixture();
    panel.querySelector('ul')!.append(panel.querySelector('li')!.cloneNode(true));
    const click = vi.fn();
    panel.addEventListener('click', click);
    expect(await applyFillActions([{ ...field, value: '广东省 / 深圳市' }])).toMatchObject({ failedCount: 1, filled: 0 });
    expect(click).not.toHaveBeenCalled();
  });

  it('serializes the new drivers without module scope dependencies', async () => {
    const { action } = dateFixture(true);
    const isolated = new Function('return (' + applyFillActions.toString() + ')')() as typeof applyFillActions;
    expect(await isolated([action])).toMatchObject({ filled: 1 });
  });
});

describe('safe generic repeaters', () => {
  it('ignores hidden templates when counting records', async () => {
    document.body.innerHTML = '<div hidden><div class="record"></div></div><div class="record"></div><button type="button">添加工作经历</button>';
    document.querySelector('button')!.addEventListener('click', () => {
      const row = document.createElement('div'); row.className = 'record'; document.body.append(row);
    });
    const result = await runRepeaterEngine([{ profilePath: 'experiences', rowSelector: '.record', addButtonSelectors: ['button'], renderTimeoutMs: 20 }], { experiences: 2 });
    expect(result.diagnostics[0]).toMatchObject({ initial: 1, current: 2, added: 1 });
  });
  it('never clicks submit controls, their descendants, or hidden add buttons', async () => {
    document.body.innerHTML = '<form><button type="submit"><span>添加工作经历</span></button><button><span>新增经历</span></button></form><div hidden><button type="button">添加工作经历</button></div>';
    const click = vi.fn(); document.body.addEventListener('click', click);
    const result = await runRepeaterEngine([{ profilePath: 'experiences', rowSelector: '.record', addButtonSelectors: ['button', 'span'], renderTimeoutMs: 20 }], { experiences: 2 });
    expect(result.diagnostics[0]).toMatchObject({ added: 0, attempts: 0, failureReason: 'button_not_found' });
    expect(click).not.toHaveBeenCalled();
  });
});
