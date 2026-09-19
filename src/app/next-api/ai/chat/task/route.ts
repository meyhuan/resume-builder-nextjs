import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { checkVipStatus } from '@/lib/api/vip-api';
import { consumeRateLimit } from '@/lib/ai/rate-limiter';
import { extractAIConfig } from '@/lib/ai/provider';
import { taskSchema, unifiedEnabled } from '@/lib/ai/unified/types';
import {
  AssistantError,
  reserveRequest,
  chargeRequest,
  finishRequest,
  failRequest,
} from '@/lib/ai/unified/ledger';
import { createJsonRunner, runAssistant } from '@/lib/ai/unified/engine';
import type { ResumeData } from '@/entities/resume/resume-data';
const bodySchema = z.object({
  task: taskSchema,
  requestId: z.string().uuid(),
  fromFollowup: z.boolean().default(false),
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
export async function POST(request: NextRequest) {
  let reservedId: string | undefined;
  try {
    if (!unifiedEnabled) throw new AssistantError('新版助手暂未开放', 404);
    const raw = await request.text();
    if (raw.length > 300000) throw new AssistantError('简历内容过长', 413);
    const body = bodySchema.parse(JSON.parse(raw));
    const auth = await checkVipStatus();
    if (!auth.userId) throw new AssistantError('请先登录', 401);
    if (
      !consumeRateLimit(
        `assistant-task:${auth.userId}`,
        auth.isVip ? 1000 : 100,
      ).allowed
    )
      throw new AssistantError('请求较多，请稍后再试', 429);
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          owner: auth.userId,
          task: body.task,
          text: body.text,
          fromFollowup: body.fromFollowup,
          resume: body.resumeData,
        }),
      )
      .digest('hex');
    const reserved = await reserveRequest(
      auth.userId,
      body.task,
      body.requestId,
      digest,
    );
    if (reserved.replay) return NextResponse.json({ turn: reserved.replay });
    reservedId = body.requestId;
    if (reserved.task.turns.length >= 60)
      throw new AssistantError('当前任务对话较长，请新建任务后继续');
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(150000),
    ]);
    const turn = await runAssistant({
      task: reserved.task.context,
      turns: reserved.task.turns,
      text: body.text,
      requestId: body.requestId,
      allowDirect: !body.fromFollowup,
      resume: body.resumeData as unknown as ResumeData,
      run: createJsonRunner(extractAIConfig(request), signal),
      charge: (feature) => {
        signal.throwIfAborted();
        return chargeRequest(auth.userId!, auth.isVip, body.requestId, feature);
      },
    });
    signal.throwIfAborted();
    await finishRequest(body.task.id, turn);
    return NextResponse.json({ turn });
  } catch (error) {
    if (reservedId) await failRequest(reservedId).catch(() => {});
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
    console.error(
      '[assistant-task] request failed',
      error instanceof Error ? error.name : 'unknown',
    );
    return NextResponse.json(
      { error: '这次处理未完成，原文没有改变。请重试或补充具体要求。' },
      { status: 503 },
    );
  }
}
