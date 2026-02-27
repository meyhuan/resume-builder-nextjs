import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getModelByName, resolveApiKey } from '@/lib/ai/ai-config';
import { applyRateLimit } from '@/lib/ai/with-rate-limit';
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
} from '@/lib/ai/section-prompt-builder';
import type { GenerateSectionRequest } from '@/lib/ai/section-types';

/**
 * POST /next-api/ai/generate-section
 *
 * Accepts guided question answers + identity + module type + optional JD,
 * returns an SSE text stream of the generated HTML content.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const body: GenerateSectionRequest = await request.json();
    const {
      identity,
      moduleType,
      answers,
      jobDescription,
      jobCategory,
      realisticMode,
      model: modelName,
    } = body;

    if (!identity || !moduleType) {
      return NextResponse.json(
        { error: '缺少必填字段：identity、moduleType' },
        { status: 400 },
      );
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: '请至少填写一项信息' },
        { status: 400 },
      );
    }

    const modelConfig = getModelByName(modelName ?? '');
    const apiKey: string = resolveApiKey(modelConfig);

    const client = new OpenAI({
      apiKey,
      baseURL: modelConfig.baseUrl,
    });

    const systemPrompt: string = buildGenerateSystemPrompt(identity, moduleType, jobCategory, realisticMode);
    const userPrompt: string = buildGenerateUserPrompt(answers, jobDescription);

    const stream = await client.chat.completions.create({
      model: modelConfig.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller): Promise<void> {
        try {
          for await (const chunk of stream) {
            const delta: string | null | undefined =
              chunk.choices[0]?.delta?.content;
            if (delta) {
              const sseData: string = `data: ${JSON.stringify({ content: delta })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
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
  } catch (error) {
    const message: string =
      error instanceof Error ? error.message : '服务器内部错误';
    console.error('[generate-section] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
