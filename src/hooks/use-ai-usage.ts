'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AiUsageInfo {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly isAuthenticated: boolean;
}

export interface UseAiUsageReturn {
  /** Current usage info, null while loading. */
  readonly usage: AiUsageInfo | null;
  /** Whether the limit has been reached. */
  readonly isLimitReached: boolean;
  /** Refresh usage data from the server. */
  readonly refresh: () => Promise<void>;
  /** Loading state. */
  readonly isLoading: boolean;
}

/**
 * Hook to fetch and track AI usage limits from the server.
 * Automatically refreshes on mount.
 */
export function useAiUsage(): UseAiUsageReturn {
  const [usage, setUsage] = useState<AiUsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res: Response = await fetch('/next-api/ai/usage');
      if (res.ok) {
        const data: AiUsageInfo = await res.json();
        setUsage(data);
      }
    } catch {
      // Silently fail — usage display is non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isLimitReached: boolean = usage !== null && usage.remaining <= 0;

  return { usage, isLimitReached, refresh, isLoading };
}
