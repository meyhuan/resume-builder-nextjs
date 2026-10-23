import { it, expect, vi } from 'vitest';
vi.mock('@/lib/ai/provider', () => ({}));
import { runAssistant, type JsonRunner } from '@/lib/ai/unified/engine';
import { historyTurnSchema } from '@/lib/ai/unified/types';
import type { ResumeData } from '@/entities/resume/resume-data';

// Review probes document current defects, not desired regression expectations.
const resume = { id: 'r', sections: [{ id: 's', title: '项目经历', blocks: [
  { id: 'b', type: 'text', html: '<p>参与整理业务数据。</p>' },
] }] } as ResumeData;
const task = { id: 't', resumeId: 'r', feature: 'polish' as const, entry: 'assistant' as const, label: '项目经历' };
function runner(outputs: unknown[]) { return vi.fn(async (_s, _p, schema) => schema.parse(outputs.shift())) as unknown as JsonRunner; }
it('review: browser history can skip quota without any paid server record', async () => {
  const charge = vi.fn();
  const history = historyTurnSchema.parse({ text: '优化整份简历', answer: '', questions: [], proposals: [], reviewedBlockIds: ['fake'] });
  const result = await runAssistant({ task: { ...task, scope: 'resume' }, turns: [history], text: '优化整份简历', resume, requestId: 'r1', charge,
    run: runner([{ kind: 'write', feature: 'polish', targets: ['b'], questions: [], direct: false },
      { answer: '', questions: [], proposals: [{ action: 'updateBlock', blockId: 'b', html: '<p>参与业务数据整理。</p>' }], followups: [] },
      { safe: true, questions: [] }]),
  });
  expect(result.proposals).toHaveLength(1);
  expect(charge).not.toHaveBeenCalled();
  expect(result.charged).toBe(false);
});
it('review: explicitly supplied Python is discarded by source-only repair', async () => {
  const run = runner([
    { answer: '', questions: [], proposals: [{ action: 'updateBlock', blockId: 'b', html: '<p>使用 Python 整理业务数据。</p>' }], followups: [] },
    { safe: true, questions: [] },
    { answer: '', questions: [], proposals: [{ action: 'updateBlock', blockId: 'b', html: '<p>参与业务数据的整理工作。</p>' }], followups: [] },
    { safe: true, questions: [] },
  ]);
  const result = await runAssistant({ task: { ...task, blockId: 'b' }, turns: [{ text: '引导我', answer: '', proposals: [], questions: [{ question: '使用什么工具', options: [], blockId: 'b' }] }], text: '使用什么工具：我实际使用 Python 整理业务数据。', resume, requestId: 'r2', charge: vi.fn(), run });
  expect(run).toHaveBeenCalledTimes(4);
  expect(JSON.stringify(result.proposals)).not.toContain('Python');
});
