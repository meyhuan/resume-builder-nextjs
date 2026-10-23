import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { transferableAbortController } from 'node:util';
vi.mock('server-only', () => ({}));
vi.mock('openai', async (importOriginal) => {
  const original = await importOriginal<typeof import('openai')>();
  return { ...original, default: class extends original.default {
    constructor(options: ConstructorParameters<typeof original.default>[0]) {
      super({ ...options, dangerouslyAllowBrowser: true });
    }
  } };
});
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => {}) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/ai/assist-client', () => ({ refreshEditorAssistQuota: vi.fn() }));
import { UnifiedAssistant } from './unified-assistant';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { runAssistant, createJsonRunner } from '@/lib/ai/unified/engine';
import { getDefaultModel } from '@/lib/ai/ai-runtime-config';
import type { ResumeData } from '@/entities/resume/resume-data';

it.skipIf(process.env.AI_LIVE_EVAL !== '1')('real model: clicks apply and next through duplicate labels, skips blank, and stops without cycling', async () => {
  const nativeController = transferableAbortController();
  vi.stubGlobal('AbortController', nativeController.constructor);
  vi.stubGlobal('AbortSignal', nativeController.signal.constructor);
  const resume = { id: 'relay-live', name: '合成验收', sections: [
    { id: 'work', title: '工作经历', blocks: [{ id: 'w', type: 'text', html: '<p>在软件公司实习，负责使用 JavaScript 维护内部管理页面，根据设计稿调整表单样式，与后端同事联调接口，记录并修复测试反馈的问题。</p>' }] },
    { id: 'projects', title: '项目经历', blocks: [
      { id: 'empty', type: 'text', html: '<p><br></p>' },
      { id: 'p1', type: 'text', html: '<p>校园借书系统课程项目，我负责用 JavaScript 编写图书查询和借阅表单，后端由同学完成，与同学联调并修复表单校验问题。</p>' },
      { id: 'p2', type: 'text', html: '<p>社团报名网站课程项目，我负责使用 JavaScript 实现报名页面，整理用户填写的信息，与负责后端的同学联调提交接口，测试并修复重复提交问题。</p>' },
    ] },
    { id: 'summary', title: '自我评价', blocks: [{ id: 's', type: 'text', html: '<p>具备 JavaScript 页面开发经验，参与过表单开发和接口联调，愿意根据测试反馈修复问题，能够与同学配合完成课程项目。</p>' }] },
  ] } as ResumeData;
  const task = { id: crypto.randomUUID(), resumeId: resume.id, feature: 'polish' as const, entry: 'module' as const, blockId: 'w', label: '工作经历' };
  useAppStore.setState({ resume, readOnly: false, pastStates: [], futureStates: [] });
  useEditorUiStore.setState({ assistantTask: task, assistantResumeId: resume.id, assistantBusy: false, activePanel: 'ai', pendingAiMessage: null });
  Element.prototype.scrollIntoView = vi.fn();
  const originalFetch = globalThis.fetch;
  const calls: { blockId: string; reviewed: string[]; turn: unknown }[] = [];
  const report: Record<string, unknown> = { model: getDefaultModel().name, calls, fixture: 'synthetic, rendered React UI, real model, NDJSON parser, in-memory apply; no DB or quota writes' };
  mkdirSync('test-artifacts/unified-relay', { recursive: true });
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, options?: RequestInit) => {
    if (url !== '/next-api/ai/chat/task') {
      // jsdom's AbortSignal is not accepted by Node's real fetch.
      const NativeSignal = new Request('http://localhost').signal.constructor as typeof AbortSignal;
      return originalFetch(url, { ...options, signal: NativeSignal.timeout(150000) });
    }
    const body = JSON.parse(options!.body as string);
    report.pendingBlock = body.task.blockId;
    writeFileSync('test-artifacts/unified-relay/live.json', JSON.stringify(report, null, 2));
    const turn = await runAssistant({ ...body, resume: body.resumeData, allowDirect: false,
      run: createJsonRunner({ provider: 'dashscope', model: '', apiKey: '', baseURL: '' }, AbortSignal.timeout(150000)), charge: async () => {},
    });
    calls.push({ blockId: body.task.blockId, reviewed: body.reviewedBlockIds, turn });
    writeFileSync('test-artifacts/unified-relay/live.json', JSON.stringify(report, null, 2));
    return new Response(JSON.stringify({ type: 'result', requestId: body.requestId, turn }) + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
  });
  try {
    render(<UnifiedAssistant resumeId={resume.id} onLegacy={() => {}} />);
    for (let index = 0; index < 4; index++) {
      await waitFor(() => expect(
        screen.queryByRole('button', { name: '应用这一处' }) || screen.queryByRole('alert') || screen.queryByText(/问题 1/),
      ).toBeTruthy(), { timeout: 150000 });
      expect(screen.queryByRole('alert')?.textContent || '').toBe('');
      const apply = screen.getByRole('button', { name: '应用这一处' });
      expect(screen.queryByRole('button', { name: /继续优化下一段/ })).toBeNull();
      fireEvent.click(apply);
      await waitFor(() => expect(screen.queryByText('原文已变化，请重新生成')).toBeNull());
      if (index < 3) {
        const next = await screen.findByRole('button', { name: /继续优化下一段/ });
        fireEvent.click(next);
      }
    }
    expect(calls).toHaveLength(4);
    expect(calls[0].blockId).toBe('w');
    expect(new Set(calls.map(c => c.blockId))).toEqual(new Set(['w', 'p1', 'p2', 's']));
    expect(calls.at(-1)!.reviewed.sort()).toEqual(['p1', 'p2', 'w']);
    expect(screen.queryByRole('button', { name: /继续优化下一段/ })).toBeNull();
    for (const id of ['w', 'p1', 'p2', 's']) {
      const before = resume.sections.flatMap(s => s.blocks).find(b => b.id === id);
      const after = useAppStore.getState().resume.sections.flatMap(s => s.blocks).find(b => b.id === id);
      expect(after).not.toEqual(before);
    }
    report.passed = true;
  } finally {
    report.appliedResume = useAppStore.getState().resume;
    mkdirSync('test-artifacts/unified-relay', { recursive: true });
    writeFileSync('test-artifacts/unified-relay/live.json', JSON.stringify(report, null, 2));
    cleanup(); vi.unstubAllGlobals();
  }
}, 650000);
