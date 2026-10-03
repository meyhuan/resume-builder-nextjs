import { beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
const m = vi.hoisted(() => ({ generate: vi.fn(), stream: vi.fn() }));
vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText: m.generate,
  streamText: m.stream,
}));
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
function streamParts(parts: unknown[]) {
  return {
    fullStream: (async function* () {
      for (const part of parts) yield part;
    })(),
  };
}
it('streams partial draft JSON and validates the complete output without using non-streaming generation', async () => {
  m.stream.mockReturnValue(
    streamParts([
      { type: 'reasoning-delta', text: 'private reasoning' },
      { type: 'text-delta', text: '{"answer":"协助' },
      { type: 'text-delta', text: '完成登记"}' },
    ]),
  );
  const onPartial = vi.fn();
  expect(
    await runner()('JSON', '生成', z.object({ answer: z.string() }), {
      onPartial,
      onRetry: vi.fn(),
    }),
  ).toEqual({ answer: '协助完成登记' });
  expect(onPartial.mock.calls[0][0]).toEqual({ answer: '协助' });
  expect(onPartial.mock.calls.at(-1)?.[0]).toEqual({ answer: '协助完成登记' });
  expect(JSON.stringify(onPartial.mock.calls)).not.toContain(
    'private reasoning',
  );
  expect(m.generate).not.toHaveBeenCalled();
});
it('clears the invalid preview before retrying draft formatting', async () => {
  m.stream
    .mockReturnValueOnce(
      streamParts([{ type: 'text-delta', text: '{"answer":12}' }]),
    )
    .mockReturnValueOnce(
      streamParts([{ type: 'text-delta', text: '{"answer":"新草稿"}' }]),
    );
  const onRetry = vi.fn();
  expect(
    await runner()('JSON', '生成', z.object({ answer: z.string() }), {
      onPartial: vi.fn(),
      onRetry,
    }),
  ).toEqual({ answer: '新草稿' });
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(m.stream.mock.calls[1][0].system).toContain('answer: invalid_type');
});
it('does not convert upstream stream errors to successful draft output or silently retry them', async () => {
  const failure = new Error('provider failed');
  m.stream.mockReturnValue(
    streamParts([
      { type: 'text-delta', text: '{"answer":"部分内容' },
      { type: 'error', error: failure },
    ]),
  );
  await expect(
    runner()('JSON', '生成', z.object({ answer: z.string() }), {
      onPartial: vi.fn(),
      onRetry: vi.fn(),
    }),
  ).rejects.toBe(failure);
  expect(m.stream).toHaveBeenCalledTimes(1);
});
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
