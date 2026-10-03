import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
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
  // Existing history should stay idle; fresh module actions are tested separately.
  mocks.saved = [
    { task, turns: [], reviews: {}, receipts: {}, updatedAt: 1 },
    {
      task: {
        ...task,
        id: 'chat-history',
        blockId: undefined,
        feature: 'chat',
        entry: 'assistant',
        label: '整份简历',
      },
      turns: [],
      reviews: {},
      receipts: {},
      updatedAt: 1,
    },
  ];
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
  await screen.findByRole('button', {
    name: '当前任务：校园旧物交换活动，查看详情和历史对话',
  });
}
it('starts a fresh module polish once, previews changes, and never replays restored history', async () => {
  mocks.saved = undefined;
  reply(true); // Even an incorrect direct response must not apply a starter request.
  const view = render(
    <StrictMode>
      <UnifiedAssistant resumeId="r" onLegacy={() => {}} />
    </StrictMode>,
  );
  await screen.findByText('应用这一处');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(body.task).toEqual(task);
  expect(body.fromFollowup).toBe(true);
  expect(body.text).toContain('先展示修改建议');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  expect(screen.queryByText('帮我把这段写得更精简')).toBeNull();
  view.unmount();
  await mount();
  await screen.findByText('应用这一处');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it('does not automatically retry a failed module polish, including after reopening', async () => {
  mocks.saved = undefined;
  mocks.fetch.mockRejectedValue(new Error('测试请求失败'));
  await mount();
  await screen.findByText('测试请求失败');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  cleanup();
  await mount();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it('keeps top-level assistant and generate starters idle', async () => {
  mocks.saved = undefined;
  useEditorUiStore.setState({ assistantTask: null });
  render(<UnifiedAssistant resumeId="r" onLegacy={() => {}} />);
  await screen.findByText('优化整份简历');
  expect(mocks.fetch).not.toHaveBeenCalled();
  act(() =>
    useEditorUiStore.setState({
      assistantTask: { ...task, feature: 'generate' },
    }),
  );
  await screen.findByText('根据已有信息，帮我写这段经历');
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('does not restart automatic polish after stopping it', async () => {
  mocks.saved = undefined;
  mocks.fetch.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      }),
  );
  await mount();
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByRole('alert');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});
function getSubmitButton() {
  return (
    screen.queryByLabelText('确认当前回答') || screen.getByLabelText('发送消息')
  );
}
async function send(text = '帮我润色') {
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: text },
  });
  fireEvent.click(getSubmitButton());
  await waitFor(() => expect(screen.queryByText('停止')).toBeNull());
}
it('reveals the full task and switches history without sending a request', async () => {
  await mount();
  expect(screen.queryByText('当前对象：校园旧物交换活动')).toBeNull();
  fireEvent.keyDown(screen.getByRole('button', { name: /当前任务/ }), {
    key: 'ArrowDown',
  });
  expect(await screen.findByText('当前对象：校园旧物交换活动')).toBeTruthy();
  fireEvent.click(screen.getByRole('menuitemradio', { name: /整份简历/ }));
  await screen.findByRole('button', { name: /当前任务：整份简历/ });
  expect(screen.queryByRole('menu')).toBeNull();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('keeps legacy history and exit task available in the more menu', async () => {
  const onLegacy = vi.fn();
  render(<UnifiedAssistant resumeId="r" onLegacy={onLegacy} />);
  await screen.findByRole('button', { name: /当前任务：校园旧物/ });
  fireEvent.keyDown(screen.getByRole('button', { name: '更多对话操作' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: '旧版历史' }));
  expect(onLegacy).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole('button', { name: '更多对话操作' }), {
    key: 'ArrowDown',
  });
  fireEvent.click(await screen.findByRole('menuitem', { name: '退出任务' }));
  await screen.findByRole('button', { name: /当前任务：整份简历/ });
  expect(useEditorUiStore.getState().assistantTask).toBeNull();
});

it('disables task switching while generating but keeps stop available', async () => {
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
    target: { value: '润色这段' },
  });
  fireEvent.click(getSubmitButton());
  await screen.findByText('停止');
  expect(
    (screen.getByRole('button', { name: '新对话' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(screen.getByRole('button', { name: /当前任务/ }), {
    key: 'ArrowDown',
  });
  for (const item of await screen.findAllByRole('menuitemradio'))
    expect(item.getAttribute('aria-disabled')).toBe('true');
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  fireEvent.click(screen.getByText('停止'));
  await screen.findByLabelText('发送消息');
});
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
  fireEvent.click(getSubmitButton());
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
it('marks choices selected, replaces an answer and toggles it off without touching other answers', async () => {
  reply(false, [
    { question: '你具体负责什么？', options: ['登记', '发放'] },
    { question: '参与多久？', options: ['两天'] },
  ]);
  await mount();
  await send();
  let first = await screen.findByRole('button', { name: '登记' });
  let second = screen.getByRole('button', { name: '发放' });
  const input = screen.getByLabelText(
    '向 AI 描述修改需求',
  ) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: '额外补充：我是志愿者' } });
  fireEvent.click(first);
  expect(first.getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: '两天' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '确认，下一题' }));
  fireEvent.click(screen.getByRole('button', { name: '两天' }));
  fireEvent.click(screen.getByRole('button', { name: '修改第 1 题回答' }));
  first = screen.getByRole('button', { name: '登记' });
  second = screen.getByRole('button', { name: '发放' });
  expect(first.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(second);
  expect(first.getAttribute('aria-pressed')).toBe('false');
  expect(second.getAttribute('aria-pressed')).toBe('true');
  expect(input.value).toBe(
    '额外补充：我是志愿者\n你具体负责什么？：发放\n参与多久？：两天',
  );
  fireEvent.click(second);
  expect(second.getAttribute('aria-pressed')).toBe('false');
  expect(input.value).toBe('额外补充：我是志愿者\n参与多久？：两天');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it('asks one question at a time and submits all confirmed answers in one request', async () => {
  reply(false, [
    { question: '负责什么？', options: ['登记'] },
    { question: '参与多久？', options: ['两天'] },
    { question: '有什么成果？', options: [] },
  ]);
  await mount();
  await send();
  await screen.findByText('问题 1 / 3');
  expect(screen.queryByText('参与多久？')).toBeNull();
  expect(screen.queryByText('有什么成果？')).toBeNull();
  expect(
    (screen.getByRole('button', { name: '确认，下一题' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '登记' }));
  // The composer action must not send a partial structured answer either.
  fireEvent.click(getSubmitButton());
  await screen.findByText('问题 2 / 3');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: '登记' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '两天' }));
  fireEvent.click(screen.getByRole('button', { name: '确认，下一题' }));
  await screen.findByText('问题 3 / 3');
  fireEvent.click(screen.getByRole('button', { name: '暂不确定' }));
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '提交回答' }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).text).toBe(
    '负责什么？：登记\n参与多久？：两天\n有什么成果？：暂不确定，请保留原有事实，不自行补全',
  );
  await screen.findByText('查看此前的 3 个问题');
  expect(screen.getAllByTestId('question-stepper')).toHaveLength(1);
});

it('reopens an earlier answer deleted in the composer instead of submitting incomplete answers', async () => {
  reply(false, [
    { question: '负责什么？', options: ['登记'] },
    { question: '参与多久？', options: ['两天'] },
  ]);
  await mount();
  await send();
  fireEvent.click(await screen.findByRole('button', { name: '登记' }));
  fireEvent.click(screen.getByRole('button', { name: '确认，下一题' }));
  fireEvent.click(screen.getByRole('button', { name: '两天' }));
  fireEvent.change(screen.getByLabelText('向 AI 描述修改需求'), {
    target: { value: '参与多久？：两天' },
  });
  fireEvent.click(screen.getByRole('button', { name: '提交回答' }));
  await screen.findByText('问题 1 / 2');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it('lets users replace a suggested answer with their own text and sends it only on confirmation', async () => {
  reply(false, [{ question: '你具体负责什么？', options: ['登记'] }]);
  await mount();
  await send();
  const option = await screen.findByRole('button', { name: '登记' });
  fireEvent.click(option);
  fireEvent.click(screen.getByRole('button', { name: '自己填写' }));
  const input = screen.getByLabelText('你的回答') as HTMLTextAreaElement;
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(input.value).toBe('登记');
  fireEvent.change(input, {
    target: {
      value: '我只负责核对名单\n当天还协助联系负责人',
    },
  });
  expect(option.getAttribute('aria-pressed')).toBe('false');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(getSubmitButton());
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body).text).toBe(
    '你具体负责什么？：我只负责核对名单\n当天还协助联系负责人',
  );
});

it('opens a blank answer at the caret even for questions without options', async () => {
  reply(false, [{ question: '你具体负责什么？', options: [] }]);
  await mount();
  await send();
  fireEvent.click(await screen.findByRole('button', { name: '自己填写' }));
  const input = screen.getByLabelText('你的回答') as HTMLTextAreaElement;
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(input.value).toBe('');
  expect(input.selectionStart).toBe(input.value.length);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
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
  fireEvent.click(getSubmitButton());
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
  fireEvent.click(screen.getAllByText('撤销这组修改')[0]);
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
  fireEvent.click(getSubmitButton());
  fireEvent.click(await screen.findByText('停止'));
  await act(async () => {
    finish({ ok: true, status: 200, json: async () => ({}) });
  });
  expect(events('cancel')).toHaveLength(1);
  expect(events('success')).toHaveLength(0);
  expect(events('failed')).toHaveLength(0);
  expect(useAppStore.getState().pastStates).toHaveLength(0);
});

it('check entry creates a fresh global task, starts once, and does not reuse module history', async () => {
  reply(true, [], 2);
  useEditorUiStore
    .getState()
    .startResumeOptimization('r', 'resume_check', '参考检查意见');
  const view = render(
    <StrictMode>
      <UnifiedAssistant resumeId="r" onLegacy={() => {}} />
    </StrictMode>,
  );
  await screen.findAllByText('应用这一处');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(body.task).toMatchObject({
    scope: 'resume',
    entry: 'resume_check',
    feature: 'chat',
  });
  expect(body.task.blockId).toBeUndefined();
  expect(body.turns).toEqual([]);
  expect(body.fromFollowup).toBe(true);
  expect(body.text).not.toContain('参考检查意见');
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  view.unmount();
  render(<UnifiedAssistant resumeId="r" onLegacy={() => {}} />);
  await screen.findAllByText('应用这一处');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it('batch selection applies atomically, undo restores both, and telemetry keeps proposal identity', async () => {
  reply(false, [], 2);
  await mount();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '优化整份简历' },
  });
  fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
  await screen.findAllByText('应用这一处');
  expect(
    (screen.getByRole('button', { name: '应用所选（0）' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByText('全选待处理建议'));
  fireEvent.click(screen.getByText('应用所选（2）'));
  expect(useAppStore.getState().pastStates).toHaveLength(1);
  expect(screen.getAllByText('已应用')).toHaveLength(2);
  expect(events('apply')).toHaveLength(2);
  expect(events('apply')[0].selectedCount).toBe(2);
  fireEvent.click(screen.getAllByText('撤销这组修改')[0]);
  expect(useAppStore.getState().resume.sections[0].blocks).toEqual(
    resume.sections[0].blocks,
  );
  expect(screen.getAllByText('已撤销')).toHaveLength(2);
});
it('batch conflict writes nothing and never reports acceptance', async () => {
  reply(false, [], 2);
  await mount();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '整理内容' },
  });
  fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
  await screen.findAllByText('应用这一处');
  useAppStore.setState({
    resume: {
      ...resume,
      sections: [
        {
          ...resume.sections[0],
          blocks: [
            { id: 'b', type: 'text', html: '<p>手动修改</p>' },
            resume.sections[0].blocks[1],
          ],
        },
      ],
    },
  });
  fireEvent.click(screen.getByText('全选待处理建议'));
  fireEvent.click(screen.getByText('应用所选（2）'));
  expect(useAppStore.getState().resume.sections[0].blocks[1]).toEqual(
    resume.sections[0].blocks[1],
  );
  expect(useAppStore.getState().pastStates).toHaveLength(0);
  expect(events('apply')).toHaveLength(0);
  expect(events('conflict')).toHaveLength(2);
});
