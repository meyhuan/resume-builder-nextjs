/** One switch controls both export-only recommendations and retention. */
export const EXPORT_RETENTION_ENABLED = process.env.NEXT_PUBLIC_EXPORT_RETENTION_ENABLED !== 'false'
export const EXPORT_RETENTION_VERSION = 'monthly-v1'
export type RetentionPlatform = 'pc_web' | 'mini_program'
export type MembershipCloseReason = 'dismiss' | 'payment_return' | 'success' | 'error' | 'leave'
export interface ExportMembershipPlan {
  vipType: number
  price: number
  duration: number
  enabled?: boolean
  status?: number
  sort?: number
}
export function validMembershipPlan(plan: ExportMembershipPlan): boolean {
  return plan.enabled !== false && plan.status !== 0 && [1, 2, 3].includes(plan.vipType)
    && Number.isFinite(plan.price) && plan.price > 0 && Number.isFinite(plan.duration) && plan.duration > 0
}
export function recommendExportMembership<T extends ExportMembershipPlan>(plans: T[]): T[] {
  // Keep the primary offer fixed: lifetime, annual, monthly. The retention
  // entry changes selection to monthly, never the order of the cards.
  return plans.filter(validMembershipPlan).sort((a, b) => b.vipType - a.vipType)
}
export function retentionDay(now = Date.now()): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
export function retentionKey(account: string, platform: RetentionPlatform): string {
  return `export-retention:${EXPORT_RETENTION_VERSION}:${platform}:${encodeURIComponent(account)}`
}
export function canShowRetention(storage: Pick<Storage, 'getItem'>, account: string, platform: RetentionPlatform, now = Date.now()): boolean {
  if (!account) return false
  try { return storage.getItem(retentionKey(account, platform)) !== retentionDay(now) } catch { return false }
}
export function claimRetention(storage: Pick<Storage, 'getItem' | 'setItem'>, account: string, platform: RetentionPlatform, now = Date.now()): boolean {
  if (!canShowRetention(storage, account, platform, now)) return false
  try {
    const key = retentionKey(account, platform)
    storage.setItem(key, retentionDay(now))
    return storage.getItem(key) === retentionDay(now)
  } catch { return false }
}
