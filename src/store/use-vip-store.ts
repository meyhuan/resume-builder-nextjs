import { create } from 'zustand';
import { DEFAULT_QUOTA_LIMITS } from '@/lib/quota/quota-config';
import type { VipPollData, VipQuotaStatus, VipFeatureQuota } from '@/lib/quota/vip-types';
import { useAuthStore } from '@/store/use-auth-store';

interface VipStoreState {
  readonly isLoading: boolean;
  readonly quotaLoaded: boolean;
  readonly quota: VipQuotaStatus;
  readonly showUpgrade: boolean;
  readonly initializedToken: string | null;
  readonly quotaRequestPromise: Promise<VipQuotaStatus | null> | null;
  readonly vipRequestPromise: Promise<VipPollData | null> | null;
  setShowUpgrade: (showUpgrade: boolean) => void;
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
  pdfExport: { allowed: false, remaining: 0, isVip: false, limit: DEFAULT_QUOTA_LIMITS.pdfExport },
};

function applyVipStatus(data: VipPollData | null): void {
  if (!data) return;
  useAuthStore.getState().updateVipStatus({
    vipStatus: data.vipStatus,
    vipType: data.vipType,
    vipExpireTime: data.vipExpireTime,
    isVip: data.isVip,
  });
}

export const useVipStore = create<VipStoreState>()((set, get) => ({
  isLoading: false,
  quotaLoaded: false,
  quota: EMPTY_QUOTA,
  showUpgrade: false,
  initializedToken: null,
  quotaRequestPromise: null,
  vipRequestPromise: null,
  setShowUpgrade: (showUpgrade: boolean): void => set({ showUpgrade }),
  refreshQuota: async (token: string | null): Promise<void> => {
    if (!token) return;
    let requestPromise: Promise<VipQuotaStatus | null> | null = get().quotaRequestPromise;
    if (!requestPromise) {
      requestPromise = (async (): Promise<VipQuotaStatus | null> => {
        const response: Response = await fetch('/next-api/quota');
        if (!response.ok) return null;
        const data: Record<string, VipFeatureQuota | undefined> = await response.json();
        return {
          aiGenerateResume: data.aiGenerateResume || EMPTY_QUOTA.aiGenerateResume,
          aiImportSection: data.aiImportSection || EMPTY_QUOTA.aiImportSection,
          aiGenerateSection: data.aiGenerateSection || EMPTY_QUOTA.aiGenerateSection,
          aiPolishSection: data.aiPolishSection || EMPTY_QUOTA.aiPolishSection,
          pdfExport: data.pdfExport || EMPTY_QUOTA.pdfExport,
        };
      })();
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
        if (!response.ok) return null;
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
      initializedToken: null,
      quotaRequestPromise: null,
      vipRequestPromise: null,
    });
  },
}));
