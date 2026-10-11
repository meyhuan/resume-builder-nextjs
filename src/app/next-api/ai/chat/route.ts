import { NextRequest } from 'next/server';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { extractAIConfig, getModel, AIConfigError } from '@/lib/ai/provider';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { createChatTools } from '@/lib/ai/tools';
import { toResumeContext } from '@/lib/ai/resume-context';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import type { ResumeData } from '@/entities/resume/resume-data';
import {
  resolveThinkingMode,
  type ThinkingMode,
} from '@/lib/ai/thinking-policy';

const MAX_ROUNDS = 10;
const MAX_MESSAGES = MAX_ROUNDS * 2;

function isComplexChat(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > 4) return true;
  const latest = messages[messages.length - 1];
  if (!latest || typeof latest !== 'object') return false;
  const content = (latest as { content?: unknown }).content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              part && typeof part === 'object' && 'text' in part
                ? String((part as { text?: unknown }).text ?? '')
                : '',
            )
            .join(' ')
        : '';
  return (
    text.length > 240 ||
    /全文|整份|规划|方案|比较|权衡|分析|为什么|职业方向|岗位匹配|面试/.test(text)
  );
}

/**
 * POST /next-api/ai/chat
 *
 * Streaming AI chat with resume-aware tools.
 * Resume state is sent from the client; the editor presents tool results for explicit review.
 * One user message consumes one ai:editor-assist quota.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:editor-assist', async () => {
      const { messages, resumeData, model: modelId, thinking } = (await request.json()) as {
        messages: unknown;
        resumeData?: ResumeData;
        model?: string;
        thinking?: ThinkingMode;
      };

      if (!resumeData) {
        return new Response(JSON.stringify({ error: '缺少简历数据' }), { status: 400 });
      }

      const aiConfig = extractAIConfig(request);
      const requestedThinking =
        thinking === 'disabled' || thinking === 'low'
          ? thinking
          : undefined;
      const model = getModel(
        aiConfig,
        modelId,
        resolveThinkingMode('chat', {
          requested: requestedThinking,
          complex: isComplexChat(messages),
        }),
      );
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
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 503 });
    }
    console.error('POST /next-api/ai/chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
