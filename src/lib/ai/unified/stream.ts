import { z } from 'zod';
import { plainText } from './policy';
import { draftSchema, type AssistantTurn } from './types';

export const ASSISTANT_STAGES = {
  planning: '正在理解你的要求…',
  generating: '正在生成草稿…',
  retrying: '正在重新整理草稿格式…',
  checking: '草稿已生成，正在核对事实…',
} as const;

const turnSchema = draftSchema.omit({ reviewedBlockIds: true }).extend({
  requestId: z.string(),
  text: z.string(),
  proposals: z
    .array(
      draftSchema.shape.proposals.unwrap().element.and(
        z.object({
          before: z.string(),
          targetLabel: z.string(),
          factChecked: z.literal(true),
        }),
      ),
    )
    .max(30),
  direct: z.boolean(),
  charged: z.boolean(),
  feature: z.enum(['chat', 'polish', 'generate']),
  scope: z.literal('resume').optional(),
  coverage: z
    .array(
      z.object({
        blockId: z.string(),
        label: z.string(),
        status: z.enum([
          'proposed',
          'unchanged',
          'confirmation',
          'unreviewed',
          'empty',
        ]),
      }),
    )
    .optional(),
});
export const assistantEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('progress'),
    requestId: z.string(),
    stage: z.enum(['planning', 'generating', 'retrying', 'checking']),
  }),
  z.object({
    type: z.literal('preview'),
    requestId: z.string(),
    text: z.string().max(120000),
  }),
  z.object({
    type: z.literal('result'),
    requestId: z.string(),
    turn: turnSchema,
  }),
  z.object({
    type: z.literal('error'),
    requestId: z.string(),
    error: z.string(),
    status: z.number(),
    quotaExceeded: z.boolean().optional(),
    errorCode: z.string().optional(),
  }),
]);
export type AssistantStreamEvent = z.infer<typeof assistantEventSchema>;
export type AssistantStage = keyof typeof ASSISTANT_STAGES;

// Only user-facing draft fields are displayed, as text. Never expose routing,
// reasoning, JSON syntax, or audit output, and never treat a preview as a turn.
export function draftPreview(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const draft = value as Record<string, unknown>;
  const proposals = Array.isArray(draft.proposals) ? draft.proposals : [];
  const content = proposals
    .map((proposal) => {
      if (!proposal || typeof proposal !== 'object') return '';
      const p = proposal as Record<string, unknown>;
      if (p.action === 'updateBlock' && typeof p.html === 'string')
        return p.html;
      if (p.action === 'addSection' && typeof p.contentHtml === 'string')
        return p.contentHtml;
      if (p.action === 'suggestSkills' && Array.isArray(p.skills))
        return p.skills.filter((s) => typeof s === 'string').join('、');
      return '';
    })
    .filter(Boolean);
  const text = content.length
    ? content.join('\n\n')
    : typeof draft.answer === 'string'
      ? draft.answer
      : '';
  return plainText(
    text
      .replace(/<(?:script|style)[\s\S]*?(?:<\/(?:script|style)>|$)/gi, '')
      .replace(/<[^>]*$/g, ''),
  ).slice(0, 120000);
}

export class AssistantStreamError extends Error {
  constructor(
    public payload: Extract<AssistantStreamEvent, { type: 'error' }>,
  ) {
    super(payload.error);
  }
}

export async function readAssistantResponse(
  response: Response,
  requestId: string,
  signal: AbortSignal,
  onEvent: (event: AssistantStreamEvent) => void,
): Promise<AssistantTurn> {
  // Compatibility with existing clients, test fixtures and rolling releases.
  if (
    !response.headers?.get('content-type')?.includes('application/x-ndjson')
  ) {
    const parsed = turnSchema.safeParse((await response.json()).turn);
    if (!parsed.success) throw new Error('响应格式不正确，请重新生成');
    return parsed.data;
  }
  if (!response.body) throw new Error('响应中断，请重新生成');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let turn: AssistantTurn | undefined;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  const parseLine = (line: string) => {
    if (!line.trim()) return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error('响应格式不正确，请重新生成');
    }
    const parsed = assistantEventSchema.safeParse(value);
    if (!parsed.success) throw new Error('响应格式不正确，请重新生成');
    const event = parsed.data;
    if (
      event.requestId !== requestId ||
      (event.type === 'result' && event.turn.requestId !== requestId)
    )
      throw new Error('返回结果不匹配，请重试');
    if (turn) throw new Error('响应格式不正确，请重试');
    if (event.type === 'error') throw new AssistantStreamError(event);
    if (event.type === 'result') turn = event.turn;
    else onEvent(event);
  };
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 1000000) throw new Error('响应内容过长，请重新生成');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        parseLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    parseLine(buffer);
    if (!turn) throw new Error('响应中断，请重新生成');
    return turn;
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
