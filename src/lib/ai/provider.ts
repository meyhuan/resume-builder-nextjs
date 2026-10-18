import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import {
  createThinkingFetch,
  getModelByName,
  resolveApiKey,
} from '@/lib/ai/ai-runtime-config';
import type { ThinkingMode } from '@/lib/ai/thinking-policy';

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL: string;
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigError';
  }
}

/**
 * Extract AI config from request headers.
 *
 * The server currently uses OpenAI-compatible DashScope endpoints for the
 * configured Qwen and DeepSeek models. The API key is read from the model's
 * configured server-side environment variable.
 * We keep the multi-provider shape (openai/anthropic/gemini) as an extension
 * point for future "bring your own key" support.
 */
export function extractAIConfig(request: NextRequest): AIConfig {
  const provider = request.headers.get('x-provider') || 'dashscope';
  const model = request.headers.get('x-model') || '';
  return { provider, model, apiKey: '', baseURL: '' };
}

export function getModel(
  config: AIConfig,
  modelOverride?: string,
  thinkingMode: ThinkingMode = 'disabled',
) {
  switch (config.provider) {
    case 'dashscope':
    default: {
      const modelConfig = getModelByName(modelOverride || config.model);
      let apiKey: string;
      try { apiKey = resolveApiKey(modelConfig); }
      catch { throw new AIConfigError('AI 服务未配置，请联系管理员'); }
      if (!apiKey) {
        throw new AIConfigError('AI 服务未配置，请联系管理员');
      }
      const client = createOpenAI({
        apiKey,
        baseURL: modelConfig.baseUrl,
        fetch: createThinkingFetch(modelConfig, thinkingMode),
      });
      return client.chat(modelConfig.name);
    }
  }
}

/**
 * Returns providerOptions for JSON mode.
 * DashScope compatible-mode supports `response_format: { type: 'json_object' }`.
 */
export function getJsonProviderOptions(config: AIConfig) {
  if (config.provider === 'dashscope') {
    return { openai: { response_format: { type: 'json_object' as const } } };
  }
  return {} as Record<string, never>;
}
