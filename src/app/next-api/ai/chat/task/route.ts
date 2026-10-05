import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkVipStatus } from '@/lib/api/vip-api';
import { consumeRateLimit } from '@/lib/ai/rate-limiter';
import { extractAIConfig } from '@/lib/ai/provider';
import {
  taskSchema,
  historyTurnSchema,
  MAX_TASK_TURNS,
  messageSourceSchema,
} from '@/lib/ai/unified/types';
import { AssistantError, consumeAssistantQuota } from '@/lib/ai/unified/quota';
import { createJsonRunner, runAssistant } from '@/lib/ai/unified/engine';
import type { ResumeData } from '@/entities/resume/resume-data';
import type {
  AssistantStage,
  AssistantStreamEvent,
} from '@/lib/ai/unified/stream';
const bodySchema = z.object({
  task: taskSchema,
  turns: z
    .array(historyTurnSchema)
    .max(MAX_TASK_TURNS - 1)
    .default([]),
  requestId: z.string().uuid(),
  fromFollowup: z.boolean().default(false),
  messageSource: messageSourceSchema.optional(),
  followupTargetId: z.string().min(1).max(100).optional(),
  text: z.string().trim().min(1).max(6000),
  resumeData: z
    .object({
      id: z.string().optional(),
      sections: z
        .array(
          z
            .object({
              id: z.string(),
              title: z.string(),
              blocks: z
                .array(
                  z.object({ id: z.string(), type: z.string() }).passthrough(),
                )
                .max(80),
            })
            .passthrough(),
        )
        .max(40),
    })
    .passthrough(),
});
export const maxDuration = 180;
function failure(error: unknown) {
  if (error instanceof AssistantError)
    return {
      error: error.message,
      quotaExceeded: error.quotaExceeded,
      status: error.status,
    };
  console.error(
    '[assistant-task] request failed',
    error instanceof Error ? error.name : 'unknown',
  );
  return {
    error: '这次处理未完成，原文没有改变。请重试或补充具体要求。',
    errorCode:
      error instanceof Error && error.name === 'TimeoutError'
        ? 'timeout'
        : 'server',
    status: 503,
  };
}
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > 300000)
      throw new AssistantError('简历或对话内容过长，请精简内容或新建对话', 413);
    const body = bodySchema.parse(JSON.parse(raw));
    const auth = await checkVipStatus();
    if (!auth.userId || !auth.unionid)
      throw new AssistantError('请先登录', 401);
    if (
      !consumeRateLimit(
        `assistant-task:${auth.userId}`,
        auth.isVip ? 1000 : 100,
      ).allowed
    )
      throw new AssistantError('请求较多，请稍后再试', 429);
    const cancelled = new AbortController();
    const signal = AbortSignal.any([
      request.signal,
      cancelled.signal,
      AbortSignal.timeout(150000),
    ]);
    // One charge per invocation only. Independent HTTP retries are new attempts.
    let chargePromise: Promise<void> | undefined;
    const messageSource =
      body.messageSource || (body.fromFollowup ? 'suggestion' : 'user');
    const execute = (emit?: (event: AssistantStreamEvent) => void) =>
      runAssistant({
        task: body.task,
        turns: body.turns,
        text: body.text,
        messageSource,
        followupTargetId: body.followupTargetId,
        requestId: body.requestId,
        allowDirect: !body.fromFollowup && messageSource === 'user',
        resume: body.resumeData as unknown as ResumeData,
        run: createJsonRunner(extractAIConfig(request), signal),
        ...(emit
          ? {
              onProgress: (stage: AssistantStage) =>
                emit({ type: 'progress', requestId: body.requestId, stage }),
              onPreview: (text: string) =>
                emit({ type: 'preview', requestId: body.requestId, text }),
            }
          : {}),
        charge: (feature) => {
          signal.throwIfAborted();
          return (chargePromise ??= consumeAssistantQuota(
            auth.unionid!,
            auth.isVip,
            feature,
            auth.javaUserId,
          ));
        },
      }).then((turn) => ({ ...turn, messageSource }));
    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      const encoder = new TextEncoder();
      let active = true;
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emit = (event: AssistantStreamEvent) => {
            if (active)
              controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          };
          try {
            const turn = await execute(emit);
            signal.throwIfAborted();
            emit({ type: 'result', requestId: body.requestId, turn });
          } catch (error) {
            if (active)
              emit({
                type: 'error',
                requestId: body.requestId,
                ...failure(error),
              });
          } finally {
            if (active) {
              active = false;
              controller.close();
            }
          }
        },
        cancel() {
          active = false;
          cancelled.abort();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }
    const turn = await execute();
    signal.throwIfAborted();
    return NextResponse.json({ turn });
  } catch (error) {
    if (error instanceof AssistantError)
      return NextResponse.json(
        { error: error.message, quotaExceeded: error.quotaExceeded },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: '请求格式不正确，请重新选择任务' },
        { status: 400 },
      );
    const { status, ...payload } = failure(error);
    return NextResponse.json(payload, { status });
  }
}
