import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getModelByName, resolveApiKey } from '@/lib/ai/ai-config';
import { applyRateLimit } from '@/lib/ai/with-rate-limit';
import {
  buildPolishSystemPrompt,
  buildPolishUserPrompt,
} from '@/lib/ai/section-prompt-builder';
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
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

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
        { error: `Content must be at least ${MIN_POLISH_CONTENT_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (!identity || !moduleType || !polishLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: identity, moduleType, polishLevel' },
        { status: 400 },
      );
    }

    const modelConfig = getModelByName(modelName ?? '');
    const apiKey: string = resolveApiKey(modelConfig);

    const client = new OpenAI({
      apiKey,
      baseURL: modelConfig.baseUrl,
    });

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
      temperature: 0.6,
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
      error instanceof Error ? error.message : 'Internal server error';
    console.error('[polish-section] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
