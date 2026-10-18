import 'server-only'
import OpenAI from 'openai'
import { fetchWithFailover } from '@/lib/ai/provider-failover'
import {
  getThinkingRequestFields,
  type ThinkingMode,
  type ThinkingProtocol,
} from '@/lib/ai/thinking-policy'

/**
 * Server-side AI model configuration registry.
 * API keys are read from server-side environment variables only.
 */
export interface AiModelConfig {
  readonly name: string
  readonly displayName: string
  readonly baseUrl: string
  readonly apiKeyEnv: string
  /** How this model expects reasoning controls to be sent. */
  readonly thinkingProtocol: ThinkingProtocol
  /** Whether this model accepts the reasoning controls above. */
  readonly supportsThinking: boolean
  /** Optional provider-specific budget for the product's low/high modes. */
  readonly thinkingBudget?: number
  /** Disable routing for isolated provider benchmarks. */
  readonly allowFallback?: boolean
}

const DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL ??
  'https://llm-wwerfrg4elkhrxzz.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'

/**
 * Model registry. Add or update a model here rather than spreading model
 * names, endpoints, or reasoning adapters across route handlers.
 */
export const AI_MODEL_REGISTRY: readonly AiModelConfig[] = [
  {
    name: 'deepseek-flash',
    displayName: 'DeepSeek 官方（百炼备用）',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    thinkingProtocol: 'deepseek',
    supportsThinking: true,
  },
  {
    name: 'qwen-plus',
    displayName: '通义千问 Plus',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    thinkingProtocol: 'dashscope',
    supportsThinking: false,
  },
  {
    name: 'qwen-max',
    displayName: '通义千问 Max',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    thinkingProtocol: 'dashscope',
    supportsThinking: false,
  },
  {
    name: 'qwen-vl-plus',
    displayName: '通义千问 VL Plus',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    thinkingProtocol: 'dashscope',
    supportsThinking: false,
  },
  {
    name: 'qwen3.5-ocr',
    displayName: '通义千问 OCR',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    thinkingProtocol: 'dashscope',
    supportsThinking: false,
  },
  {
    name: 'deepseek-v4.1-flash',
    displayName: 'DeepSeek V4.1 Flash',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    thinkingProtocol: 'dashscope',
    supportsThinking: true,
    thinkingBudget: 2048,
  },
] as const

/** Override these without changing route code when the provider model changes. */
const DEFAULT_MODEL_NAME = process.env.AI_DEFAULT_MODEL ?? 'deepseek-flash'
const VISION_MODEL_NAME = process.env.AI_VISION_MODEL ?? 'qwen3.5-ocr'

export function getDefaultModel(): AiModelConfig {
  return AI_MODEL_REGISTRY.find((model) => model.name === DEFAULT_MODEL_NAME) ?? AI_MODEL_REGISTRY[0]
}

export function getVisionModel(): AiModelConfig {
  return AI_MODEL_REGISTRY.find((model) => model.name === VISION_MODEL_NAME) ?? getDefaultModel()
}

export function getModelByName(name: string): AiModelConfig {
  return AI_MODEL_REGISTRY.find((model) => model.name === name) ?? getDefaultModel()
}

export function resolveApiKey(model: AiModelConfig): string {
  const key: string = process.env[model.apiKeyEnv] ||
    (model.name === 'deepseek-flash' && model.allowFallback !== false &&
      process.env.AI_PROVIDER_FALLBACK !== 'false' && process.env.DASHSCOPE_API_KEY
      ? 'provider-routing-placeholder' : '')
  if (!key) {
    throw new Error(`Missing environment variable: ${model.apiKeyEnv}`)
  }
  return key
}

/**
 * Add the provider's reasoning fields to OpenAI-compatible requests.
 *
 * The Vercel AI SDK intentionally validates its provider options and drops
 * unknown fields. A fetch middleware lets DashScope and DeepSeek keep their
 * native request shapes while the application uses one stable policy.
 */
export function createThinkingFetch(
  model: AiModelConfig,
  mode: ThinkingMode,
): typeof fetch {
  const baseFetch = globalThis.fetch.bind(globalThis)
  return async (input, init) => {
    const body = init?.body
    if (!model.supportsThinking || typeof body !== 'string') {
      return baseFetch(input, init)
    }

    let parsed: Record<string, unknown>
    try {
      const candidate: unknown = JSON.parse(body)
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return baseFetch(input, init)
      }
      parsed = candidate as Record<string, unknown>
    } catch {
      return baseFetch(input, init)
    }

    if (!('messages' in parsed) || !('model' in parsed)) {
      return baseFetch(input, init)
    }

    const patchedBody = JSON.stringify({
      ...parsed,
      ...getThinkingRequestFields(model.thinkingProtocol, mode, model.thinkingBudget),
    })
    if (model.name !== 'deepseek-flash' || model.allowFallback === false || process.env.AI_PROVIDER_FALLBACK === 'false') {
      return baseFetch(input, { ...init, body: patchedBody })
    }
    const backup = AI_MODEL_REGISTRY.find(m => m.name === 'deepseek-v4.1-flash')!
    const backupKey = process.env[backup.apiKeyEnv]
    const officialKey = process.env[model.apiKeyEnv]
    const positive = (key: string, fallback: number) => {
      const value = Number(process.env[key]);
      return Number.isFinite(value) && value > 0 ? value : fallback
    }
    const sendBackup = backupKey ? (signal: AbortSignal) => {
      const headers = new Headers(init?.headers)
      headers.set('authorization', `Bearer ${backupKey}`)
      headers.delete('content-length')
      const backupBody = { ...parsed }
      delete backupBody.thinking
      delete backupBody.reasoning_effort
      delete backupBody.enable_thinking
      delete backupBody.thinking_budget
      return baseFetch(`${backup.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        ...init, signal, headers, body: JSON.stringify({ ...backupBody, model: backup.name,
          ...getThinkingRequestFields(backup.thinkingProtocol, mode, backup.thinkingBudget) }),
      })
    } : undefined
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    return fetchWithFailover({
      primary: async signal => {
        if (!officialKey) throw new Error('Official provider is not configured')
        const headers = new Headers(init?.headers)
        headers.set('authorization', `Bearer ${officialKey}`)
        return baseFetch(input, { ...init, signal, headers, body: patchedBody })
      },
      backup: sendBackup, signal, streaming: parsed.stream === true,
      policy: {
        firstOutputMs: positive('AI_PRIMARY_FIRST_OUTPUT_MS', mode === 'disabled' ? 5000 : 30000),
        completionMs: positive('AI_PROVIDER_COMPLETION_MS', mode === 'disabled' ? 30000 : 90000),
        failureThreshold: positive('AI_PROVIDER_FAILURE_THRESHOLD', 3),
        cooldownMs: positive('AI_PROVIDER_COOLDOWN_MS', 60000),
      },
    })
  }
}

export function createOpenAIClient(
  model: AiModelConfig,
  mode: ThinkingMode = 'disabled',
  options?: { timeout?: number },
): OpenAI {
  return new OpenAI({
    apiKey: resolveApiKey(model),
    baseURL: model.baseUrl,
    fetch: createThinkingFetch(model, mode),
    ...(model.name === 'deepseek-flash' ? { maxRetries: 0 } : {}),
    ...(options?.timeout ? { timeout: options.timeout } : {}),
  })
}
