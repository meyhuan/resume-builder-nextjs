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
import { track } from '@/lib/analytics';
import { act } from '@testing-library/react';
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
      blocks: [
        { id: 'b', type: 'text', html: '<p>协助登记</p>' },
        { id: 'c', type: 'text', html: '<p>协助登记</p>' },
      ],
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
  vi.mocked(track).mockClear();
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
    activePanel: 'ai',
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function reply(direct = false, questions: unknown[] = [], count = 1) {
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
            : Array.from({ length: count }, (_, i) => ({
                action: 'updateBlock',
                blockId: i ? 'c' : 'b',
                html: '<p>协助完成登记</p>',
                before: targetSnapshot(resume, i ? 'c' : 'b'),
                targetLabel: '校园旧物交换活动',
                factChecked: true,
              })),
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
  await waitFor(() => expect(screen.queryByText('停止')).toBeNull());
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
  expect(body.turns).toHaveLength(1);
  expect(body.turns[0].text).toBe('帮我润色');
  expect(body.turns[0].direct).toBeUndefined();
  expect(body.turns[0].charged).toBeUndefined();
  expect(body.turns[0].proposals[0].before).toBeUndefined();
  expect(body.turns[0].proposals[0].factChecked).toBeUndefined();
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
  await screen.findByText(
    '已停止，未应用任何新修改。若已开始生成，可能已扣次。',
  );
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  expect(targetSnapshot(useAppStore.getState().resume, 'b')).toBe(
    targetSnapshot(resume, 'b'),
  );
});

it('a manual retry uses a new ID and current resume; failure never auto retries', async () => {
  mocks.fetch.mockRejectedValue(new TypeError('网络连接中断'));
  await mount();
  await send();
  await screen.findByText('重新生成（重新计次）');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/上一请求若已开始生成/)).toBeTruthy();
  const first = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  const updated = structuredClone(resume);
  updated.name = '编辑后的简历';
  useAppStore.setState({ resume: updated });
  reply();
  fireEvent.click(screen.getByText('重新生成（重新计次）'));
  await screen.findByText('应用这一处');
  const second = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(second.requestId).not.toBe(first.requestId);
  expect(second.task).toEqual(first.task);
  expect(second.text).toBe(first.text);
  expect(second.resumeData.name).toBe('编辑后的简历');
});
it('restored browser history is included in the next request without replaying edits', async () => {
  reply(false, [{ question: '你具体负责什么？', options: ['登记'] }]);
  await mount();
  await send('我不知道怎么写');
  await screen.findByText('登记');
  cleanup();
  await mount();
  await send('我实际协助登记');
  const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(body.turns[0].text).toBe('我不知道怎么写');
  expect(body.turns[0].questions[0].question).toBe('你具体负责什么？');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});

function events(action: string) {
  return vi
    .mocked(track)
    .mock.calls.filter(
      ([name, props]) =>
        name === 'ai_assist_interaction' && props?.action === action,
    )
    .map(([, props]) => props!);
}

it('links each preview application and undo without sending private content', async () => {
  reply();
  await mount();
  await send('敏感姓名和经历内容');
  await screen.findByText('应用这一处');
  fireEvent.click(screen.getByText('应用这一处'));
  fireEvent.click(screen.getByText('撤销这次修改'));
  const requestId = events('start')[0].requestId;
  expect(events('apply')[0]).toMatchObject({
    schemaVersion: 2,
    taskId: task.id,
    requestId,
    proposalId: `${requestId}:proposal:0`,
    mode: 'preview',
  });
  expect(events('undo')[0]).toMatchObject({
    requestId,
    proposalId: `${requestId}:proposal:0`,
  });
  expect(events('success')[0]).toMatchObject({
    resultType: 'proposals',
    charged: true,
    proposalCount: 1,
    elapsedMs: expect.any(Number),
  });
  const payload = JSON.stringify(vi.mocked(track).mock.calls);
  for (const secret of [
    '敏感姓名',
    '协助登记',
    '协助完成登记',
    task.label,
    '这段还能再精简',
  ])
    expect(payload).not.toContain(secret);
});

it('tracks all proposals undone by one batch direct operation and does not replay telemetry on restore', async () => {
  reply(true, [], 2);
  await mount();
  await send('直接替换');
  await screen.findAllByText('已应用');
  expect(events('direct_apply')).toHaveLength(2);
  expect(events('preview')).toHaveLength(0);
  fireEvent.click(screen.getAllByText('撤销这次修改')[0]);
  expect(events('undo').map((e) => e.proposalId)).toEqual(
    events('direct_apply').map((e) => e.proposalId),
  );
  expect(screen.getAllByText('已撤销')).toHaveLength(2);
  cleanup();
  await mount();
  expect(events('direct_apply')).toHaveLength(2);
  expect(events('undo')).toHaveLength(2);
});

it('quota block is one terminal outcome, not a duplicate failure', async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    status: 429,
    json: async () => ({ quotaExceeded: true, error: '额度不足' }),
  });
  await mount();
  await send();
  await screen.findByText('额度不足');
  expect(events('quota_blocked')).toHaveLength(1);
  expect(events('quota_blocked')[0]).toMatchObject({
    failureReason: 'quota',
    statusCode: 429,
    elapsedMs: expect.any(Number),
  });
  expect(events('failed')).toHaveLength(0);
});

it('keeps continuation and retry attribution separate from direct-edit authorization', async () => {
  reply();
  await mount();
  await send();
  const firstId = events('start')[0].requestId;
  mocks.fetch.mockRejectedValue(new TypeError('private network error'));
  fireEvent.click(await screen.findByText('这段还能再精简一点吗？'));
  await screen.findByText('重新生成（重新计次）');
  const followup = events('start')[1];
  expect(followup).toMatchObject({
    submissionSource: 'followup',
    sourceRequestId: firstId,
    sourceOptionId: `${firstId}:followup:0`,
    previousRequestId: firstId,
  });
  expect(events('followup_click')[0].optionId).toBe(followup.sourceOptionId);
  expect(events('failed')[0]).toMatchObject({
    failureReason: 'network',
    requestId: followup.requestId,
  });
  reply();
  fireEvent.click(screen.getByText('重新生成（重新计次）'));
  await waitFor(() => expect(events('success')).toHaveLength(2));
  expect(events('start')[2]).toMatchObject({
    submissionSource: 'retry',
    retryOfRequestId: followup.requestId,
    sourceOptionId: followup.sourceOptionId,
  });
});

it('links a user reply to the preceding clarification request', async () => {
  reply(false, [{ question: '做了什么？', options: [] }]);
  await mount();
  await send('不知道怎么写');
  const firstId = events('start')[0].requestId;
  expect(events('clarify')[0]).toMatchObject({
    requestId: firstId,
    charged: false,
    resultType: 'clarification',
  });
  await send('我实际协助登记');
  expect(events('start')[1]).toMatchObject({
    previousRequestId: firstId,
    previousResultType: 'clarification',
  });
});

it('records only visible proposal and followup exposures, never hidden panel mounts', async () => {
  const observers: {
    callback: IntersectionObserverCallback;
    target?: Element;
    disconnected: boolean;
  }[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      item: (typeof observers)[number];
      constructor(callback: IntersectionObserverCallback) {
        this.item = { callback, disconnected: false };
        observers.push(this.item);
      }
      observe(target: Element) {
        this.item.target = target;
      }
      disconnect() {
        this.item.disconnected = true;
      }
    },
  );
  const expose = () =>
    act(() => {
      for (const o of [...observers])
        if (!o.disconnected && o.target)
          o.callback(
            [
              {
                target: o.target,
                isIntersecting: true,
                intersectionRatio: 1,
              } as IntersectionObserverEntry,
            ],
            {} as IntersectionObserver,
          );
    });
  useEditorUiStore.setState({ activePanel: null });
  reply();
  await mount();
  await send();
  expose();
  expect(events('panel_view')).toHaveLength(0);
  expect(events('proposal_view')).toHaveLength(0);
  expect(events('followup_view')).toHaveLength(0);
  act(() => useEditorUiStore.setState({ activePanel: 'ai' }));
  expose();
  expose();
  expect(events('panel_view')).toHaveLength(1);
  expect(events('proposal_view')).toHaveLength(1);
  expect(events('followup_view')).toHaveLength(2);
  expect(events('followup_view')[0].optionId).toBe(
    `${events('start')[0].requestId}:followup:0`,
  );
});

it('records a direct-apply conflict separately from successful model completion', async () => {
  reply(true);
  await mount();
  const edited = structuredClone(resume);
  edited.sections[0].blocks[0] = {
    id: 'b',
    type: 'text',
    html: '<p>用户后来修改</p>',
  };
  useAppStore.setState({ resume: edited });
  await send('直接替换');
  expect(events('direct_apply')).toHaveLength(0);
  expect(events('conflict')[0]).toMatchObject({
    mode: 'direct',
    operation: 'apply',
    proposalIndex: 0,
  });
  expect(events('success')).toHaveLength(1);
});

it('records one cancellation if an aborted request resolves late', async () => {
  let finish: (value: unknown) => void = () => {};
  mocks.fetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: '直接替换' },
  });
  fireEvent.click(screen.getByLabelText('发送消息'));
  fireEvent.click(await screen.findByText('停止'));
  await act(async () => {
    finish({ ok: true, status: 200, json: async () => ({}) });
  });
  expect(events('cancel')).toHaveLength(1);
  expect(events('success')).toHaveLength(0);
  expect(events('failed')).toHaveLength(0);
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
