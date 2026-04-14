/** VIP quota status for a single feature. */
export interface VipFeatureQuota {
  readonly allowed: boolean;
  readonly remaining: number | 'unlimited';
  readonly isVip: boolean;
  readonly limit: number | null;
}

/** Full VIP quota snapshot for all supported features. */
export interface VipQuotaStatus {
  readonly aiGenerateResume: VipFeatureQuota;
  readonly aiImportSection: VipFeatureQuota;
  readonly aiGenerateSection: VipFeatureQuota;
  readonly aiPolishSection: VipFeatureQuota;
  readonly aiOptimizeResume: VipFeatureQuota;
  readonly pdfExport: VipFeatureQuota;
}

/** VIP poll API payload. */
export interface VipPollData {
  readonly vipStatus: number;
  readonly vipType: number;
  readonly vipExpireTime: string | null;
  readonly isVip: boolean;
}
