import { describe, expect, it } from 'vitest';
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

describe('Dynamic Followups Generation & Sanitization', () => {
  it('sanitizes model followups: rejects escalation, ungrounded numbers, and foreign tools', async () => {
    const { sanitizeModelFollowup } = await import('./followups');

    // Reject role escalation
    expect(sanitizeModelFollowup('建议写成独立负责整个移动端架构')).toBeNull();
    expect(sanitizeModelFollowup('主导团队完成接口重构')).toBeNull();

    // Reject hallucinated numbers
    expect(sanitizeModelFollowup('将接口耗时优化至200ms以内', '负责接口开发')).toBeNull();
    // Allow numbers if already present in source
    expect(
      sanitizeModelFollowup('针对Vue3技术栈做更详细的说明', '使用Vue3进行前端开发'),
    ).not.toBeNull();

    // Reject ungrounded tools
    expect(sanitizeModelFollowup('补充Jira或Pytest的使用经验', '负责测试')).toBeNull();

    // Normalize questions to actionable first-person requests
    expect(
      sanitizeModelFollowup('能否补充在跨端通信协议中的具体工作？', '参与多端通信'),
    ).toBe('帮我补充在跨端通信协议中的具体工作');
    expect(
      sanitizeModelFollowup('补充性能优化排查ANR的具体思路', '负责定位ANR问题'),
    ).toBe('补充性能优化排查ANR的具体思路');
  });

  it('finds the next candidate block to optimize with module priority', async () => {
    const { findNextBlockToOptimize } = await import('./followups');

    const allBlocks = [
      {
        blockId: 'b1',
        sectionTitle: '工作经历',
        label: '前端开发实习',
        content: '<p>负责Vue后台开发</p>',
        type: 'experience',
      },
      {
        blockId: 'b2',
        sectionTitle: '项目经历',
        label: '设备借用后台',
        content: '<p>同学写后端，我写前端</p>',
        type: 'project',
      },
      {
        blockId: 'b3',
        sectionTitle: '自我评价',
        label: '个人总结',
        content: '<p>性格开朗，沟通能力强</p>',
        type: 'self-evaluation',
      },
    ];

    // When currently polishing b1, project经历 b2 has highest priority
    const next = findNextBlockToOptimize(allBlocks, 'b1');
    expect(next).toEqual({
      blockId: 'b2',
      label: '项目经历 · 设备借用后台',
    });

    // When currently polishing b2, experience b1 comes next
    const nextFromB2 = findNextBlockToOptimize(allBlocks, 'b2');
    expect(nextFromB2?.blockId).toBe('b1');
  });

  it('generates rich dynamic followups with [X] guidance, next block relay, and sanitized model recommendations', async () => {
    const { generateDynamicFollowups } = await import('./followups');

    const res = generateDynamicFollowups({
      questions: [],
      proposals: [
        {
          action: 'updateBlock',
          blockId: 'b1',
          html: '<ul><li><strong>性能治理：</strong>排查卡顿并优化，使卡顿率降低 [X]%。</li></ul>',
          before: '<p>排查卡顿</p>',
          targetLabel: '工作经历 · 前端开发',
          factChecked: true,
        },
      ],
      missingFacts: [
        { label: '卡顿率降低比例', hint: '请填写实际百分比，如 30%' },
      ],
      followups: [
        '补充排查卡顿与ANR问题的具体工具链与思路',
        '建议写成独立主导架构升级', // should be filtered out (escalation)
        '将耗时从500ms缩短到200ms', // should be filtered out (hallucinated numbers)
      ],
      targetBlockId: 'b1',
      moduleType: 'experience',
      targetContent: '负责排查ANR和卡顿',
      allBlocks: [
        {
          blockId: 'b1',
          sectionTitle: '工作经历',
          label: '联想 Android',
          content: '<p>负责排查ANR和卡顿</p>',
        },
        {
          blockId: 'b2',
          sectionTitle: '项目经历',
          label: '超级互联',
          content: '<p>参与多端通信</p>',
        },
      ],
    });

    expect(res.followups.length).toBeLessThanOrEqual(3);
    expect(res.followupActions.length).toBeLessThanOrEqual(3);

    // 1. Must contain estimation guidance because [X] exists
    expect(res.followups.some((f) => f.includes('待确认数据'))).toBe(true);

    // 2. Must contain next block relay
    const nextBlockAction = res.followupActions.find((a) => a.kind === 'next_block');
    expect(nextBlockAction).toBeDefined();
    expect(nextBlockAction?.targetBlockId).toBe('b2');
    expect(nextBlockAction?.text).toContain('项目经历 · 超级互联');

    // 3. Must include sanitized model suggestion
    expect(
      res.followups.some((f) => f.includes('补充排查卡顿与ANR问题的具体工具链与思路')),
    ).toBe(true);

    // 4. Must NOT contain forbidden escalations or numbers
    expect(res.followups.join(' ')).not.toContain('独立主导');
    expect(res.followups.join(' ')).not.toContain('500ms');
  });
});
