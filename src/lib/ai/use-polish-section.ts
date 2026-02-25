'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  SectionIdentity,
  SectionModuleType,
  PolishLevel,
} from '@/lib/ai/section-types';

export interface PolishSectionParams {
  readonly content: string;
  readonly identity: SectionIdentity;
  readonly moduleType: SectionModuleType;
  readonly polishLevel: PolishLevel;
  readonly jobDescription?: string;
  readonly realisticMode?: boolean;
  readonly model?: string;
}

export interface PolishSectionState {
  readonly isPolishing: boolean;
  readonly streamedHtml: string;
  readonly error: string | null;
}

export interface PolishSectionActions {
  readonly polish: (params: PolishSectionParams) => Promise<string | null>;
  readonly abort: () => void;
  readonly reset: () => void;
}

export type UsePolishSectionReturn = PolishSectionState & PolishSectionActions;

/**
 * Client hook for AI section-level polish with SSE streaming.
 * Calls `/api/ai/polish-section` and accumulates the streamed HTML result.
 */
export function usePolishSection(): UsePolishSectionReturn {
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [streamedHtml, setStreamedHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPolishing(false);
  }, []);

  const reset = useCallback((): void => {
    abort();
    setStreamedHtml('');
    setError(null);
  }, [abort]);

  const polish = useCallback(
    async (params: PolishSectionParams): Promise<string | null> => {
      reset();
      setIsPolishing(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response: Response = await fetch('/api/ai/polish-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const msg: string = errorBody?.error ?? `请求失败 (${response.status})`;
          throw new Error(msg);
        }

        const reader: ReadableStreamDefaultReader<Uint8Array> | undefined =
          response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines: string[] = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed: string = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const payload: string = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const parsed: { content?: string; error?: string } = JSON.parse(payload);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamedHtml(accumulated);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== payload) {
                throw parseErr;
              }
            }
          }
        }

        setIsPolishing(false);
        return accumulated;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsPolishing(false);
          return null;
        }
        const msg: string = err instanceof Error ? err.message : '润色失败，请重试';
        setError(msg);
        setIsPolishing(false);
        return null;
      }
    },
    [reset],
  );

  return { isPolishing, streamedHtml, error, polish, abort, reset };
}
