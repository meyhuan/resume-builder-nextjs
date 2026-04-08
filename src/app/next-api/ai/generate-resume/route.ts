import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getModelByName, resolveApiKey } from '@/lib/ai/ai-config';
import { checkQuota } from '@/lib/quota/quota-checker';
import { applyRateLimit } from '@/lib/ai/with-rate-limit';
import {
  buildSystemPrompt,
  buildResumePrompt,
} from '@/lib/ai/resume-prompt-builder';
import type { WizardInput } from '@/lib/ai/resume-prompt-builder';

/**
 * Request body shape for the generate-resume endpoint.
 */
interface GenerateResumeBody {
  readonly wizardData: WizardInput;
  readonly model?: string;
}

/**
 * POST /next-api/ai/generate-resume
 *
 * Accepts wizard data, builds a prompt, calls the AI model via streaming,
 * and returns an SSE text stream of the generated JSON resume.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Check AI quota for generate-resume (VIP users bypass)
    const quota = await checkQuota('ai:generate-resume');
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.message,
          quotaExceeded: true,
          remaining: quota.remaining,
        },
        { status: 429 },
      );
    }

    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const body: GenerateResumeBody = await request.json();
    const { wizardData, model: modelName } = body;

    if (!wizardData?.identity || !wizardData?.targetRole) {
      return NextResponse.json(
        { error: '缺少必填字段：identity 和 targetRole' },
        { status: 400 },
      );
    }

    const modelConfig = getModelByName(modelName ?? '');
    const apiKey: string = resolveApiKey(modelConfig);

    const client = new OpenAI({
      apiKey,
      baseURL: modelConfig.baseUrl,
    });

    const systemPrompt: string = buildSystemPrompt();
    const userPrompt: string = buildResumePrompt(wizardData);

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
            const content: string | null | undefined =
              chunk.choices[0]?.delta?.content;
            if (content) {
              const sseData: string = `data: ${JSON.stringify({ content })}\n\n`;
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
    console.error('[generate-resume] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
