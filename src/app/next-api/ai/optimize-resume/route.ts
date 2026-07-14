import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getModelByName, resolveApiKey } from '@/lib/ai/ai-runtime-config';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import {
  buildOptimizeSystemPrompt,
  buildOptimizeUserPrompt,
  MIN_OPTIMIZE_CONTENT_LENGTH,
  MAX_OPTIMIZE_JD_LENGTH,
} from '@/lib/ai/optimize-resume-prompt-builder';
import type { OptimizeResumeRequest } from '@/lib/ai/optimize-resume-prompt-builder';
import { getCurrentUser } from '@/lib/auth/current-user';
import { parseResumeFacts } from '@/lib/jobs/fact-extractor';
import { prisma } from '@/lib/prisma';

/**
 * POST /next-api/ai/optimize-resume
 *
 * Accepts the full set of optimizable resume blocks + identity + optional JD.
 * Returns a streaming SSE response that accumulates into a JSON map of
 * { blockId: optimizedHtml } — applied by the client after user confirms preview.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:optimize-resume', async () => {
    const body: OptimizeResumeRequest = await request.json();
    const {
      blocks,
      identity,
      jobDescription,
      jobId,
      realisticMode = false,
      model: modelName,
    } = body;

    if (!identity) {
      return NextResponse.json({ error: '缺少必填字段：identity' }, { status: 400 });
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: '没有可优化的简历模块' }, { status: 400 });
    }

    const filteredBlocks = blocks.filter(
      (b) => b.contentHtml && b.contentHtml.replace(/<[^>]*>/g, '').trim().length >= MIN_OPTIMIZE_CONTENT_LENGTH,
    );

    if (filteredBlocks.length === 0) {
      return NextResponse.json({ error: '所有模块内容过少，请先填写简历内容再使用一键优化' }, { status: 400 });
    }

    let effectiveIdentity = identity;
    let effectiveJd = jobDescription;
    let confirmedEvidence: Array<{ blockId: string; text: string }> = [];
    if (jobId) {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
      const job = await prisma.job.findFirst({
        where: { id: jobId, userId: user.id },
        include: { factSet: { select: { facts: true, confirmedFactIds: true, confirmedAt: true } } },
      });
      if (!job) return NextResponse.json({ error: '岗位不存在' }, { status: 404 });
      if (!job.factSet.confirmedAt) {
        return NextResponse.json({ error: '请先确认可用于该岗位的真实事实' }, { status: 409 });
      }
      const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
        ? new Set(job.factSet.confirmedFactIds.filter((value): value is string => typeof value === 'string'))
        : new Set<string>();
      confirmedEvidence = parseResumeFacts(job.factSet.facts)
        .filter((fact) => confirmedIds.has(fact.id))
        .map((fact) => ({ blockId: fact.blockId, text: fact.text.trim().slice(0, 2000) }))
        .slice(0, 50);
      if (job.identity === 'student' || job.identity === 'graduate' || job.identity === 'professional') {
        effectiveIdentity = job.identity;
      }
      effectiveJd = job.jd;
    }

    const truncatedJd = effectiveJd
      ? effectiveJd.slice(0, MAX_OPTIMIZE_JD_LENGTH)
      : undefined;

    const modelConfig = getModelByName(modelName ?? '');
    const apiKey: string = resolveApiKey(modelConfig);

    const client = new OpenAI({
      apiKey,
      baseURL: modelConfig.baseUrl,
    });

    const systemPrompt = buildOptimizeSystemPrompt(effectiveIdentity, realisticMode || Boolean(jobId));
    const userPrompt = buildOptimizeUserPrompt(filteredBlocks, truncatedJd, confirmedEvidence);

    const stream = await client.chat.completions.create({
      model: modelConfig.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.6,
      max_tokens: 8192,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller): Promise<void> {
        try {
          for await (const chunk of stream) {
            const delta: string | null | undefined = chunk.choices[0]?.delta?.content;
            if (delta) {
              const sseData = `data: ${JSON.stringify({ content: delta })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          const errorMsg = streamError instanceof Error ? streamError.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[optimize-resume] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
