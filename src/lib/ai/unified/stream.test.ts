import { expect, it, vi } from 'vitest';
import {
  draftPreview,
  readAssistantResponse,
  AssistantStreamError,
} from './stream';
const turn = {
  requestId: 'r',
  text: '帮我写',
  answer: '完成',
  questions: [],
  proposals: [],
  followups: [],
  direct: false,
  charged: true,
  feature: 'chat',
};
const line = (event: Record<string, unknown>) =>
  JSON.stringify({ requestId: 'r', ...event }) + '\n';
function response(parts: Uint8Array[]) {
  return new Response(
    new ReadableStream({
      start(c) {
        for (const part of parts) c.enqueue(part);
        c.close();
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson' } },
  );
}
it('decodes split Chinese UTF-8, split lines, coalesced events and a final line without a newline', async () => {
  const bytes = new TextEncoder().encode(
    line({ type: 'preview', text: '中文草稿' }) +
      line({ type: 'progress', stage: 'checking' }) +
      line({ type: 'result', turn }).trimEnd(),
  );
  const callback = vi.fn();
  const result = await readAssistantResponse(
    response(Array.from(bytes, (byte) => new Uint8Array([byte]))),
    'r',
    new AbortController().signal,
    callback,
  );
  expect(result).toMatchObject(turn);
  expect(callback.mock.calls[0][0].text).toBe('中文草稿');
  expect(callback.mock.calls[1][0].stage).toBe('checking');
});
it('requires a checked final result and matching request identity', async () => {
  const encoder = new TextEncoder();
  await expect(
    readAssistantResponse(
      response([encoder.encode(line({ type: 'preview', text: '草稿' }))]),
      'r',
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow('响应中断');
  await expect(
    readAssistantResponse(
      response([
        encoder.encode(
          line({ type: 'preview', requestId: 'other', text: '草稿' }),
        ),
      ]),
      'r',
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow('不匹配');
  await expect(
    readAssistantResponse(
      response([
        encoder.encode(
          line({
            type: 'result',
            turn: {
              ...turn,
              proposals: [
                { action: 'updateBlock', blockId: 'b', html: '未经核对' },
              ],
            },
          }),
        ),
      ]),
      'r',
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow();
});
it('preserves stream error metadata for quota and timeout handling', async () => {
  await expect(
    readAssistantResponse(
      response([
        new TextEncoder().encode(
          line({
            type: 'error',
            error: '额度不足',
            status: 429,
            quotaExceeded: true,
          }),
        ),
      ]),
      'r',
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toBeInstanceOf(AssistantStreamError);
});
it('extracts only user-facing text and strips HTML, incomplete tags and executable content', () => {
  expect(draftPreview({ reasoning: '内部推理', safe: true })).toBe('');
  expect(
    draftPreview({
      answer: '已整理',
      proposals: [
        {
          action: 'updateBlock',
          html: '<p>协助登记</p><script>bad()</script><im',
        },
      ],
    }),
  ).toBe('协助登记');
  expect(draftPreview({ answer: '普通建议' })).toBe('普通建议');
});
