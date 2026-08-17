import { NextRequest } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { extractAIConfig, getModel, AIConfigError } from '@/lib/ai/provider';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { createChatTools } from '@/lib/ai/tools';
import { toResumeContext } from '@/lib/ai/resume-context';
import type { ResumeData } from '@/entities/resume/resume-data';

const MAX_ROUNDS = 10;
const MAX_MESSAGES = MAX_ROUNDS * 2;

/**
 * POST /next-api/ai/chat
 *
 * Streaming AI chat with resume-aware tools.
 * Resume state is sent from the client; the editor auto-applies tool results.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { messages, resumeData, model: modelId } = (await request.json()) as {
      messages: unknown;
      resumeData?: ResumeData;
      model?: string;
    };

    if (!resumeData) {
      return new Response(JSON.stringify({ error: '缺少简历数据' }), { status: 400 });
    }

    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig, modelId);
    const resumeContext = toResumeContext(resumeData);
    const modelMessages = await convertToModelMessages(messages as never);
    const truncatedMessages = modelMessages.slice(-MAX_MESSAGES);
    const tools = createChatTools({ resumeData, aiConfig });

    const result = streamText({
      model,
      system: getSystemPrompt(resumeContext),
      messages: truncatedMessages,
      tools,
      stopWhen: stepCountIs(25),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof AIConfigError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 503 });
    }
    console.error('POST /next-api/ai/chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
