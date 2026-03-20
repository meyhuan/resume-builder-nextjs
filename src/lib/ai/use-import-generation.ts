'use client';

import { useState, useCallback, useRef } from 'react';
import type { ExternalResume } from '@/io/external-resume-types';

export interface ImportGenerationState {
  readonly isGenerating: boolean;
  readonly streamedText: string;
  readonly error: string | null;
  readonly result: ExternalResume | null;
  readonly isNotResume: boolean;
}

export interface ImportGenerationActions {
  readonly generate: (rawText: string, model?: string) => Promise<ExternalResume | null>;
  readonly abort: () => void;
  readonly reset: () => void;
}

export type UseImportGenerationReturn = ImportGenerationState & ImportGenerationActions;

/**
 * Client hook for AI resume import with streaming.
 *
 * Calls the `/next-api/ai/import-resume` endpoint, processes SSE chunks,
 * and parses the final accumulated text as ExternalResume JSON.
 */
export function useImportGeneration(): UseImportGenerationReturn {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExternalResume | null>(null);
  const [isNotResume, setIsNotResume] = useState<boolean>(false);
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
    setStreamedText('');
    setError(null);
    setResult(null);
    setIsNotResume(false);
  }, [abort]);

  const generate = useCallback(
    async (rawText: string, model?: string): Promise<ExternalResume | null> => {
      reset();
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response: Response = await fetch('/next-api/ai/import-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, model }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const msg: string = errorBody?.error ?? `Request failed (${response.status})`;
          throw new Error(msg);
        }

        const reader: ReadableStreamDefaultReader<Uint8Array> | undefined =
          response.body?.getReader();
        if (!reader) {
          throw new Error('Unable to read response stream');
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
                setStreamedText(accumulated);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== payload) {
                throw parseErr;
              }
            }
          }
        }

        const resumeJson = extractJson(accumulated);

        // Check if AI flagged this as not a resume
        if (isErrorResponse(resumeJson)) {
          setIsNotResume(true);
          setError(resumeJson.message || 'The input does not appear to be a resume. Please paste resume content and try again.');
          setIsGenerating(false);
          return null;
        }

        setResult(resumeJson as ExternalResume);
        setIsGenerating(false);
        return resumeJson as ExternalResume;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsGenerating(false);
          return null;
        }
        const msg: string = err instanceof Error ? err.message : 'Parsing failed. Please try again.';
        setError(msg);
        setIsGenerating(false);
        return null;
      }
    },
    [reset],
  );

  return { isGenerating, streamedText, error, result, isNotResume, generate, abort, reset };
}

interface ErrorResponse {
  readonly error: string;
  readonly message: string;
}

function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    (obj as ErrorResponse).error === 'NOT_RESUME'
  );
}

/**
 * Extract valid JSON from the AI output.
 */
function extractJson(raw: string): ExternalResume | ErrorResponse {
  let cleaned: string = raw.trim();

  const codeBlockMatch: RegExpMatchArray | null = cleaned.match(
    /```(?:json)?\s*([\s\S]*?)```/,
  );
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstBrace: number = cleaned.indexOf('{');
  const lastBrace: number = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON format. Please try again.');
  }
}
