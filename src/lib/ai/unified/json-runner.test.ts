import { beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
const m = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('ai', () => ({ generateText: m.generate }));
vi.mock('@/lib/ai/provider', () => ({
  getModel: () => ({}),
  getJsonProviderOptions: () => ({}),
}));
import { createJsonRunner, runAssistant } from './engine';
import type { ResumeData } from '@/entities/resume/resume-data';
const runner = () =>
  createJsonRunner(
    { provider: 'dashscope', model: '', apiKey: '', baseURL: '' },
    new AbortController().signal,
  );
beforeEach(() => vi.resetAllMocks());
it('retries with schema feedback without exposing invalid content', async () => {
  m.generate
    .mockResolvedValueOnce({ text: '{"safe":"private-invalid-content"}' })
    .mockResolvedValueOnce({ text: '{"safe":true}' });
  expect(
    await runner()('仅返回JSON', '检查', z.object({ safe: z.boolean() })),
  ).toEqual({ safe: true });
  expect(m.generate.mock.calls[1][0].system).toContain('safe: invalid_type');
  expect(m.generate.mock.calls[1][0].system).not.toContain(
    'private-invalid-content',
  );
});
it('failed audit format produces confirmation questions, never unchecked edits', async () => {
  for (const output of [
    { kind: 'write', feature: 'polish', targets: ['b'], direct: true },
    {
      answer: '改好了',
      proposals: [
        { action: 'updateBlock', blockId: 'b', html: '<p>协助完成登记</p>' },
      ],
    },
    { safe: 'yes' },
    { safe: 'yes' },
  ])
    m.generate.mockResolvedValueOnce({ text: JSON.stringify(output) });
  const result = await runAssistant({
    task: {
      id: 't',
      resumeId: 'r',
      feature: 'polish',
      blockId: 'b',
      label: '经历',
      entry: 'module',
    },
    turns: [],
    text: '直接修改这段',
    requestId: 'req',
    resume: {
      id: 'r',
      name: '测试',
      sections: [
        {
          id: 's',
          title: '经历',
          blocks: [{ id: 'b', type: 'text', html: '<p>协助登记</p>' }],
        },
      ],
    } as ResumeData,
    run: runner(),
    charge: async () => {},
  });
  expect(result.proposals).toEqual([]);
  expect(result.answer).toBe('');
  expect(result.direct).toBe(false);
  expect(result.questions).toHaveLength(1);
  expect(m.generate).toHaveBeenCalledTimes(4);
});
