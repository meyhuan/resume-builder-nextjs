'use client';

import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  applyChangeProposal,
  extractProposalsFromMessages,
} from '@/components/ai-chat/apply-block-change';
import { useAppStore } from '@/state/store';
import { useVipStore } from '@/store/use-vip-store';
import {
  handleAssistQuotaError,
  parseAssistErrorPayload,
  trackAssistBlocked,
  trackAssistFailed,
  trackAssistStart,
  trackAssistSuccess,
  refreshEditorAssistQuota,
} from '@/lib/ai/assist-client';

interface UseEditorAIChatOptions {
  initialMessages?: UIMessage[];
  sessionId?: string;
  initialProposalReviews?: Record<string, 'applied' | 'dismissed' | 'history'>;
}

/** Survives React Strict Mode remounts so addSection / suggestSkills are not applied twice. */
const appliedKeysBySession = new Map<string, Set<string>>();

function getAppliedKeys(sessionId: string): Set<string> {
  let keys = appliedKeysBySession.get(sessionId);
  if (!keys) {
    keys = new Set();
    appliedKeysBySession.set(sessionId, keys);
  }
  return keys;
}

function canUseEditorAssist(): boolean {
  const { quota, setShowUpgrade } = useVipStore.getState();
  if (quota.aiEditorAssist.isVip || quota.aiEditorAssist.allowed) return true;
  setShowUpgrade(true, 'ai');
  trackAssistBlocked('chat');
  return false;
}

export function useEditorAIChat({ initialMessages, sessionId, initialProposalReviews }: UseEditorAIChatOptions) {
  const [input, setInput] = useState('');
  const sessionKey = sessionId || 'local';
  const appliedKeysRef = useRef(getAppliedKeys(sessionKey));
  const [reviewedKeys, setReviewedKeys] = useState<Record<string, 'applied' | 'dismissed' | 'history'>>(() => {
    if (initialProposalReviews) return initialProposalReviews;
    return Object.fromEntries(extractProposalsFromMessages(initialMessages ?? []).map((item) => [item.key, 'history' as const]));
  });
  const prevStatusRef = useRef<string>('ready');
  const startedRef = useRef(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/next-api/ai/chat',
        body: () => ({
          resumeData: useAppStore.getState().resume,
        }),
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (response.status === 429) {
            const data = parseAssistErrorPayload(await response.clone().json().catch(() => ({})));
            if (handleAssistQuotaError('chat', data)) {
              setQuotaBlocked(true);
            } else if (data.error) {
              trackAssistFailed('chat', data.error);
            }
          }
          return response;
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId,
    transport,
  });

  const hydratedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    appliedKeysRef.current = getAppliedKeys(sessionKey);
  }, [sessionKey]);

  // Hydrate history once per session so later saves do not reset the live chat.
  useEffect(() => {
    if (hydratedSessionRef.current === sessionKey) return;
    hydratedSessionRef.current = sessionKey;
    const keys = appliedKeysRef.current;
    if (initialMessages) {
      for (const item of extractProposalsFromMessages(initialMessages)) {
        const review = initialProposalReviews === undefined ? 'history' : initialProposalReviews[item.key];
        if (review) {
          keys.add(item.key);
        }
      }
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [initialMessages, initialProposalReviews, sessionKey, setMessages]);

  const reviewProposal = useCallback((key: string, apply: boolean): void => {
    if (appliedKeysRef.current.has(key)) return;
    const item = extractProposalsFromMessages(messages).find((entry) => entry.key === key);
    if (!item) return;
    if (apply && !applyChangeProposal(item.proposal)) {
      toast.error('对应内容已不存在，请重新生成建议');
      return;
    }
    appliedKeysRef.current.add(key);
    setReviewedKeys((previous) => ({ ...previous, [key]: apply ? 'applied' : 'dismissed' }));
    if (apply) toast.success('已应用这一处修改，可用顶栏撤销还原');
  }, [messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== 'streaming' && prev !== 'submitted') return;
    if (status === 'streaming' || status === 'submitted') return;
    if (startedRef.current) {
      startedRef.current = false;
      if (!quotaBlocked && error) {
        trackAssistFailed('chat', error.message);
      } else if (!quotaBlocked) {
        trackAssistSuccess('chat');
        refreshEditorAssistQuota();
      }
    }
  }, [status, error, quotaBlocked]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  }, []);

  const gatedSend = useCallback((text: string): boolean => {
    if (!text.trim() || isLoading) return false;
    if (!canUseEditorAssist()) return false;
    setQuotaBlocked(false);
    startedRef.current = true;
    trackAssistStart('chat');
    void sendMessage({ text: text.trim() });
    return true;
  }, [isLoading, sendMessage]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gatedSend(input)) return;
    setInput('');
  }, [gatedSend, input]);

  const sendGatedMessage = useCallback((params: { text: string }): void => {
    gatedSend(params.text);
  }, [gatedSend]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    reviewedKeys,
    reviewProposal,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    error,
    clearMessages,
    sendMessage: sendGatedMessage,
    setMessages,
  };
}
