export interface VipPaywallPlan {
  id: number
  vipType: number
  vipName: string
  price: number
  duration: number
  sort: number
}

export interface VipPaywallSnapshot {
  userId: number
  plans: VipPaywallPlan[]
  isVip: boolean
  vipStatus: number
  vipType: number
  vipExpireTime: string | null
  fetchedAt: number
}

interface VipInfoResponse {
  status: number
  data: {
    userId: number
    vipStatus: number
    vipType: number
    vipExpireTime: string | null
    isVip: boolean
    plans: VipPaywallPlan[]
  }
}

/** Local storage key for cross-session instant paywall rendering. */
export const VIP_PAYWALL_STORAGE_KEY = 'aijianli_vip_paywall_snapshot_v1'

/**
 * Plans rarely change. Cache lasts up to 7 days in storage so the pay dialog
 * opens instantly with 0ms loading flash even across page refreshes.
 */
export const VIP_PAYWALL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Background silent revalidation window: if cache is older than 5 minutes,
 * re-verify silently in the background when the paywall opens.
 * This guarantees any backend price change is reflected within 5 minutes.
 */
export const VIP_PAYWALL_STALE_MS = 5 * 60 * 1000

let cachedVipPaywall: VipPaywallSnapshot | null = null
let vipPaywallInflight: Promise<VipPaywallSnapshot> | null = null

function sortPlans(plans: VipPaywallPlan[]): VipPaywallPlan[] {
  return [...plans].sort((a, b) => (b.sort || 0) - (a.sort || 0))
}

function readStorageSnapshot(): VipPaywallSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(VIP_PAYWALL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VipPaywallSnapshot>
    if (
      typeof parsed?.userId === 'number' &&
      Array.isArray(parsed?.plans) &&
      parsed.plans.length > 0 &&
      typeof parsed?.fetchedAt === 'number'
    ) {
      if (Date.now() - parsed.fetchedAt < VIP_PAYWALL_MAX_AGE_MS) {
        return {
          userId: parsed.userId,
          plans: sortPlans(parsed.plans),
          isVip: Boolean(parsed.isVip),
          vipStatus: Number(parsed.vipStatus || 0),
          vipType: Number(parsed.vipType || 0),
          vipExpireTime: parsed.vipExpireTime ?? null,
          fetchedAt: parsed.fetchedAt,
        }
      }
    }
  } catch {
    // Ignore JSON parse or storage access errors
  }
  return null
}

function writeStorageSnapshot(snapshot: VipPaywallSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIP_PAYWALL_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Ignore quota or private-browsing errors
  }
}

/**
 * Check if the snapshot is within the fresh window (<= 5 minutes).
 * Fresh snapshots require NO network requests when the dialog opens.
 */
export function isPaywallFresh(snapshot: VipPaywallSnapshot | null, now = Date.now()): snapshot is VipPaywallSnapshot {
  return Boolean(snapshot && now - snapshot.fetchedAt < VIP_PAYWALL_STALE_MS)
}

/**
 * Check if the snapshot is stale and should be revalidated in the background (> 5 minutes).
 */
export function isPaywallStale(snapshot: VipPaywallSnapshot | null, now = Date.now()): boolean {
  if (!snapshot) return true
  return now - snapshot.fetchedAt >= VIP_PAYWALL_STALE_MS
}

/**
 * Check if the snapshot is valid (within the max age of 7 days).
 */
export function isPaywallUsable(snapshot: VipPaywallSnapshot | null, now = Date.now()): snapshot is VipPaywallSnapshot {
  return Boolean(snapshot && now - snapshot.fetchedAt < VIP_PAYWALL_MAX_AGE_MS)
}

/**
 * Retrieve cached VIP paywall info, checking memory first, then localStorage.
 */
export function getCachedVipPaywall(): VipPaywallSnapshot | null {
  if (isPaywallUsable(cachedVipPaywall)) {
    return cachedVipPaywall
  }
  const fromStorage = readStorageSnapshot()
  if (fromStorage) {
    cachedVipPaywall = fromStorage
    return fromStorage
  }
  return null
}

/**
 * Clear both memory and persistent paywall cache (e.g. on logout or user switch).
 */
export function clearVipPaywallCache(): void {
  cachedVipPaywall = null
  vipPaywallInflight = null
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(VIP_PAYWALL_STORAGE_KEY)
    } catch {
      // Ignore
    }
  }
}

/**
 * Fetch or revalidate VIP paywall info.
 * Deduplicates in-flight requests and updates memory + localStorage caches.
 */
export async function loadVipPaywallInfo(options?: {
  force?: boolean
  fetchImpl?: typeof fetch
}): Promise<VipPaywallSnapshot> {
  const force = options?.force === true
  const fetchImpl = options?.fetchImpl ?? fetch
  const cached = getCachedVipPaywall()

  // If not forced and cache is completely fresh, return immediately without network
  if (!force && isPaywallFresh(cached)) {
    return cached
  }

  if (vipPaywallInflight) {
    return vipPaywallInflight
  }

  vipPaywallInflight = (async (): Promise<VipPaywallSnapshot> => {
    try {
      const res = await fetchImpl('/next-api/vip/info')
      if (!res.ok) throw new Error('Failed to fetch VIP info')
      const json = await res.json() as VipInfoResponse
      const data = json.data
      if (!data?.userId) throw new Error('Invalid response')
      const snapshot: VipPaywallSnapshot = {
        userId: data.userId,
        plans: sortPlans(data.plans || []),
        isVip: Boolean(data.isVip),
        vipStatus: data.vipStatus,
        vipType: data.vipType,
        vipExpireTime: data.vipExpireTime,
        fetchedAt: Date.now(),
      }
      cachedVipPaywall = snapshot
      writeStorageSnapshot(snapshot)
      return snapshot
    } catch (err) {
      // Fallback: If network failed but we have a usable cached snapshot, keep using it
      if (cached && isPaywallUsable(cached)) {
        return cached
      }
      throw err
    }
  })()

  try {
    return await vipPaywallInflight
  } finally {
    vipPaywallInflight = null
  }
}
