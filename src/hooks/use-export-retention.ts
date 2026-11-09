'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { clientAccountKey } from '@/lib/client-account-key'
import { useVipStore } from '@/store/use-vip-store'
import { track } from '@/lib/analytics'
import type { VipQuotaStatus } from '@/lib/quota/vip-types'
import { claimRetention, EXPORT_RETENTION_ENABLED, EXPORT_RETENTION_VERSION, validMembershipPlan, type ExportMembershipPlan, type MembershipCloseReason, type RetentionPlatform } from '@/lib/export-retention'

export function useExportRetention({ platform, refreshQuota, openMembership, enabled = true }: {
  platform: RetentionPlatform
  refreshQuota: () => Promise<VipQuotaStatus | null>
  openMembership: (format: string) => void
  enabled?: boolean
}) {
  const profileId = useAuthStore(state => state.userInfo?.id)
  const account = clientAccountKey(profileId)
  const quota = useVipStore(state => state.quota.pdfExport)
  const [status, setStatus] = useState<'idle' | 'checking' | 'visible' | 'ended'>('idle')
  const [monthly, setMonthly] = useState<ExportMembershipPlan | null>(null)
  const [previewSession, setPreviewSession] = useState(0)
  const [monthlyRequest, setMonthlyRequest] = useState(0)
  const context = useRef({ active: false, eligible: false, format: '' })
  const pending = useRef(0)
  const identity = useRef(account)
  const finished = useRef(false)
  const inFlight = useRef(false)
  const enabledNow = enabled && EXPORT_RETENTION_ENABLED
  identity.current = account

  const log = useCallback((event: 'export_paywall_view' | 'paywall_cta_click' | 'paywall_close', action: string, plan?: ExportMembershipPlan | null) => {
    track(event, { entry: 'export_retention_card', action, strategyVersion: EXPORT_RETENTION_VERSION,
      clientType: platform === 'mini_program' ? 'mini_program_webview' : platform,
      exportType: context.current.format, vipType: plan?.vipType, amount: plan?.price })
  }, [platform])
  const end = useCallback(() => {
    pending.current += 1
    inFlight.current = false
    finished.current = true
    setStatus('ended')
  }, [])
  const setPreviewContext = useCallback((active: boolean, eligible: boolean, format: string) => {
    const previous = context.current
    context.current = { active, eligible, format }
    if (active && !previous.active) {
      pending.current += 1
      finished.current = false
      setStatus('idle')
      setPreviewSession(value => value + 1)
    } else if ((!active && previous.active) || (!eligible && previous.eligible)) end()
  }, [end])
  useEffect(() => {
    end()
    setMonthly(null)
    // A new account may use the current preview, but never inherits a pending prompt.
    finished.current = false
  }, [account, end])
  useEffect(() => {
    if (quota.isVip || quota.allowed || quota.remaining === 'unlimited' || (typeof quota.remaining === 'number' && quota.remaining > 0)) end()
  }, [quota, end])
  useEffect(() => () => { pending.current += 1 }, [])

  const onClose = useCallback(async (reason: MembershipCloseReason, plan?: ExportMembershipPlan | null) => {
    if (reason !== 'dismiss') { end(); return }
    if (!enabledNow || !account || finished.current || inFlight.current || !context.current.active || !context.current.eligible || !plan || plan.vipType !== 1 || !validMembershipPlan(plan)) return
    inFlight.current = true
    const request = ++pending.current
    const currentAccount = account
    setStatus('checking')
    const fresh = await refreshQuota().catch(() => null)
    if (request !== pending.current || identity.current !== currentAccount || clientAccountKey(profileId) !== currentAccount) return
    inFlight.current = false
    const available = fresh?.pdfExport
    if (!available || available.isVip || available.allowed || available.remaining !== 0 || !context.current.active || !context.current.eligible) { end(); return }
    let claimed = false
    try { claimed = claimRetention(window.localStorage, account, platform) } catch { /* storage disabled */ }
    if (!claimed) { end(); return }
    finished.current = true
    setMonthly(plan)
    setStatus('visible')
    log('export_paywall_view', 'retention_view', plan)
  }, [account, profileId, enabledNow, end, log, platform, refreshQuota])

  const viewMonthly = useCallback(async () => {
    if (status !== 'visible' || inFlight.current) return
    inFlight.current = true
    const request = ++pending.current
    const currentAccount = account
    const fresh = await refreshQuota().catch(() => null)
    if (request !== pending.current || identity.current !== currentAccount || clientAccountKey(profileId) !== currentAccount) return
    const available = fresh?.pdfExport
    end()
    if (!available || available.isVip || available.allowed || available.remaining !== 0 || !context.current.active || !context.current.eligible) return
    log('paywall_cta_click', 'view_monthly', monthly)
    setMonthlyRequest(value => value + 1)
    openMembership(context.current.format)
  }, [account, profileId, end, log, monthly, openMembership, refreshQuota, status])
  const dismiss = useCallback(() => { log('paywall_close', 'retention_dismiss', monthly); end() }, [end, log, monthly])
  return { enabled: enabledNow, get exportType() { return context.current.format }, status, monthly, previewSession, monthlyRequest, setPreviewContext, onClose, viewMonthly, dismiss, end }
}
export type ExportRetention = ReturnType<typeof useExportRetention>
