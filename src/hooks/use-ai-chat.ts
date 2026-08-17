'use client';

import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyChangeProposal,
  extractProposalsFromMessages,
} from '@/components/ai-chat/apply-block-change';
import { useAppStore } from '@/state/store';

interface UseEditorAIChatOptions {
  initialMessages?: UIMessage[];
  sessionId?: string;
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

export function useEditorAIChat({ initialMessages, sessionId }: UseEditorAIChatOptions) {
  const [input, setInput] = useState('');
  const sessionKey = sessionId || 'local';
  const appliedKeysRef = useRef(getAppliedKeys(sessionKey));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/next-api/ai/chat',
        body: () => ({
          resumeData: useAppStore.getState().resume,
        }),
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
        keys.add(item.key);
      }
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [initialMessages, sessionKey, setMessages]);

  useEffect(() => {
    const keys = appliedKeysRef.current;
    const fresh = extractProposalsFromMessages(messages).filter((item) => !keys.has(item.key));
    if (fresh.length === 0) return;
    for (const item of fresh) {
      applyChangeProposal(item.proposal);
      keys.add(item.key);
    }
  }, [messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;
    void sendMessage({ text: input.trim() });
    setInput('');
  }, [input, isLoading, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    error,
    clearMessages,
    sendMessage,
    setMessages,
  };
}
