'use client';

import { useCallback, useState } from 'react';
import type { ResumeData } from '@/entities/resume/resume-data';
import type { JdAnalysisOutput } from '@/lib/ai/jd-analysis-schema';

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
      const response = await fetch('/next-api/ai/jd-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: params.resumeData,
          jobDescription: params.jobDescription,
        }),
        signal: params.signal,
      });
      const data = (await response.json()) as JdAnalysisOutput & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || '岗位匹配分析失败');
      }
      setResult(data);
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
