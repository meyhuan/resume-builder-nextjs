import 'server-only'

/**
 * Server-side AI model configuration registry.
 * API keys are read from server-side environment variables only.
 */
export interface AiModelConfig {
  readonly name: string
  readonly displayName: string
  readonly baseUrl: string
  readonly apiKeyEnv: string
}

const DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL ??
  'https://llm-wwerfrg4elkhrxzz.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'

const MODELS: readonly AiModelConfig[] = [
  {
    name: 'qwen-plus',
    displayName: '通义千问 Plus',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  {
    name: 'qwen-max',
    displayName: '通义千问 Max',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  {
    name: 'qwen-vl-plus',
    displayName: '通义千问 VL Plus',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  {
    name: 'qwen3.5-ocr',
    displayName: '通义千问 OCR',
    baseUrl: DASHSCOPE_BASE_URL,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
] as const

const DEFAULT_MODEL_NAME = 'qwen-plus'
const VISION_MODEL_NAME = 'qwen3.5-ocr'

export function getDefaultModel(): AiModelConfig {
  return MODELS.find((model) => model.name === DEFAULT_MODEL_NAME) ?? MODELS[0]
}

export function getVisionModel(): AiModelConfig {
  return MODELS.find((model) => model.name === VISION_MODEL_NAME) ?? getDefaultModel()
}

export function getModelByName(name: string): AiModelConfig {
  return MODELS.find((model) => model.name === name) ?? getDefaultModel()
}

export function resolveApiKey(model: AiModelConfig): string {
  const key: string = process.env[model.apiKeyEnv] ?? ''
  if (!key) {
    throw new Error(`Missing environment variable: ${model.apiKeyEnv}`)
  }
  return key
}
