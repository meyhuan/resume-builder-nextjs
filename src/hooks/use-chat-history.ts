'use client';

import { get, set } from 'idb-keyval';
import { useCallback, useEffect, useState } from 'react';
import type { UIMessage } from 'ai';

const STORAGE_PREFIX = 'ai-chat-history:';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
}

function isSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && Array.isArray(record.messages);
}

function normalizeSessions(raw: unknown, resumeId: string): ChatSession[] {
  if (Array.isArray(raw) && raw.every(isSession)) {
    return raw;
  }
  if (Array.isArray(raw) && raw.length > 0 && raw[0] && typeof raw[0] === 'object' && 'role' in raw[0]) {
    return [{
      id: resumeId,
      title: '历史对话',
      updatedAt: Date.now(),
      messages: raw as UIMessage[],
    }];
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { messages?: unknown }).messages)) {
    const record = raw as { messages: UIMessage[]; updatedAt?: number; title?: string };
    return [{
      id: resumeId,
      title: record.title || '历史对话',
      updatedAt: record.updatedAt ?? Date.now(),
      messages: record.messages,
    }];
  }
  return [];
}

async function loadSessions(resumeId: string): Promise<ChatSession[]> {
  const raw = await get(`${STORAGE_PREFIX}${resumeId}`);
  const sessions = normalizeSessions(raw, resumeId);
  const alreadyMigrated = Array.isArray(raw) && raw.every(isSession);
  if (sessions.length > 0 && !alreadyMigrated) {
    await persistSessions(resumeId, sessions);
  }
  return sessions;
}

async function persistSessions(resumeId: string, sessions: ChatSession[]): Promise<void> {
  await set(`${STORAGE_PREFIX}${resumeId}`, sessions.slice(0, 20));
}

function createSessionId(): string {
  return crypto.randomUUID();
}

export function useChatHistory(resumeId: string | undefined) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    setLoaded(false);
    setActiveSessionId(null);
    void loadSessions(resumeId).then((loadedSessions) => {
      if (cancelled) return;
      setSessions(loadedSessions);
      setActiveSessionId(loadedSessions[0]?.id ?? createSessionId());
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  const saveSession = useCallback(async (session: ChatSession) => {
    if (!resumeId) return;
    setSessions((prev) => {
      const next = [session, ...prev.filter((item) => item.id !== session.id)].slice(0, 20);
      void persistSessions(resumeId, next);
      return next;
    });
    setActiveSessionId(session.id);
  }, [resumeId]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!resumeId) return;
    setSessions((prev) => {
      const next = prev.filter((item) => item.id !== sessionId);
      void persistSessions(resumeId, next);
      setActiveSessionId((current) => {
        if (current !== sessionId) return current;
        return next[0]?.id ?? createSessionId();
      });
      return next;
    });
  }, [resumeId]);

  const createSession = useCallback(() => {
    const id = createSessionId();
    setActiveSessionId(id);
    return id;
  }, []);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    saveSession,
    deleteSession,
    createSession,
    loaded,
  };
}
