import { expect, it } from 'vitest';
import { confirmedStatements, followupFactTopic } from './followups';
import { numericAdditions, followupsFor } from './policy';
import { toHistory, type AssistantTurn } from './types';

const examples = [
  '这段经历中是否有具体服务人数（如“覆盖30+场次”或“累计服务200+人次”）？若有，可自然融入首句。',
  '是否曾使用特定工具提升效率（如用Excel公式去重、用腾讯文档协同编辑）？若明确用过，可加括号说明。',
  '“反馈汇总”环节是否形成过简要摘要（如1页内归纳TOP3问题）？若有交付物，可补充“形成简要反馈摘要”。',
];
it('opens fact entry for the three questions in the reported screenshot', () => {
  expect(examples.map(followupFactTopic)).toEqual(['scale', 'tools', 'output']);
  expect(followupFactTopic('补充这段经历的真实信息')).toBe('all');
  expect(followupFactTopic('说明这次修改的差异和需要核对的表述。')).toBeNull();
});
it('offers executable requests and optional fact entry without numerical examples', () => {
  const actions = followupsFor({
    questions: [],
    proposals: [
      { action: 'updateBlock', blockId: 'b', html: '<p>协助登记</p>' },
    ],
    followups: examples,
  });
  expect(actions).toEqual([
    '帮我进一步精简表达，保留原有事实。',
    '说明这次修改的差异和需要核对的表述。',
    '补充这段经历的真实信息',
  ]);
  expect(actions.join('')).not.toMatch(/\d|Excel|TOP|是否/);
});
it('excludes current and historical clicked suggestions from numeric evidence', () => {
  const turns = [
    {
      text: examples[0],
      answer: '',
      proposals: [],
      questions: [],
      messageSource: 'suggestion' as const,
    },
  ];
  const evidence = confirmedStatements(turns, examples[2], 'suggestion').join(
    '\n',
  );
  expect(numericAdditions(evidence, '200人次、30场、1页、TOP3')).toEqual([
    '200',
    '30',
    '1',
    '3',
  ]);
});
it('retains actual answers while excluding numerical and tool examples in question headers', () => {
  const questions = examples.map((question) => ({ question, options: [] }));
  const text = `${examples[0]}：实际为47人次\n${examples[1]}：暂不确定\n${examples[2]}：没有`;
  const evidence = confirmedStatements(
    [{ text: '帮我润色', answer: '', proposals: [], questions }],
    text,
  ).join('\n');
  expect(evidence).toContain('实际为47人次');
  expect(evidence).not.toMatch(/200|30|TOP3|Excel|腾讯文档/);
  expect(numericAdditions(evidence, '47人次')).toEqual([]);
  expect(numericAdditions(evidence, '200人次、1页')).toEqual(['200', '1']);
});
it('recovers clicked-suggestion provenance from older stored sessions', () => {
  const base = {
    requestId: 'old',
    text: '帮我润色',
    answer: '',
    questions: [],
    proposals: [],
    followups: examples,
    direct: false,
    charged: true,
    feature: 'polish' as const,
  };
  const history = toHistory([
    base,
    { ...base, requestId: 'clicked', text: examples[0] },
  ] satisfies AssistantTurn[]);
  expect(history[0].messageSource).toBeUndefined();
  expect(history[1].messageSource).toBe('suggestion');
  expect(confirmedStatements(history, '继续精简').join('')).not.toContain(
    '200',
  );
});
