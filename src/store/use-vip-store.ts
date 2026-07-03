import { create } from 'zustand';
import { DEFAULT_QUOTA_LIMITS } from '@/lib/quota/quota-config';
import type { VipPollData, VipQuotaStatus, VipFeatureQuota } from '@/lib/quota/vip-types';
import { useAuthStore } from '@/store/use-auth-store';
import { trackError } from '@/lib/analytics';

export type UpgradeContext = 'generic' | 'pdf-export' | 'ai';

interface VipStoreState {
  readonly isLoading: boolean;
  readonly quotaLoaded: boolean;
  readonly quota: VipQuotaStatus;
  readonly showUpgrade: boolean;
  readonly upgradeContext: UpgradeContext;
  readonly initializedToken: string | null;
  readonly quotaRequestPromise: Promise<VipQuotaStatus | null> | null;
  readonly vipRequestPromise: Promise<VipPollData | null> | null;
  setShowUpgrade: (showUpgrade: boolean, context?: UpgradeContext) => void;
  refreshQuota: (token: string | null) => Promise<void>;
  refreshVip: (token: string | null) => Promise<void>;
  initialize: (token: string | null) => Promise<void>;
  reset: () => void;
}

const EMPTY_QUOTA: VipQuotaStatus = {
  aiGenerateResume: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.aiGenerateResume },
  aiImportSection: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.aiImportSection },
  aiGenerateSection: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.aiGenerateSection },
  aiPolishSection: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.aiPolishSection },
  aiOptimizeResume: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.aiOptimizeResume },
  pdfExport: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.pdfExport },
};
const QUOTA_CACHE_KEY_PREFIX = 'vip_quota_snapshot_v1';
const QUOTA_CACHE_TTL_MS = 30 * 60 * 1000;
const QUOTA_FETCH_TIMEOUT_MS = 8_000;
const QUOTA_FAILURE_TRACK_COOLDOWN_MS = 60_000;
let lastQuotaFailureTrackedAt = 0;

function applyVipStatus(data: VipPollData | null): void {
  if (!data) return;
  useAuthStore.getState().updateVipStatus({
    vipStatus: data.vipStatus,
    vipType: data.vipType,
    vipExpireTime: data.vipExpireTime,
    isVip: data.isVip,
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeQuotaSnapshot(data: Record<string, VipFeatureQuota | undefined>): VipQuotaStatus {
  return {
    aiGenerateResume: data.aiGenerateResume || EMPTY_QUOTA.aiGenerateResume,
    aiImportSection: data.aiImportSection || EMPTY_QUOTA.aiImportSection,
    aiGenerateSection: data.aiGenerateSection || EMPTY_QUOTA.aiGenerateSection,
    aiPolishSection: data.aiPolishSection || EMPTY_QUOTA.aiPolishSection,
    aiOptimizeResume: data.aiOptimizeResume || EMPTY_QUOTA.aiOptimizeResume,
    pdfExport: data.pdfExport || EMPTY_QUOTA.pdfExport,
  };
}

function getQuotaCacheKey(): string | null {
  const userId = useAuthStore.getState().userInfo?.id;
  return userId ? `${QUOTA_CACHE_KEY_PREFIX}:${userId}` : null;
}

function readCachedQuotaSnapshot(): VipQuotaStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheKey = getQuotaCacheKey();
    if (!cacheKey) return null;
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; quota?: Record<string, VipFeatureQuota | undefined> };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > QUOTA_CACHE_TTL_MS || !parsed.quota) return null;
    return normalizeQuotaSnapshot(parsed.quota);
  } catch {
    return null;
  }
}

function writeCachedQuotaSnapshot(quota: VipQuotaStatus): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheKey = getQuotaCacheKey();
    if (!cacheKey) return;
    window.localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), quota }));
  } catch {
    // Cache is an availability optimization only.
  }
}

function shouldTrackQuotaFailure(): boolean {
  const now = Date.now();
  if (now - lastQuotaFailureTrackedAt < QUOTA_FAILURE_TRACK_COOLDOWN_MS) return false;
  lastQuotaFailureTrackedAt = now;
  return true;
}

function describeQuotaFetchError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || 'Error';
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error).slice(0, 300);
  } catch {
    return String(error);
  }
}

async function fetchQuotaOnce(): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, QUOTA_FETCH_TIMEOUT_MS);
  try {
    return await fetch('/next-api/quota', {
      headers: { 'x-suppress-analytics-error': 'quota-refresh' },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchQuotaSnapshot(): Promise<VipQuotaStatus | null> {
  const maxAttempts = 3;
  let lastFailureReason = 'unknown';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response: Response = await fetchQuotaOnce();
      if (!response.ok) {
        lastFailureReason = `HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403) return null;
        if (attempt < maxAttempts) {
          await wait(250 * attempt + 200);
          continue;
        }
        break;
      }
      const data: Record<string, VipFeatureQuota | undefined> = await response.json();
      const quota = normalizeQuotaSnapshot(data);
      writeCachedQuotaSnapshot(quota);
      return quota;
    } catch (error) {
      lastFailureReason = describeQuotaFetchError(error);
      if (attempt < maxAttempts) {
        await wait(250 * attempt + 200);
      }
    }
  }

  const cachedQuota = readCachedQuotaSnapshot();
  if (cachedQuota) return cachedQuota;

  if (shouldTrackQuotaFailure()) {
    trackError(new Error('quota_refresh_failed'), {
      source: 'quota_refresh_failed',
      requestPath: '/next-api/quota',
      method: 'GET',
      attempts: maxAttempts,
      timeoutMs: QUOTA_FETCH_TIMEOUT_MS,
      failureReason: lastFailureReason,
    });
  }
  return null;
}

export const useVipStore = create<VipStoreState>()((set, get) => ({
  isLoading: false,
  quotaLoaded: false,
  quota: EMPTY_QUOTA,
  showUpgrade: false,
  upgradeContext: 'generic',
  initializedToken: null,
  quotaRequestPromise: null,
  vipRequestPromise: null,
  setShowUpgrade: (showUpgrade: boolean, context?: UpgradeContext): void => set({
    showUpgrade,
    ...(context ? { upgradeContext: context } : {}),
    ...(!showUpgrade ? { upgradeContext: 'generic' as UpgradeContext } : {}),
  }),
  refreshQuota: async (token: string | null): Promise<void> => {
    if (!token) return;
    let requestPromise: Promise<VipQuotaStatus | null> | null = get().quotaRequestPromise;
    if (!requestPromise) {
      requestPromise = fetchQuotaSnapshot();
      set({ quotaRequestPromise: requestPromise });
    }
    try {
      const nextQuota: VipQuotaStatus | null = await requestPromise;
      if (!nextQuota) return;
      set({ quota: nextQuota, quotaLoaded: true });
    } catch {
      return;
    } finally {
      if (get().quotaRequestPromise === requestPromise) {
        set({ quotaRequestPromise: null });
      }
    }
  },
  refreshVip: async (token: string | null): Promise<void> => {
    if (!token) return;
    set({ isLoading: true });
    let requestPromise: Promise<VipPollData | null> | null = get().vipRequestPromise;
    if (!requestPromise) {
      requestPromise = (async (): Promise<VipPollData | null> => {
        const response: Response = await fetch('/next-api/vip/poll');
        if (!response.ok) {
          if (response.status === 401) {
            const body: { error?: string; message?: string } = await response.json().catch(() => ({}));
            if (body.error === 'RE_LOGIN') {
              useAuthStore.getState().logout();
              window.dispatchEvent(new CustomEvent('re-login-required', { detail: { message: body.message } }));
            }
          }
          return null;
        }
        const json: { data?: VipPollData } = await response.json();
        return json.data ?? null;
      })();
      set({ vipRequestPromise: requestPromise });
    }
    try {
      const vipData: VipPollData | null = await requestPromise;
      applyVipStatus(vipData);
      await get().refreshQuota(token);
    } catch {
      return;
    } finally {
      if (get().vipRequestPromise === requestPromise) {
        set({ vipRequestPromise: null });
      }
      set({ isLoading: false });
    }
  },
  initialize: async (token: string | null): Promise<void> => {
    if (!token) {
      get().reset();
      return;
    }
    if (get().initializedToken === token) return;
    set({ initializedToken: token });
    await get().refreshVip(token);
  },
  reset: (): void => {
    set({
      isLoading: false,
      quotaLoaded: false,
      quota: EMPTY_QUOTA,
      showUpgrade: false,
      upgradeContext: 'generic',
      initializedToken: null,
      quotaRequestPromise: null,
      vipRequestPromise: null,
    });
  },
}));
