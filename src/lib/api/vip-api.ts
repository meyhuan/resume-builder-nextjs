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
    if (!result.ok) return { isVip: false, userId: wxId };
    return {
      isVip: !!result.data?.data?.isVip,
      userId: String(result.data?.data?.userId ?? wxId),
    };
  } catch {
    return { isVip: false, userId: wxId };
  }
}
