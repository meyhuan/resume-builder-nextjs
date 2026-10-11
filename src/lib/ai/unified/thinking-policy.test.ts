import { describe, expect, it } from 'vitest';
import {
  AI_THINKING_POLICY,
  getThinkingRequestFields,
  resolveThinkingMode,
} from '@/lib/ai/thinking-policy';

describe('AI thinking policy', () => {
  it('keeps the default path fast and reserves reasoning for selected features', () => {
    expect(AI_THINKING_POLICY.default).toBe('disabled');
    expect(AI_THINKING_POLICY['jd-match']).toBe('low');
    expect(AI_THINKING_POLICY['interview-prep']).toBe('low');
    expect(AI_THINKING_POLICY['fact-check']).toBe('low');
  });

  it('raises complex chat to low thinking while leaving short chat disabled', () => {
    expect(resolveThinkingMode('chat')).toBe('disabled');
    expect(resolveThinkingMode('chat', { complex: true })).toBe('low');
  });

  it('maps the product mode to provider-specific request fields', () => {
    expect(getThinkingRequestFields('dashscope', 'disabled')).toEqual({
      enable_thinking: false,
    });
    expect(getThinkingRequestFields('dashscope', 'low', 2048)).toEqual({
      enable_thinking: true,
      thinking_budget: 2048,
    });
    expect(getThinkingRequestFields('deepseek', 'low')).toEqual({
      thinking: { type: 'enabled' },
    });
    expect(getThinkingRequestFields('openai', 'disabled')).toEqual({
      reasoning_effort: 'none',
    });
  });
});
