import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';

const mocks = vi.hoisted(() => ({ apply: vi.fn(), messages: [] as UIMessage[], setMessages: vi.fn() }));
vi.mock('@ai-sdk/react', () => ({ useChat: () => ({ messages: mocks.messages, sendMessage: vi.fn(), status: 'ready', setMessages: mocks.setMessages }) }));
vi.mock('@/components/ai-chat/apply-block-change', async (load) => ({ ...(await load<object>()), applyChangeProposal: mocks.apply }));
vi.mock('@/state/store', () => ({ useAppStore: { getState: () => ({ resume: { sections: [] } }) } }));
vi.mock('@/lib/ai/assist-client', () => ({ handleAssistQuotaError: vi.fn(), parseAssistErrorPayload: vi.fn(), trackAssistBlocked: vi.fn(), trackAssistFailed: vi.fn(), trackAssistStart: vi.fn(), trackAssistSuccess: vi.fn(), refreshEditorAssistQuota: vi.fn() }));
import { useEditorAIChat } from './use-ai-chat';

let session = 0;
beforeEach(() => {
  session += 1;
  vi.clearAllMocks();
  mocks.apply.mockReturnValue(true);
  mocks.messages = [{ id: 'answer', role: 'assistant', parts: [{ type: 'tool-rewriteText', toolCallId: 'call', state: 'output-available', input: {}, output: { action: 'updateBlock', blockId: 'work', html: '<p>建议内容</p>' } }] }];
});
afterEach(cleanup);
it('does not mutate the resume when a suggestion arrives; explicit apply is idempotent', () => {
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}` }));
  expect(mocks.apply).not.toHaveBeenCalled();
  act(() => { result.current.reviewProposal('answer-0-0', true); result.current.reviewProposal('answer-0-0', true); });
  expect(mocks.apply).toHaveBeenCalledTimes(1);
  expect(result.current.reviewedKeys['answer-0-0']).toBe('applied');
});
it('dismisses without changing resume content', () => {
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}` }));
  act(() => result.current.reviewProposal('answer-0-0', false));
  expect(mocks.apply).not.toHaveBeenCalled();
  expect(result.current.reviewedKeys['answer-0-0']).toBe('dismissed');
});
it('does not report success when the target was deleted', () => {
  mocks.apply.mockReturnValue(false);
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}` }));
  act(() => result.current.reviewProposal('answer-0-0', true));
  expect(result.current.reviewedKeys['answer-0-0']).toBeUndefined();
});
it('prevents replay of legacy automatically applied history', () => {
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}`, initialMessages: mocks.messages }));
  act(() => result.current.reviewProposal('answer-0-0', true));
  expect(mocks.apply).not.toHaveBeenCalled();
  expect(result.current.reviewedKeys['answer-0-0']).toBe('history');
});
it('restores new pending suggestions for review', () => {
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}`, initialMessages: mocks.messages, initialProposalReviews: {} }));
  act(() => result.current.reviewProposal('answer-0-0', true));
  expect(mocks.apply).toHaveBeenCalledTimes(1);
});
it('restores persisted decisions without applying twice', () => {
  const { result } = renderHook(() => useEditorAIChat({ sessionId: `test-${session}`, initialMessages: mocks.messages, initialProposalReviews: { 'answer-0-0': 'applied' } }));
  act(() => result.current.reviewProposal('answer-0-0', true));
  expect(mocks.apply).not.toHaveBeenCalled();
  expect(result.current.reviewedKeys['answer-0-0']).toBe('applied');
});
