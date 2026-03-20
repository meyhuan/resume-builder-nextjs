/**
 * AI model configuration registry.
 * Add or switch models by editing the MODELS array below.
 * API keys are read from server-side environment variables only.
 */

export interface AiModelConfig {
  readonly name: string;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly apiKeyEnv: string;
}

/**
 * Available AI models for resume generation.
 * To add a new model, append an entry here.
 */
const MODELS: readonly AiModelConfig[] = [
  {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  {
    name: 'qwen-plus',
    displayName: 'Qwen Plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  {
    name: 'qwen-max',
    displayName: 'Qwen Max',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
] as const;

/** Default model used when none is specified. */
const DEFAULT_MODEL_NAME = 'gpt-4o-mini';

/**
 * Returns all available model configs (for UI model selector).
 */
export function getAvailableModels(): readonly AiModelConfig[] {
  return MODELS;
}

/**
 * Returns the default model config.
 */
export function getDefaultModel(): AiModelConfig {
  return MODELS.find((m) => m.name === DEFAULT_MODEL_NAME) ?? MODELS[0];
}

/**
 * Finds a model config by name. Falls back to default if not found.
 */
export function getModelByName(name: string): AiModelConfig {
  return MODELS.find((m) => m.name === name) ?? getDefaultModel();
}

/**
 * Resolves the API key for a model from environment variables.
 * Only callable on the server side.
 */
export function resolveApiKey(model: AiModelConfig): string {
  const key: string = process.env[model.apiKeyEnv] ?? '';
  if (!key) {
    throw new Error(`Missing environment variable: ${model.apiKeyEnv}`);
  }
  return key;
}
