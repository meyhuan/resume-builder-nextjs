// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { collectPageSnapshot } from './page-scanner';
import { getSiteAdapter } from './site-adapters';
import { applyFillActions } from './fill-executor';
import { buildFillPlan } from './mapping';
import { matchingSession, samePage } from './page-session';

beforeEach(() => { vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => [{}] as unknown as DOMRectList); });
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('scans nested Tencent start/end siblings and verifies delayed year/month commits', async () => {
  const picker = (cls: string) => `<div class="${cls}"><div class="select-left">年</div><ul><li class="small-select-li">2023</li></ul><div class="select-right">月</div><ul><li class="splicing-select-li">02</li></ul></div>`;
  document.body.innerHTML = `<div class="resume-content"><div class="experience-message"><div class="create-empirical"><div class="start-time-module">${picker('resume-module-left')}${picker('resume-module-right end-time')}</div></div></div></div>`;
  const fields = collectPageSnapshot(getSiteAdapter('careers.tencent.com')).fields;
  expect(fields.map(f => f.context)).toEqual(['工作开始时间', '工作结束时间']);
  document.querySelectorAll<HTMLElement>('li').forEach(li => li.onclick = () => { setTimeout(() => { li.parentElement!.previousElementSibling!.textContent = li.textContent; }, 20); });
  const result = await applyFillActions(buildFillPlan({experiences: [{startDate: '2023-02', endDate: '2023-02'}]}, fields).actions);
  expect(result).toMatchObject({filled: 2, failedCount: 0});
});

it('does not claim year/month success when page ignores clicks', async () => {
  document.body.innerHTML = '<div data-aijianli-field-id="date"><div class="select-left">年</div><li class="small-select-li">2023</li><div class="select-right">月</div><li class="splicing-select-li">02</li></div>';
  expect(await applyFillActions([{fieldId: 'date', value: '2023-02', context: '结束日期', controlKind: 'year-month'}])).toMatchObject({filled: 0, failedCount: 1});
});

it.each([true, false])('maps school description instead of school name, including missing data (%s)', (hasDescription) => {
  document.body.innerHTML = '<section><h2>教育经历</h2><label>学校经历内容<textarea></textarea></label></section>';
  const plan = buildFillPlan({education: [{school: '测试大学', description: hasDescription ? '学生会活动' : ''}]}, collectPageSnapshot(null).fields);
  expect(plan.actions.map(a => a.value)).toEqual(hasDescription ? ['学生会活动'] : []);
  expect(plan.missingProfileCount).toBe(hasDescription ? 0 : 1);
});

it('leaves month-only dates empty, closes a day calendar by outside mousedown and avoids reopening peers', async () => {
  document.body.innerHTML = '<span class="kuma-calendar-picker-input"><input readonly data-aijianli-field-id="a"></span><span class="kuma-calendar-picker-input"><input readonly data-aijianli-field-id="b"></span><div class="kuma-calendar" hidden><div class="kuma-calendar-date-panel"></div><input class="kuma-calendar-input"></div>';
  const panel = document.querySelector<HTMLElement>('.kuma-calendar')!;
  const opened = vi.fn(() => {panel.hidden = false;});
  document.querySelectorAll('.kuma-calendar-picker-input input').forEach(n => n.addEventListener('click', opened));
  const close = () => {panel.hidden = true;};
  document.body.addEventListener('mousedown', close);
  try {
    expect(await applyFillActions(['a','b'].map(fieldId => ({fieldId, context: '时间', value: '2023-02', controlKind: 'popup-date' as const})))).toMatchObject({filled: 0, failedCount: 2, controlMetrics: {controlDatePrecisionMissingCount: 2}});
    expect(panel.hidden).toBe(true);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(document.querySelector('input')!.value).toBe('');
  } finally {document.body.removeEventListener('mousedown', close);}
});

it('scopes pending applications to tab and exact URL', () => {
  const page = {tabId: 1, url: 'https://careers.example/resume?job=1'};
  const session = {page, application: {id: 'a'}, submitDetected: true};
  expect(matchingSession(session, page)).toBe(session);
  expect(matchingSession(session, {...page, tabId: 2})).toBeNull();
  expect(matchingSession(session, {...page, url: 'https://careers.example/resume?job=2'})).toBeNull();
  expect(samePage(null, page)).toBe(false);
});

it('does not count open calendar editors and selectors as resume fields', () => {
  document.body.innerHTML = '<label>开始日期<span class="kuma-calendar-picker-input"><input readonly></span></label><div class="kuma-calendar"><input class="kuma-calendar-input"><div class="kuma-select2" role="combobox"></div></div><div role="listbox"><input aria-label="搜索"></div>';
  expect(collectPageSnapshot(null).fields).toHaveLength(1);
});

it('waits for a controlled full-date editor to render before confirming', async () => {
  document.body.innerHTML = '<span class="kuma-calendar-picker-input"><input readonly data-aijianli-field-id="date"></span><div class="kuma-calendar" hidden><div class="kuma-calendar-date-panel"></div><input class="kuma-calendar-input"></div>';
  const input = document.querySelector('input')!;
  const panel = document.querySelector<HTMLElement>('.kuma-calendar')!;
  const editor = panel.querySelector('input')!;
  let committed = '';
  input.addEventListener('click', () => {panel.hidden = false;});
  editor.addEventListener('input', () => {setTimeout(() => {committed = editor.value;}, 20);});
  editor.addEventListener('keydown', e => {if (e.key === 'Enter' && committed) {input.value = committed; panel.hidden = true;}});
  expect(await applyFillActions([{fieldId: 'date', value: '2023-02-17', context: '日期', controlKind: 'popup-date'}])).toMatchObject({filled: 1});
  expect(input.value).toBe('2023-02-17');
});

it('waits for debounced remote select options longer than 650ms without accepting the search text', async () => {
  document.body.innerHTML = '<label>期望工作城市<div class="kuma-select2"><div role="combobox" aria-controls="remote" aria-expanded="false"><input></div><span class="kuma-select2-selection__choice"></span></div></label><div class="kuma-select2-dropdown" id="remote" hidden></div>';
  const panel = document.getElementById('remote')!;
  const combo = document.querySelector<HTMLElement>('[role="combobox"]')!;
  const input = document.querySelector('input')!;
  combo.onclick = () => {panel.hidden = false; combo.setAttribute('aria-expanded', 'true');};
  input.addEventListener('input', () => {setTimeout(() => {
    const option = document.createElement('div'); option.setAttribute('role', 'option'); option.textContent = '武汉';
    option.onclick = () => {document.querySelector('.kuma-select2-selection__choice')!.textContent = '武汉'; input.value = ''; panel.hidden = true; combo.setAttribute('aria-expanded', 'false');};
    panel.replaceChildren(option);
  }, 950);});
  const fields = collectPageSnapshot(null).fields;
  expect(await applyFillActions(buildFillPlan({jobPreference: {targetCity: '武汉'}}, fields).actions)).toMatchObject({filled: 1, failedCount: 0});
});
