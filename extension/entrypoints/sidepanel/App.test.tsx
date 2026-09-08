// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
vi.mock('../../lib/analytics', () => ({trackExtensionEvent: vi.fn()}));
let root: Root | undefined;
afterEach(async () => {if (root) await act(() => root!.unmount()); root = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.useRealTimers();});

async function mountPageState(initial: Record<string, unknown>, granted = true) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let state: Record<string, unknown> = { connected:true, onboardingAccepted:true, autoConnectEnabled:true, application:null, ...initial };
  const sendMessage = vi.fn(async () => state);
  const request = vi.fn(async () => {
    if (granted) state = {...state, page:{tabId:7,url:'https://talent.taotian.com/personal/social-resume'}, pageIssue:null};
    return granted;
  });
  const event = {addListener:vi.fn(),removeListener:vi.fn()};
  vi.stubGlobal('browser', {runtime:{sendMessage,getURL:(path:string)=>path}, permissions:{request}, tabs:{onActivated:event,onUpdated:event}});
  const container = document.createElement('div'); document.body.append(container);
  await act(async () => {root=createRoot(container); root.render(<App/>);});
  const button = (text:string) => [...container.querySelectorAll('button')].find(b=>b.textContent===text)!;
  return {container, button, sendMessage, request};
}

it('offers permission recovery before filling when URL is redacted; recovery never auto-fills', async () => {
  const {container,button,request,sendMessage}=await mountPageState({page:null,pageIssue:'site_access_required'});
  expect(button('一键填写此页面').disabled).toBe(true);
  expect(container.textContent).toContain('尚无法读取当前页面地址');
  expect(request).not.toHaveBeenCalled();
  await act(async()=>{button('授权并重新检测').click();});
  expect(request).toHaveBeenCalledTimes(1);
  expect(button('一键填写此页面').disabled).toBe(false);
  expect(container.textContent).not.toContain('尚无法读取当前页面地址');
  expect(sendMessage.mock.calls.every(call => (call as unknown as [{type:string}])[0].type !== 'fill')).toBe(true);
});

it('keeps denial guidance visible across status polls and permits retry', async () => {
  vi.useFakeTimers();
  const {container,button,request}=await mountPageState({page:null,pageIssue:'site_access_required'},false);
  await act(async()=>{button('授权并重新检测').click();});
  expect(container.textContent).toContain('未获得网页访问权限，尚未填写任何内容');
  await act(async()=>{await vi.advanceTimersByTimeAsync(1600);});
  expect(container.textContent).toContain('未获得网页访问权限，尚未填写任何内容');
  expect(button('一键填写此页面').disabled).toBe(true);
  await act(async()=>{button('授权并重新检测').click();});
  expect(request).toHaveBeenCalledTimes(2);
});

it('does not issue duplicate permission requests while the user is deciding', async () => {
  const {button,request,sendMessage}=await mountPageState({page:null,pageIssue:'site_access_required'});
  let finish!: (value:boolean)=>void;
  request.mockImplementationOnce(()=>new Promise<boolean>(resolve=>{finish=resolve;}));
  const recovery=button('授权并重新检测');
  await act(async()=>{recovery.click();recovery.click();});
  expect(request).toHaveBeenCalledTimes(1);
  expect(recovery.disabled).toBe(true);
  expect(button('一键填写此页面').disabled).toBe(true);
  await act(async()=>{finish(false);});
  expect(button('授权并重新检测').disabled).toBe(false);
  expect(sendMessage.mock.calls.every(call=>(call as unknown as [{type:string}])[0].type!=='fill')).toBe(true);
});

it('does not fill the old or new tab when the tab changes while permission is pending', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let page={tabId:1,url:'https://careers.example/resume'};
  let activate=()=>{};
  let finish!: (value:boolean)=>void;
  const sendMessage=vi.fn(async()=>({page,connected:true,onboardingAccepted:true,application:null}));
  vi.stubGlobal('browser',{
    runtime:{sendMessage,getURL:(path:string)=>path},
    permissions:{request:()=>new Promise<boolean>(resolve=>{finish=resolve;})},
    tabs:{onActivated:{addListener:(fn:()=>void)=>{activate=fn;},removeListener:vi.fn()},onUpdated:{addListener:vi.fn(),removeListener:vi.fn()}},
  });
  const container=document.createElement('div');document.body.append(container);
  await act(async()=>{root=createRoot(container);root.render(<App/>);});
  const fill=()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='一键填写此页面')!;
  await act(async()=>{fill().click();});
  page={tabId:2,url:'https://other-careers.example/resume'};
  await act(async()=>{activate();});
  await act(async()=>{finish(true);});
  expect(sendMessage.mock.calls.every(call=>(call as unknown as [{type:string}])[0].type!=='fill')).toBe(true);
  expect(container.textContent).not.toContain('填写结果');
  expect(fill().disabled).toBe(false);
});

it('recovers automatically after the recruiting page finishes loading', async () => {
  vi.useFakeTimers();
  const {container,button,sendMessage,request}=await mountPageState({page:null,pageIssue:'page_loading'});
  sendMessage.mockResolvedValue({connected:true,onboardingAccepted:true,page:{tabId:1,url:'https://careers.example/resume'},pageIssue:null});
  await act(async()=>{await vi.advanceTimersByTimeAsync(1500);});
  expect(container.textContent).not.toContain('当前页面正在加载');
  expect(button('一键填写此页面').disabled).toBe(false);
  expect(request).not.toHaveBeenCalled();
});

it.each([
  ['unsupported_page','受限制页面'],['no_active_tab','没有找到当前标签页'],
  ['page_loading','当前页面正在加载'],['page_unavailable','暂时无法检测当前页面'],
])('explains %s and retries without asking unnecessary permissions', async (pageIssue, copy) => {
  const {container,button,request}=await mountPageState({page:null,pageIssue});
  expect(container.textContent).toContain(copy);
  expect(button('一键填写此页面').disabled).toBe(true);
  await act(async()=>{button('重新检测当前页面').click();});
  expect(request).not.toHaveBeenCalled();
});

it('surfaces a rejected status request and recovers without leaving a stale enabled fill', async () => {
  vi.useFakeTimers();
  const {container,button,sendMessage}=await mountPageState({page:{tabId:1,url:'https://careers.example/resume'}});
  sendMessage.mockRejectedValueOnce(new Error('worker disconnected'));
  await act(async()=>{await vi.advanceTimersByTimeAsync(1500);});
  expect(container.textContent).toContain('插件状态检测失败');
  expect(button('一键填写此页面').disabled).toBe(true);
  await act(async()=>{button('重新检测当前页面').click();});
  expect(button('一键填写此页面').disabled).toBe(false);
});

it('times out a hung initial status check and displays a retry instead of an endless spinner', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const event={addListener:vi.fn(),removeListener:vi.fn()};
  vi.stubGlobal('browser',{runtime:{sendMessage:()=>new Promise(()=>{}),getURL:(p:string)=>p},tabs:{onActivated:event,onUpdated:event}});
  const container=document.createElement('div');document.body.append(container);
  await act(async()=>{root=createRoot(container);root.render(<App/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(12001);});
  expect(container.textContent).toContain('插件状态检测失败');
  expect(container.textContent).toContain('重新检测插件状态');
});

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
