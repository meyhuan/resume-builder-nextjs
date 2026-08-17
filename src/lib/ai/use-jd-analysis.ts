'use client';

import { useCallback, useState } from 'react';
import type { ResumeData } from '@/entities/resume/resume-data';
import type { JdAnalysisOutput } from '@/lib/ai/jd-analysis-schema';
import {
  handleAssistQuotaError,
  parseAssistErrorPayload,
  trackAssistFailed,
  trackAssistStart,
  trackAssistSuccess,
  refreshEditorAssistQuota,
} from '@/lib/ai/assist-client';

export function useJdAnalysis() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<JdAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: {
    resumeData: ResumeData;
    jobDescription: string;
    signal?: AbortSignal;
  }): Promise<JdAnalysisOutput | null> => {
    setIsRunning(true);
    setError(null);
    try {
      trackAssistStart('jd-analysis');
      const response = await fetch('/next-api/ai/jd-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: params.resumeData,
          jobDescription: params.jobDescription,
        }),
        signal: params.signal,
      });
      const data = (await response.json()) as JdAnalysisOutput & {
        error?: string;
        quotaExceeded?: boolean;
      };
      if (!response.ok) {
        const payload = parseAssistErrorPayload(data);
        if (!handleAssistQuotaError('jd-analysis', payload)) {
          trackAssistFailed('jd-analysis', data.error || '岗位匹配分析失败');
        }
        throw new Error(data.error || '岗位匹配分析失败');
      }
      setResult(data);
      trackAssistSuccess('jd-analysis');
      refreshEditorAssistQuota();
      return data;
    } catch (err) {
      if ((err instanceof DOMException && err.name === 'AbortError') || (err instanceof Error && err.name === 'AbortError')) {
        return null;
      }
      const message = err instanceof Error ? err.message : '岗位匹配分析失败';
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isRunning, result, error, run, reset };
}
