// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
vi.mock('../../lib/analytics', () => ({trackExtensionEvent: vi.fn()}));
let root: Root | undefined;
afterEach(async () => {if (root) await act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals();});

it('clears the old application immediately and drops a late fill response after a tab switch', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let activated = () => {};
  let page = {tabId: 1, url: 'https://tencent.example/resume'};
  let resolveFill!: (value: unknown) => void;
  const sendMessage = vi.fn(async ({type}: {type: string}) => {
    if (type === 'fill') return new Promise(resolve => {resolveFill = resolve;});
    return {page, connected: true, onboardingAccepted: true, autoConnectEnabled: true, application: page.tabId === 1 ? {id: 'one', jobTitle: '腾讯记录', companyName: '腾讯', status: 'DRAFT'} : null};
  });
  vi.stubGlobal('browser', {
    runtime: {sendMessage, getURL: (path: string) => path},
    permissions: {request: async () => true},
    tabs: {onActivated: {addListener: (f: () => void) => {activated = f;}, removeListener: vi.fn()}, onUpdated: {addListener: vi.fn(), removeListener: vi.fn()}},
  });
  const container = document.createElement('div'); document.body.append(container);
  await act(async () => {root = createRoot(container); root.render(<App/>);});
  expect(container.textContent).toContain('腾讯记录');
  const fill = [...container.querySelectorAll('button')].find(b => b.textContent === '一键填写此页面')!;
  await act(async () => {fill.click();});
  expect(sendMessage).toHaveBeenCalledWith({type: 'fill', page});
  page = {tabId: 2, url: 'https://taotian.example/resume'};
  await act(async () => {activated();});
  expect(container.textContent).not.toContain('腾讯记录');
  await act(async () => {resolveFill({filled: 3, alreadyFilled: 0, failed: [], unmatched: [], missingProfile: []});});
  expect(container.textContent).not.toContain('填写结果');
  expect(container.textContent).not.toContain('我已完成投递');
});

it.each([false, true])('asks before first-day filling and remembers only when checked (%s)', async remember => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const page = {tabId: 1, url: 'https://careers.example/resume'};
  let activated = () => {};
  let activePage = page;
  const sendMessage = vi.fn(async (message: {type: string; datePolicy?: string}) => {
    if (message.type === 'fill') return {filled: message.datePolicy ? 1 : 0, alreadyFilled: 0, failed: [], unmatched: [], missingProfile: [], controlMetrics: message.datePolicy ? {dateCompletionAppliedCount: 1} : {controlDatePrecisionMissingCount: 2}};
    return {page: activePage, connected: true, onboardingAccepted: true, datePolicy: 'ask', application: null};
  });
  vi.stubGlobal('browser', {
    runtime: {sendMessage, getURL: (path: string) => path},
    permissions: {request: async () => true},
    tabs: {onActivated: {addListener: (f: () => void) => {activated = f;}, removeListener: vi.fn()}, onUpdated: {addListener: vi.fn(), removeListener: vi.fn()}},
  });
  const container = document.createElement('div'); document.body.append(container);
  await act(async () => {root = createRoot(container); root.render(<App/>);});
  const button = (label: string) => [...container.querySelectorAll('button')].find(b => b.textContent === label)!;
  await act(async () => {button('一键填写此页面').click();});
  expect(container.textContent).toContain('这些日期需要你确认');
  expect(sendMessage).toHaveBeenCalledWith({type: 'fill', page});
  expect(sendMessage.mock.calls.filter(([m]) => m.datePolicy)).toHaveLength(0);
  if (remember) await act(async () => {container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();});
  await act(async () => {button('使用当月1日继续填写').click();});
  expect(sendMessage).toHaveBeenCalledWith({type: 'fill', page, datePolicy: 'first-day', rememberDatePolicy: remember});
  expect(container.textContent).toContain('将 1 个日期补为当月1日');
  await act(async () => {button('一键填写此页面').click();});
  const staleConfirmation = button('使用当月1日继续填写');
  activePage = {tabId: 2, url: 'https://other.example/resume'};
  await act(async () => {activated();});
  expect(container.textContent).not.toContain('这些日期需要你确认');
  const calls = sendMessage.mock.calls.length;
  await act(async () => {staleConfirmation.click();});
  expect(sendMessage.mock.calls).toHaveLength(calls);
});
