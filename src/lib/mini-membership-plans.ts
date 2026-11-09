import { validMembershipPlan, type ExportMembershipPlan } from './export-retention'

export interface MiniMembershipPlan extends ExportMembershipPlan {
  name?: string
  vipName?: string
  lifetime?: boolean
}

// Public mini-program catalogue only. Never share the PC catalogue or persist
// prices across sessions. Server order signing still validates the actual price.
export const MINI_MEMBERSHIP_CACHE_TTL = 5 * 60_000
let cached: { plans: MiniMembershipPlan[]; expiresAt: number } | null = null
let flight: Promise<MiniMembershipPlan[]> | null = null

export function cachedMiniMembershipPlans(): MiniMembershipPlan[] | null {
  return cached && cached.expiresAt > Date.now() ? cached.plans : null
}

export function loadMiniMembershipPlans(force = false): Promise<MiniMembershipPlan[]> {
  const fresh = !force && cachedMiniMembershipPlans()
  if (fresh) return Promise.resolve(fresh)
  if (flight) return flight
  flight = (async () => {
    const response = await fetch('/next-api/vip/mini-plans', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error('套餐加载失败，请重试')
    const body = await response.json()
    const plans: MiniMembershipPlan[] = Array.isArray(body.data?.plans)
      ? body.data.plans.filter((plan: MiniMembershipPlan) => plan && validMembershipPlan(plan))
        .sort((a: MiniMembershipPlan, b: MiniMembershipPlan) => (b.sort || 0) - (a.sort || 0))
      : []
    if (!plans.length) throw new Error('暂无可购买套餐，请稍后再试')
    cached = { plans, expiresAt: Date.now() + MINI_MEMBERSHIP_CACHE_TTL }
    return plans
  })().catch(error => { cached = null; throw error }).finally(() => { flight = null })
  return flight
}
