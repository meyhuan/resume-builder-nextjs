import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { UnifiedAssistant } from './unified-assistant';
import { useAppStore } from '@/state/store';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { targetSnapshot } from '@/lib/ai/unified/policy';
import type { ResumeData } from '@/entities/resume/resume-data';
const mocks = vi.hoisted(() => ({
  saved: undefined as unknown,
  fetch: vi.fn(),
}));
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => mocks.saved),
  set: vi.fn(async (_key, value) => {
    mocks.saved = value;
  }),
}));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/ai/assist-client', () => ({
  refreshEditorAssistQuota: vi.fn(),
}));
const resume = {
  id: 'r',
  name: '测试',
  sections: [
    {
      id: 's',
      title: '在校经历',
      blocks: [{ id: 'b', type: 'text', html: '<p>协助登记</p>' }],
    },
  ],
} as ResumeData;
const task = {
  id: '00000000-0000-4000-8000-000000000001',
  resumeId: 'r',
  feature: 'polish' as const,
  blockId: 'b',
  label: '校园旧物交换活动',
  entry: 'module' as const,
};
beforeEach(() => {
  mocks.saved = undefined;
  mocks.fetch.mockReset();
  vi.stubGlobal('fetch', mocks.fetch);
  Element.prototype.scrollIntoView = vi.fn();
  useAppStore.setState({
    resume: structuredClone(resume),
    pastStates: [],
    futureStates: [],
    readOnly: false,
  });
  useEditorUiStore.setState({
    assistantTask: task,
    assistantBusy: false,
    pendingAiMessage: null,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function reply(direct = false, questions: unknown[] = []) {
  mocks.fetch.mockImplementation(async (_url, options) => {
    const body = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        turn: {
          requestId: body.requestId,
          text: body.text,
          answer: '',
          questions,
          proposals: questions.length
            ? []
            : [
                {
                  action: 'updateBlock',
                  blockId: 'b',
                  html: '<p>协助完成登记</p>',
                  before: targetSnapshot(resume, 'b'),
                  targetLabel: '校园旧物交换活动',
                  factChecked: true,
                },
              ],
          followups: ['这段还能再精简一点吗？', '哪些表述需要核对？'],
          direct,
          charged: !questions.length,
          feature: 'polish',
        },
      }),
    };
  });
}
async function mount() {
  render(<UnifiedAssistant resumeId="r" onLegacy={() => {}} />);
  await screen.findByText('当前对象：校园旧物交换活动');
}
async function send(text = '帮我润色') {
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: text },
  });
  fireEvent.click(screen.getByLabelText('发送消息'));
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
}
it('keeps original until Apply, renders next questions, and supports selective undo', async () => {
  reply();
  await mount();
  await send();
  await screen.findByText('应用这一处');
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(
    targetSnapshot(resume, 'b'),
  );
  expect(screen.getByText('这段还能再精简一点吗？')).toBeTruthy();
  fireEvent.click(screen.getByText('应用这一处'));
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toContain(
    '协助完成',
  );
  fireEvent.click(screen.getByText('撤销这次修改'));
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(
    targetSnapshot(resume, 'b'),
  );
});
it('retains original and cannot reapply a kept proposal', async () => {
  reply();
  await mount();
  await send();
  await screen.findByText('保留原文');
  fireEvent.click(screen.getByText('保留原文'));
  expect(screen.getByText('已保留原文')).toBeTruthy();
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
it('auto applies only a live direct response and does not replay restored history', async () => {
  reply(true);
  await mount();
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: '直接替换这段' },
  });
  fireEvent.click(screen.getByLabelText('发送消息'));
  await screen.findByText('已应用');
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  cleanup();
  render(<UnifiedAssistant resumeId="r" onLegacy={() => {}} />);
  await screen.findByText('已应用');
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it('question options populate user input without asserting facts automatically', async () => {
  reply(false, [{ question: '你具体负责什么？', options: ['登记', '发放'] }]);
  await mount();
  await send();
  await screen.findByText('登记');
  fireEvent.click(screen.getByText('登记'));
  expect(
    (screen.getByLabelText('向 AI 描述修改需求') as HTMLTextAreaElement).value,
  ).toContain('登记');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
it('followup uses the same task and does not carry direct authorization', async () => {
  reply();
  await mount();
  await send();
  await screen.findByText('这段还能再精简一点吗？');
  fireEvent.click(screen.getByText('这段还能再精简一点吗？'));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(body.task.id).toBe(task.id);
  expect(body.text).toBe('这段还能再精简一点吗？');
  expect(body.direct).toBeUndefined();
  expect(body.fromFollowup).toBe(true);
});

it('stopping a pending request never applies a late result', async () => {
  mocks.fetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        ),
      ),
  );
  await mount();
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: '直接替换这段' },
  });
  fireEvent.click(screen.getByLabelText('发送消息'));
  await screen.findByText('停止');
  fireEvent.click(screen.getByText('停止'));
  await screen.findByText('已停止，未应用任何新修改。');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(
    targetSnapshot(resume, 'b'),
  );
});
