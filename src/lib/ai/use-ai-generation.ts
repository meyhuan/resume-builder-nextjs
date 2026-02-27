'use client';

import { useState, useCallback, useRef } from 'react';
import type { WizardInput } from '@/lib/ai/resume-prompt-builder';
import type { ExternalResume } from '@/io/external-resume-types';

export interface AiGenerationState {
  /** Whether generation is currently in progress. */
  readonly isGenerating: boolean;
  /** Accumulated streamed text (raw AI output). */
  readonly streamedText: string;
  /** Error message if generation failed. */
  readonly error: string | null;
  /** The parsed resume result, available after successful generation. */
  readonly result: ExternalResume | null;
}

export interface AiGenerationActions {
  /** Start generating a resume from wizard data. */
  readonly generate: (wizardData: WizardInput, model?: string) => Promise<ExternalResume | null>;
  /** Abort in-flight generation but keep streamed data. */
  readonly abort: () => void;
  /** Reset the generation state. */
  readonly reset: () => void;
}

export type UseAiGenerationReturn = AiGenerationState & AiGenerationActions;

/**
 * Client hook for AI resume generation with streaming.
 *
 * Calls the `/next-api/ai/generate-resume` endpoint, processes SSE chunks,
 * and parses the final accumulated text as ExternalResume JSON.
 */
export function useAiGeneration(): UseAiGenerationReturn {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExternalResume | null>(null);
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
  }, [abort]);

  const generate = useCallback(
    async (wizardData: WizardInput, model?: string): Promise<ExternalResume | null> => {
      reset();
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response: Response = await fetch('/next-api/ai/generate-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wizardData, model }),
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
                setStreamedText(accumulated);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== payload) {
                throw parseErr;
              }
            }
          }
        }

        const resumeJson: ExternalResume = extractJson(accumulated);
        setResult(resumeJson);
        setIsGenerating(false);
        return resumeJson;
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

  return { isGenerating, streamedText, error, result, generate, abort, reset };
}

/**
 * Extract valid JSON from the AI output.
 * Handles cases where the AI wraps JSON in markdown code blocks.
 */
function extractJson(raw: string): ExternalResume {
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
    return JSON.parse(cleaned) as ExternalResume;
  } catch {
    throw new Error('AI返回的内容不是有效的JSON格式，请重试');
  }
}
