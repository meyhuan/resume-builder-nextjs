import { cookies } from 'next/headers';
import { fetchJavaWithLog, parseJsonWithLog } from './fetch-with-log';

export interface VipInfoData {
  userId?: number;
  isVip?: boolean;
  vipStatus?: number;
  vipType?: string;
  vipExpireTime?: string;
  freeExportCount?: number;
  plans?: unknown[];
}

interface JavaVipResponse {
  status?: number;
  result?: string;
  data?: VipInfoData;
}

export type FetchVipResult =
  | { ok: true; data: JavaVipResponse }
  | { ok: false; reLogin: true }
  | { ok: false; reLogin: false; httpStatus: number };

export interface VipStatusResult {
  isVip: boolean;
  userId?: string;
  /** The identity used by Java's unionid/openid lookup. */
  unionid?: string;
  /** Additional free export count from Java backend (for non-VIP users). */
  freeExportCount?: number;
}

interface ConsumeFreeExportData {
  userId?: number;
  isVip?: boolean;
  freeExportCount?: number;
  remaining?: number;
  consumed?: boolean;
}

interface JavaConsumeFreeExportResponse {
  status?: number;
  result?: string;
  data?: ConsumeFreeExportData;
}

export interface ConsumeFreeExportResult {
  ok: boolean;
  isVip?: boolean;
  consumed?: boolean;
  freeExportCount: number;
  message?: string;
  httpStatus?: number;
}

/**
 * Shared helper: calls Java `/user/vip-info?unionid=` and normalises the result.
 * Returns a discriminated union so callers only handle the cases they care about.
 */
export async function fetchVipFromJava(
  unionid: string,
  logPrefix: string,
): Promise<FetchVipResult> {
  const response = await fetchJavaWithLog(
    `/user/vip-info?unionid=${encodeURIComponent(unionid)}`,
    {
      logPrefix,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    console.error(`${logPrefix} Java API error:`, response.status);
    return { ok: false, reLogin: false, httpStatus: response.status };
  }

  const data = await parseJsonWithLog<JavaVipResponse>(response, logPrefix);

  if (data?.status === 404 || data?.result === '用户不存在') {
    return { ok: false, reLogin: true };
  }

  return { ok: true, data };
}

/**
 * Fetch web-specific VIP pricing plans from Java backend.
 * Returns the plans array on success, or undefined if the request fails.
 */
export async function fetchVipPlans(): Promise<unknown[] | undefined> {
  try {
    const response = await fetchJavaWithLog('/api/vip/configs?source=web', {
      logPrefix: '[vip/info/configs]',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return undefined;
    const data = await parseJsonWithLog<{ status?: number; data?: unknown[] }>(
      response,
      '[vip/info/configs]',
    );
    if (data.status === 100 && Array.isArray(data.data)) return data.data;
    return undefined;
  } catch (error) {
    console.error('[vip/info] Failed to fetch web configs:', error);
    return undefined;
  }
}

/**
 * Check VIP status for the current request's auth_uid cookie (web / SSR context).
 */
export async function checkVipStatus(): Promise<VipStatusResult> {
  try {
    const cookieStore = await cookies();
    const unionid = cookieStore.get('auth_uid')?.value;
    if (!unionid) return { isVip: false };
    const result = await fetchVipFromJava(unionid, '[quota]');
    if (!result.ok) return { isVip: false };
    return {
      isVip: !!result.data?.data?.isVip,
      userId: String(result.data?.data?.userId ?? ''),
      unionid,
      freeExportCount: result.data?.data?.freeExportCount ?? 0,
    };
  } catch {
    return { isVip: false };
  }
}

/**
 * Check VIP status for an explicit unionid / wxId.
 * Used by API routes that authenticate via signed body (e.g. mini-program).
 */
export async function checkVipStatusForWxId(wxId: string): Promise<VipStatusResult> {
  try {
    const result = await fetchVipFromJava(wxId, '[quota:wxid]');
    if (!result.ok) return { isVip: false, userId: wxId, unionid: wxId };
    return {
      isVip: !!result.data?.data?.isVip,
      userId: String(result.data?.data?.userId ?? wxId),
      unionid: wxId,
      freeExportCount: result.data?.data?.freeExportCount ?? 0,
    };
  } catch {
    return { isVip: false, userId: wxId, unionid: wxId };
  }
}

/**
 * Consume one Java-side single-export balance. Java owns freeExportCount as a
 * remaining balance; Next.js only mirrors usage for display/analytics.
 */
export async function consumeFreeExportFromJava(
  unionid: string,
  logPrefix: string,
): Promise<ConsumeFreeExportResult> {
  if (!unionid) {
    return { ok: false, freeExportCount: 0, message: 'Missing unionid' };
  }

  try {
    const response = await fetchJavaWithLog('/user/consume-free-export', {
      logPrefix,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unionid }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        freeExportCount: 0,
        message: `Java API error: ${response.status}`,
        httpStatus: response.status,
      };
    }

    const data = await parseJsonWithLog<JavaConsumeFreeExportResponse>(response, logPrefix);
    const freeExportCount = data.data?.freeExportCount ?? data.data?.remaining ?? 0;
    if (data.status === 100) {
      return {
        ok: true,
        isVip: !!data.data?.isVip,
        consumed: !!data.data?.consumed,
        freeExportCount,
      };
    }

    return {
      ok: false,
      isVip: !!data.data?.isVip,
      consumed: !!data.data?.consumed,
      freeExportCount,
      message: data.result || '免费导出次数不足',
    };
  } catch (error: unknown) {
    return {
      ok: false,
      freeExportCount: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
