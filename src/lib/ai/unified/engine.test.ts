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
it('responsibility inflation produces a question, never an applicable proposal', async () => {
  const { result } = await run([
    plan,
    {
      ...draft,
      proposals: [
        { action: 'updateBlock', blockId: 'b', html: '<p>主导活动运营。</p>' },
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
