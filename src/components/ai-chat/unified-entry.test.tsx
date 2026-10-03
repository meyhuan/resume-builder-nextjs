import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { GrammarCheckDialog } from '@/components/editor/grammar-check-dialog';
import { AiChatPanel } from './ai-chat-panel';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { useAppStore } from '@/state/store';
vi.mock('@/templates/template-loader', () => ({ TEMPLATE_REGISTRY: {} }));
vi.mock('@/hooks/use-vip-check', () => ({
  useVipCheck: () => ({
    requireAiFeature: () => true,
    quota: { aiEditorAssist: { remaining: 5, limit: 5 } },
    quotaLoaded: true,
    setShowUpgrade: vi.fn(),
  }),
}));
vi.mock('@/lib/ai/analysis-history', () => ({
  listAnalysisHistory: async () => [],
  createHistoryId: () => 'check',
  saveAnalysisHistory: async () => [],
  deleteAnalysisHistory: async () => [],
}));
vi.mock('@/lib/ai/assist-client', () => ({
  trackAssistStart: vi.fn(),
  trackAssistSuccess: vi.fn(),
  refreshEditorAssistQuota: vi.fn(),
  handleAssistQuotaError: vi.fn(),
  parseAssistErrorPayload: vi.fn(),
  trackAssistBlocked: vi.fn(),
  trackAssistFailed: vi.fn(),
}));
vi.mock('@/hooks/use-chat-history', () => ({
  useChatHistory: () => ({
    sessions: [],
    activeSessionId: 'old',
    activeSession: {
      messages: [
        {
          id: 'm',
          role: 'assistant',
          parts: [
            {
              type: 'tool-updateBlock',
              state: 'output-available',
              output: {
                action: 'updateBlock',
                blockId: 'b',
                html: '<p>旧版内容</p>',
              },
            },
          ],
        },
      ],
    },
    setActiveSessionId: vi.fn(),
    deleteSession: vi.fn(),
  }),
}));
beforeEach(() => {
  useAppStore.setState({ resume: { id: 'r', name: '演示', sections: [] } });
  useEditorUiStore.setState({
    activeModal: 'grammar-check',
    assistantBusy: false,
    assistantTask: null,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('opens full review directly from resume check without starting a charged check first', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<GrammarCheckDialog resumeId="r" />);
  fireEvent.click(screen.getByRole('button', { name: '优化整份简历' }));
  expect(useEditorUiStore.getState()).toMatchObject({
    activeModal: null,
    activePanel: 'ai',
    assistantTask: { scope: 'resume', resumeId: 'r', entry: 'resume_check' },
  });
  expect(fetch).not.toHaveBeenCalled();
});
it('passes check results as reference data rather than a fabricated user statement', async () => {
  const result = {
    score: 70,
    summary: '表达可以更清晰',
    issues: [
      {
        blockId: 'b',
        sectionTitle: '经历',
        type: 'vague',
        severity: 'low',
        original: '协助',
        suggestion: '主导',
      },
    ],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => result })),
  );
  render(<GrammarCheckDialog resumeId="r" />);
  fireEvent.click(screen.getByRole('button', { name: '开始检查' }));
  fireEvent.click(
    await screen.findByRole('button', { name: '预览全文优化建议' }),
  );
  expect(useEditorUiStore.getState().assistantTask?.reviewNotes).toContain(
    '主导',
  );
  expect(useEditorUiStore.getState().pendingAiMessage).toBeNull();
});
it('cannot replace a running assistant task', () => {
  useEditorUiStore.setState({ assistantBusy: true });
  render(<GrammarCheckDialog resumeId="r" />);
  expect(
    (screen.getByRole('button', { name: '优化整份简历' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(useEditorUiStore.getState().startResumeOptimization('r')).toBe(false);
  expect(useEditorUiStore.getState().assistantTask).toBeNull();
});
it('legacy history has no new task, composer, optimization or apply entry', async () => {
  render(<AiChatPanel resumeId="r" />);
  await waitFor(() =>
    expect(screen.getByText(/旧版历史仅供查看/)).toBeTruthy(),
  );
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByText('一键优化')).toBeNull();
  expect(screen.queryByText('应用这一处')).toBeNull();
});
