'use client';

import { useState, useCallback, useRef } from 'react';
import type { SectionIdentity } from '@/lib/ai/section-types';
import type { OptimizeConfirmedEvidence, OptimizeResumeBlock } from '@/lib/ai/optimize-resume-prompt-builder';
import { validateEvidenceBoundRewrite } from '@/lib/jobs/evidence-rewrite-validator';

export interface OptimizeResumeParams {
  readonly blocks: OptimizeResumeBlock[];
  readonly identity: SectionIdentity;
  readonly jobDescription?: string;
  readonly jobId?: string;
  readonly confirmedEvidence?: readonly OptimizeConfirmedEvidence[];
  readonly realisticMode?: boolean;
}

export interface UseOptimizeResumeReturn {
  readonly isRunning: boolean;
  readonly resultMap: Record<string, string>;
  readonly error: string | null;
  readonly quotaExceeded: boolean;
  run: (params: OptimizeResumeParams) => Promise<Record<string, string> | null>;
  abort: () => void;
  reset: () => void;
}

/**
 * Client hook for whole-resume AI optimization with SSE streaming.
 *
 * Calls `/next-api/ai/optimize-resume` and accumulates the streamed JSON.
 * The result is NOT written to the store — callers handle the diff preview
 * and apply the result only after user confirmation.
 */
export function useOptimizeResume(): UseOptimizeResumeReturn {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [resultMap, setResultMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback((): void => {
    abort();
    setResultMap({});
    setError(null);
    setQuotaExceeded(false);
  }, [abort]);

  const run = useCallback(
    async (params: OptimizeResumeParams): Promise<Record<string, string> | null> => {
      reset();
      setIsRunning(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/next-api/ai/optimize-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: params.blocks,
            identity: params.identity,
            jobDescription: params.jobDescription,
            jobId: params.jobId,
            realisticMode: params.realisticMode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          if (errorBody?.quotaExceeded) {
            setQuotaExceeded(true);
          }
          const msg: string = errorBody?.error ?? `请求失败 (${response.status})`;
          throw new Error(msg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const parsed: { content?: string; error?: string } = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                accumulated += parsed.content;
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== payload) {
                throw parseErr;
              }
            }
          }
        }

        const parsed = extractResultMap(accumulated);
        const guarded = params.realisticMode
          ? Object.fromEntries(
              Object.entries(parsed).filter(([blockId, proposedHtml]) => {
                const sourceBlock = params.blocks.find((block) => block.blockId === blockId);
                if (!sourceBlock) return false;
                const blockEvidence = (params.confirmedEvidence ?? [])
                  .filter((fact) => fact.blockId === blockId)
                  .map((fact) => fact.text);
                return validateEvidenceBoundRewrite(
                  [sourceBlock.contentHtml, ...blockEvidence].join('\n'),
                  proposedHtml,
                ).safe;
              }),
            )
          : parsed;
        if (params.realisticMode && Object.keys(guarded).length === 0 && Object.keys(parsed).length > 0) {
          throw new Error('AI 建议包含已确认事实没有的数字、工具或平台，已为你拦截。请先补充真实内容后重试。');
        }
        setResultMap(guarded);
        setIsRunning(false);
        return guarded;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setIsRunning(false);
          return null;
        }
        const msg = err instanceof Error ? err.message : '优化失败，请重试';
        setError(msg);
        setIsRunning(false);
        return null;
      }
    },
    [reset],
  );

  return { isRunning, resultMap, error, quotaExceeded, run, abort, reset };
}

/**
 * Extract the blockId→html map from the raw AI output.
 * Handles cases where the model wraps JSON in markdown code fences.
 */
function extractResultMap(raw: string): Record<string, string> {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as Record<string, string>;
  } catch {
    throw new Error('AI 返回格式异常，请重试');
  }
}
