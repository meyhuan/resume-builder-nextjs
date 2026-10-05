import { it, expect, vi } from 'vitest';
vi.mock('@/lib/ai/provider', () => ({}));
import { runAssistant, type JsonRunner } from './engine';
import type { AssistantTask } from './types';
import type { ResumeData } from '@/entities/resume/resume-data';
const resume = {
  id: 'r',
  name: '测试',
  sections: [
    {
      id: 's',
      title: '在校经历',
      blocks: [{ id: 'b', type: 'text', html: '<p>协助登记和发放物品。</p>' }],
    },
  ],
} as ResumeData;
const task: AssistantTask = {
  id: '00000000-0000-4000-8000-000000000001',
  resumeId: 'r',
  feature: 'polish',
  blockId: 'b',
  label: '在校经历',
  entry: 'module',
};
const plan = {
  kind: 'write',
  feature: 'polish',
  targets: ['b'],
  questions: [],
  direct: false,
};
const draft = {
  answer: '建议如下',
  questions: [],
  proposals: [
    {
      action: 'updateBlock',
      blockId: 'b',
      html: '<p>协助完成物品登记与发放。</p>',
    },
  ],
  followups: ['这段还能再精简一点吗？'],
};
async function run(outputs: unknown[], text = '帮我润色', extra = {}) {
  const charge = vi.fn();
  const runner = vi.fn(async (_s, _p, schema) =>
    schema.parse(outputs.shift()),
  ) as unknown as JsonRunner;
  const result = await runAssistant({
    task,
    turns: [],
    text,
    requestId: 'request',
    resume,
    run: runner,
    charge,
    ...extra,
  });
  return { result, charge, runner };
}
it('clarifies missing information for free and cannot leak proposed text', async () => {
  const { result, charge, runner } = await run([
    {
      ...plan,
      kind: 'clarify',
      questions: [{ question: '你实际做了什么？', options: [] }],
    },
  ]);
  expect(charge).not.toHaveBeenCalled();
  expect(runner).toHaveBeenCalledTimes(1);
  expect(result.proposals).toEqual([]);
  expect(result.answer).toBe('');
});
it('charges original feature and defaults to preview', async () => {
  const { result, charge } = await run([
    plan,
    draft,
    { safe: true, questions: [] },
  ]);
  expect(charge).toHaveBeenCalledWith('polish');
  expect(result.direct).toBe(false);
  expect(result.proposals[0].before).toContain('协助登记');
});
it('publishes draft previews and real processing stages while fact checking is still pending', async () => {
  const onProgress = vi.fn(),
    onPreview = vi.fn();
  let finishAudit!: (value: unknown) => void;
  let calls = 0;
  const runner: JsonRunner = async (_s, _p, schema, preview) => {
    calls++;
    if (calls === 1) return schema.parse(plan);
    if (calls === 2) {
      preview?.onPartial(draft);
      return schema.parse(draft);
    }
    return schema.parse(
      await new Promise((resolve) => {
        finishAudit = resolve;
      }),
    );
  };
  let completed = false;
  const result = runAssistant({
    task,
    turns: [],
    text: '帮我润色',
    requestId: 'request',
    resume,
    run: runner,
    charge: async () => {},
    onProgress,
    onPreview,
  }).then((turn) => {
    completed = true;
    return turn;
  });
  await vi.waitFor(() => expect(finishAudit).toBeTypeOf('function'));
  expect(completed).toBe(false);
  expect(onProgress.mock.calls.map((call) => call[0])).toEqual([
    'planning',
    'generating',
    'checking',
  ]);
  expect(onPreview).toHaveBeenCalledWith('协助完成物品登记与发放。');
  finishAudit({ safe: false, questions: ['请确认事实'] });
  expect((await result).proposals).toEqual([]);
});
it('responsibility inflation produces a question, never an applicable proposal', async () => {
  const { result } = await run([
    plan,
    {
      ...draft,
      proposals: [
        {
          action: 'updateBlock',
          blockId: 'b',
          html: '<p>主导活动运营。</p>',
        },
      ],
    },
    { safe: false, questions: ['你是协助执行还是负责人？'] },
  ]);
  expect(result.proposals).toHaveLength(0);
  expect(result.questions).toHaveLength(1);
  expect(result.answer).toBe('');
});
it('unsupported metrics are blocked even if semantic verifier says safe', async () => {
  const { result } = await run([
    plan,
    {
      ...draft,
      proposals: [
        {
          action: 'updateBlock',
          blockId: 'b',
          html: '<p>登记了100份物品。</p>',
        },
      ],
    },
    { safe: true, questions: [] },
  ]);
  expect(result.proposals).toHaveLength(0);
});
it('direct requires both this turn explicit authorization and verified targets', async () => {
  const { result } = await run(
    [{ ...plan, direct: true }, draft, { safe: true, questions: [] }],
    '直接替换这段',
  );
  expect(result.direct).toBe(true);
  const next = await run(
    [{ ...plan, direct: true }, draft, { safe: true, questions: [] }],
    '再精简一点',
  );
  expect(next.result.direct).toBe(false);
});
it('refuses writes outside a module task', async () => {
  const { result, charge } = await run([{ ...plan, targets: ['other'] }]);
  expect(result.proposals).toHaveLength(0);
  expect(charge).not.toHaveBeenCalled();
});
it('will not generate when quota fails', async () => {
  const charge = vi.fn().mockRejectedValue(new Error('quota'));
  await expect(run([plan], '润色', { charge })).rejects.toThrow('quota');
});
it('global question uses assistant quota', async () => {
  const { charge } = await run(
    [
      { ...plan, kind: 'answer', feature: 'chat' },
      { ...draft, proposals: [] },
      { safe: true, questions: [] },
    ],
    '这段还能如何改善？',
    { task: { ...task, feature: 'chat', blockId: undefined } },
  );
  expect(charge).toHaveBeenCalledWith('chat');
});

it('checks personal claims in a plain answer as well as modification cards', async () => {
  const { result } = await run([
    { ...plan, kind: 'answer', feature: 'chat' },
    { ...draft, answer: '你曾主导活动并提升50%效率', proposals: [] },
    { safe: false, questions: ['你实际负责的工作是什么？'] },
  ]);
  expect(result.answer).toBe('');
  expect(result.proposals).toEqual([]);
  expect(result.questions).toHaveLength(1);
});

it('suggested followup clicks cannot authorize automatic application', async () => {
  const { result } = await run(
    [{ ...plan, direct: true }, draft, { safe: true, questions: [] }],
    '请直接替换这段',
    { allowDirect: false },
  );
  expect(result.direct).toBe(false);
  expect(result.proposals).toHaveLength(1);
});

it('blocks numeric examples from clicked recommendations even if the semantic audit approves', async () => {
  const { result, runner } = await run(
    [
      plan,
      {
        ...draft,
        proposals: [
          {
            action: 'updateBlock',
            blockId: 'b',
            html: '<p>协助登记，累计服务200人次，形成1页TOP3摘要。</p>',
          },
        ],
      },
      { safe: true, questions: [] },
    ],
    '是否形成过摘要（如1页内归纳TOP3问题）？',
    {
      messageSource: 'suggestion',
      turns: [
        {
          text: '是否有服务人数（如200人次）？',
          answer: '',
          questions: [],
          proposals: [],
          messageSource: 'suggestion',
        },
      ],
    },
  );
  expect(result.proposals).toEqual([]);
  expect(result.questions.length).toBeGreaterThan(0);
  const audit = JSON.parse(vi.mocked(runner).mock.calls[2][1]);
  expect(audit.newNumbers).toEqual(['200', '1', '3']);
  expect(JSON.parse(audit.evidence).userStatements).toEqual([]);
});

it('accepts explicitly provided numbers and limits whole-resume followup facts to the chosen block', async () => {
  const { result, runner, charge } = await run(
    [
      {
        ...draft,
        proposals: [
          {
            action: 'updateBlock',
            blockId: 'b',
            html: '<p>协助登记，服务47人次。</p>',
          },
        ],
      },
      { safe: true, questions: [] },
    ],
    '请根据以下真实信息重新润色：实际服务规模：47人次',
    {
      task: { ...task, feature: 'chat', blockId: undefined, scope: 'resume' },
      followupTargetId: 'b',
      messageSource: 'user',
      allowDirect: false,
      resume: {
        ...resume,
        sections: [
          {
            ...resume.sections[0],
            blocks: [
              ...resume.sections[0].blocks,
              { id: 'c', type: 'text', html: '<p>整理通知。</p>' },
            ],
          },
        ],
      },
    },
  );
  expect(result.proposals).toHaveLength(1);
  expect(result.scope).toBeUndefined();
  expect(result.feature).toBe('chat');
  expect(charge).toHaveBeenCalledExactlyOnceWith('chat');
  expect(JSON.parse(vi.mocked(runner).mock.calls[0][1]).task.blockId).toBe('b');
  expect(vi.mocked(runner)).toHaveBeenCalledTimes(2);
});

it('refuses followup facts for a different target within a module task', async () => {
  await expect(
    run([], '实际服务47人次', { followupTargetId: 'other' }),
  ).rejects.toThrow('目标与当前任务不匹配');
});

it('uses local user statements as evidence, excludes historical AI suggestions, and resets direct permission', async () => {
  const { result, runner } = await run(
    [{ ...plan, direct: true }, draft, { safe: true, questions: [] }],
    '请再精简一点',
    {
      turns: [
        {
          text: '我协助登记，直接替换这段',
          answer: '主导活动并提升50%效率',
          questions: [],
          proposals: [],
        },
      ],
    },
  );
  const calls = vi.mocked(runner).mock.calls;
  const input = JSON.parse(calls[0][1]);
  expect(input.history[0].user).toContain('我协助登记');
  expect(input.history[0].answer).toContain('提升50%');
  const audit = JSON.parse(calls[2][1]);
  expect(audit.evidence).toContain('我协助登记');
  expect(audit.evidence).not.toContain('提升50%');
  expect(result.direct).toBe(false);
});

const globalTask: AssistantTask = {
  ...task,
  blockId: undefined,
  feature: 'chat',
  entry: 'assistant',
};
const multiResume = {
  ...resume,
  sections: [
    {
      ...resume.sections[0],
      blocks: [
        ...resume.sections[0].blocks,
        { id: 'c', type: 'text', html: '<p>整理活动清单。</p>' },
        { id: 'd', type: 'text', html: '<p>参与志愿活动。</p>' },
      ],
    },
  ],
} as ResumeData;
it('recognizes full resume optimization, previews and charges editor assist only once', async () => {
  const { result, charge } = await run(
    [
      { ...plan, kind: 'clarify', targets: [] },
      { ...draft, reviewedBlockIds: ['b'] },
      { safe: true },
    ],
    '优化整份简历',
    { task: globalTask, resume: multiResume },
  );
  expect(result.scope).toBe('resume');
  expect(result.direct).toBe(false);
  expect(result.coverage?.map((item) => item.status)).toEqual([
    'proposed',
    'unreviewed',
    'unreviewed',
  ]);
  expect(charge).toHaveBeenCalledExactlyOnceWith('chat');
});
it('retains verified suggestions when another block fails factual verification', async () => {
  const { result } = await run(
    [
      plan,
      {
        ...draft,
        reviewedBlockIds: ['b', 'c', 'd'],
        proposals: [
          ...draft.proposals,
          {
            action: 'updateBlock',
            blockId: 'c',
            html: '<p>主导活动运营。</p>',
          },
        ],
      },
      { safe: true },
      { safe: false, questions: ['这段实际负责什么？'] },
    ],
    '优化整份简历',
    { task: globalTask, resume: multiResume },
  );
  expect(result.proposals).toHaveLength(1);
  expect(result.questions[0].blockId).toBe('c');
  expect(result.coverage?.map((item) => item.status)).toEqual([
    'proposed',
    'confirmation',
    'unchanged',
  ]);
  expect(result.direct).toBe(false);
});
it('can clarify one named block and preview another, but unscoped questions block all drafts', async () => {
  const outputs = [
    plan,
    { ...draft, questions: [{ question: '你做了哪些工作？', blockId: 'c' }] },
    { safe: true },
  ];
  const { result } = await run(outputs, '优化整份简历', {
    task: globalTask,
    resume: multiResume,
  });
  expect(result.proposals).toHaveLength(1);
  const unclear = await run(
    [plan, { ...draft, questions: [{ question: '信息真实吗？' }] }],
    '优化整份简历',
    { task: globalTask },
  );
  expect(unclear.result.proposals).toHaveLength(0);
});
it('does not demand invented content when reviewed blocks need no changes', async () => {
  const { result } = await run(
    [plan, { ...draft, proposals: [], reviewedBlockIds: ['b'] }],
    '优化整份简历',
    { task: globalTask },
  );
  expect(result.questions).toEqual([]);
  expect(result.coverage?.[0].status).toBe('unchanged');
  expect(result.answer).toContain('没有可应用的修改');
});
it('diagnostic notes never become evidence in fact verification', async () => {
  const { runner } = await run([plan, draft, { safe: true }], '优化整份简历', {
    task: { ...globalTask, scope: 'resume', reviewNotes: '主导项目提升50%' },
  });
  expect(vi.mocked(runner).mock.calls[0][1]).toContain('主导项目提升50%');
  expect(vi.mocked(runner).mock.calls[2][1]).not.toContain('主导项目提升50%');
});

it('an empty resume asks for real content without charging or invoking generation', async () => {
  const { result, charge, runner } = await run([], '优化整份简历', {
    task: globalTask,
    resume: { ...resume, sections: [] },
  });
  expect(result.questions).toHaveLength(1);
  expect(result.proposals).toEqual([]);
  expect(charge).not.toHaveBeenCalled();
  expect(runner).not.toHaveBeenCalled();
});
it('a question after a whole-resume task stays an answer, not another full rewrite', async () => {
  const { result } = await run(
    [
      { ...plan, kind: 'answer', feature: 'chat' },
      { ...draft, proposals: [], answer: '本轮只调整表达。' },
      { safe: true },
    ],
    '这次具体调整了哪些表达？',
    {
      task: { ...globalTask, scope: 'resume' },
      turns: [
        { text: '优化整份简历', answer: '', questions: [], proposals: [] },
      ],
    },
  );
  expect(result.scope).toBeUndefined();
  expect(result.answer).toBe('本轮只调整表达。');
  expect(result.proposals).toEqual([]);
});
