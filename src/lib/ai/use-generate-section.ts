'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  SectionIdentity,
  SectionModuleType,
  JobCategory,
} from '@/lib/ai/section-types';

export interface GenerateSectionParams {
  readonly identity: SectionIdentity;
  readonly moduleType: SectionModuleType;
  readonly answers: Record<string, string>;
  readonly jobDescription?: string;
  readonly jobCategory?: JobCategory;
  readonly realisticMode?: boolean;
  readonly model?: string;
}

export interface GenerateSectionState {
  readonly isGenerating: boolean;
  readonly streamedHtml: string;
  readonly error: string | null;
}

export interface GenerateSectionActions {
  readonly generate: (params: GenerateSectionParams) => Promise<string | null>;
  readonly abort: () => void;
  readonly reset: () => void;
}

export type UseGenerateSectionReturn = GenerateSectionState & GenerateSectionActions;

/**
 * Client hook for AI section-level content generation with SSE streaming.
 * Calls `/next-api/ai/generate-section` and accumulates the streamed HTML result.
 */
export function useGenerateSection(): UseGenerateSectionReturn {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamedHtml, setStreamedHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const reset = useCallback((): void => {
    abort();
    setStreamedHtml('');
    setError(null);
  }, [abort]);

  const generate = useCallback(
    async (params: GenerateSectionParams): Promise<string | null> => {
      reset();
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response: Response = await fetch('/next-api/ai/generate-section', {
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

        setIsGenerating(false);
        return accumulated;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsGenerating(false);
          return null;
        }
        const msg: string = err instanceof Error ? err.message : '生成失败，请重试';
        setError(msg);
        setIsGenerating(false);
        return null;
      }
    },
    [reset],
  );

  return { isGenerating, streamedHtml, error, generate, abort, reset };
}
