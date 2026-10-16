/**
 * Central policy for model reasoning modes.
 *
 * Keep this file provider agnostic. The provider adapter translates the
 * selected mode into DashScope / DeepSeek / OpenAI request fields.
 */
export type ThinkingMode = 'disabled' | 'low' | 'high';

export type ThinkingFeature =
  | 'default'
  | 'jd-match'
  | 'interview-prep'
  | 'chat'
  | 'fact-check';

export type ThinkingProtocol = 'dashscope' | 'deepseek' | 'openai';

/**
 * Product policy. Model names and provider details live in
 * ai-runtime-config.ts; update this table when product behavior changes.
 */
export const AI_THINKING_POLICY: Readonly<
  Record<ThinkingFeature, ThinkingMode>
> = {
  default: 'disabled',
  'jd-match': 'low',
  'interview-prep': 'low',
  chat: 'disabled',
  'fact-check': 'disabled',
};

export function resolveThinkingMode(
  feature: ThinkingFeature,
  options?: {
    requested?: ThinkingMode;
    complex?: boolean;
  },
): ThinkingMode {
  if (options?.requested) return options.requested;
  if (feature === 'chat' && options?.complex) return 'low';
  return AI_THINKING_POLICY[feature];
}

/**
 * Convert the product mode to provider request fields.
 *
 * DeepSeek currently exposes thinking as an on/off switch. The product's
 * "low" mode therefore enables thinking without pretending it can control a
 * token budget that the provider does not expose. DashScope models that
 * declare a thinking budget receive it from the model registry.
 */
export function getThinkingRequestFields(
  protocol: ThinkingProtocol,
  mode: ThinkingMode,
  thinkingBudget?: number,
): Record<string, unknown> {
  switch (protocol) {
    case 'deepseek':
      return { thinking: { type: mode === 'disabled' ? 'disabled' : 'enabled' } };
    case 'openai':
      return { reasoning_effort: mode === 'disabled' ? 'none' : mode };
    case 'dashscope':
    default:
      return {
        enable_thinking: mode !== 'disabled',
        ...(mode !== 'disabled' && thinkingBudget
          ? { thinking_budget: thinkingBudget }
          : {}),
      };
  }
}
