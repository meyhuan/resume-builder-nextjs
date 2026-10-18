import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, getModelByName } from '@/lib/ai/ai-runtime-config';
import { resolveThinkingMode } from '@/lib/ai/thinking-policy';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import {
  buildPolishSystemPrompt,
  buildPolishUserPrompt,
} from '@/lib/ai/section-prompt-builder';
import { sanitizePolishedHtml, toMissingFacts } from '@/lib/ai/output-guards';
import type { PolishSectionRequest } from '@/lib/ai/section-types';
import { MIN_POLISH_CONTENT_LENGTH } from '@/lib/ai/section-types';

/**
 * POST /next-api/ai/polish-section
 *
 * Accepts section content + identity + polish level + optional JD,
 * returns an SSE text stream of the polished HTML content.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:polish-section', async () => {
    const body: PolishSectionRequest = await request.json();
    const {
      content,
      identity,
      moduleType,
      polishLevel,
      jobDescription,
      realisticMode = false,
      model: modelName,
    } = body;

    if (!content || content.trim().length < MIN_POLISH_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `内容不少于${MIN_POLISH_CONTENT_LENGTH}个字符` },
        { status: 400 },
      );
    }

    if (!identity || !moduleType || !polishLevel) {
      return NextResponse.json(
        { error: '缺少必填字段：identity、moduleType、polishLevel' },
        { status: 400 },
      );
    }

    const modelConfig = getModelByName(modelName ?? '');
    const client = createOpenAIClient(
      modelConfig,
      polishLevel === 'jd-match'
        ? resolveThinkingMode('jd-match')
        : resolveThinkingMode('default'),
    );

    const systemPrompt: string = buildPolishSystemPrompt(
      identity,
      moduleType,
      polishLevel,
      realisticMode,
    );
    const userPrompt: string = buildPolishUserPrompt(content, jobDescription);

    const stream = await client.chat.completions.create({
      model: modelConfig.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.35,
      max_tokens: 4096,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller): Promise<void> {
        try {
          let accumulated = '';
          for await (const chunk of stream) {
            const delta: string | null | undefined =
              chunk.choices[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              const sseData: string = `data: ${JSON.stringify({ content: delta })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }
          if (accumulated.trim()) {
            const sanitized = sanitizePolishedHtml(
              content,
              accumulated,
              moduleType,
              realisticMode,
            );
            const missingFacts = toMissingFacts(sanitized);
            if (sanitized !== accumulated || missingFacts.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    replaceHtml: sanitized,
                    missingFacts,
                  })}\n\n`,
                ),
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamError) {
          const errorMsg: string =
            streamError instanceof Error
              ? streamError.message
              : 'Stream error';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMsg })}\n\n`,
            ),
          );
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
    const message: string =
      error instanceof Error ? error.message : '服务器内部错误';
    console.error('[polish-section] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
