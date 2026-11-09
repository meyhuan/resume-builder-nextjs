'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Crown, Loader2, X } from 'lucide-react'

import type { ExportRetention } from '@/hooks/use-export-retention'
import { usePreloadMiniMembershipPlans } from '@/hooks/use-preload-mini-membership-plans'
import { recommendExportMembership, EXPORT_RETENTION_VERSION, type MembershipCloseReason } from '@/lib/export-retention'
import { track } from '@/lib/analytics'
import { cachedMiniMembershipPlans, loadMiniMembershipPlans, type MiniMembershipPlan as Plan } from '@/lib/mini-membership-plans'
import styles from './export-membership-sheet.module.css'

/** Keep the export preview mounted; only hand off after an explicit purchase. */
export function ExportMembershipSheet({ open, onClose, onRefreshQuota, retention, preload = false }: {
  readonly preload?: boolean
  readonly retention?: ExportRetention
  readonly open: boolean
  readonly onClose: () => void
  readonly onRefreshQuota: () => Promise<unknown>
}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [selected, setSelected] = useState<number>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [paying, setPaying] = useState(false)
  const handedOff = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef({ session: -1, request: 0, selected: undefined as number | undefined })
  const closeRef = useRef({ onClose, retention, plans, loading, error })
  useLayoutEffect(() => {
    closeRef.current = { onClose, retention, plans, loading, error }
  }, [onClose, retention, plans, loading, error])
  const close = useCallback((reason: MembershipCloseReason = 'dismiss') => {
    const state = closeRef.current
    const actualReason = handedOff.current ? 'payment_return' : reason === 'dismiss' && (state.loading || state.error) ? 'error' : reason
    track('paywall_close', { entry: 'mini_export_membership_sheet', exportType: state.retention?.exportType, reason: actualReason, strategyVersion: state.retention?.enabled ? EXPORT_RETENTION_VERSION : undefined })
    void state.retention?.onClose(actualReason, state.plans.find(plan => plan.vipType === 1))
    state.onClose()
  }, [])


  // The phone's back gesture dismisses this sheet first, retaining exportPreview.
  useEffect(() => {
    if (!open) return
    const url = window.location.href
    const marker = 'exportMembershipSheet'
    window.history.pushState({ ...window.history.state, [marker]: true }, '', url)
    const back = () => { if (!window.history.state?.[marker]) close() }
    window.addEventListener('popstate', back)
    return () => {
      window.removeEventListener('popstate', back)
      if (window.location.href === url && window.history.state?.[marker]) window.history.back()
    }
  }, [open, close])

  usePreloadMiniMembershipPlans(preload)

  useEffect(() => {
    if (!open) return
    if (closeRef.current.retention?.status === 'visible') closeRef.current.retention.end()
    let cancelled = false
    // Synchronize a newly opened sheet with the external catalogue cache.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(!cachedMiniMembershipPlans())
    setError('')
    setPaying(false)
    handedOff.current = false
    loadMiniMembershipPlans()
      .then(sorted => {
        if (cancelled) return
        const policy = closeRef.current.retention
        const next = policy?.enabled ? recommendExportMembership(sorted) : sorted
        if (!next.length) throw new Error('暂无可购买套餐，请稍后再试')
        setPlans(next)
        const previous = selectionRef.current
        const forcedMonthly = policy?.enabled && policy.monthlyRequest !== previous.request
        const remembered = (!policy?.enabled || previous.session === policy.previewSession) && next.some(plan => plan.vipType === previous.selected)
        const chosen = forcedMonthly && next.some(plan => plan.vipType === 1) ? 1 : remembered ? previous.selected : next[0].vipType
        selectionRef.current = { session: policy?.previewSession ?? -1, request: policy?.monthlyRequest ?? 0, selected: chosen }
        setSelected(chosen)
        track('export_paywall_view', { entry: 'mini_export_membership_sheet', exportType: policy?.exportType, recommendedVipType: next[0].vipType, selectedVipType: chosen, strategyVersion: policy?.enabled ? EXPORT_RETENTION_VERSION : undefined })
      })
      .catch(() => { if (!cancelled) setError('套餐加载失败，请重试') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, attempt])

  useEffect(() => {
    if (!open) return
    const refresh = () => {
      if (document.hidden || !handedOff.current) return
      handedOff.current = false
      setPaying(false)
      void onRefreshQuota()
      close('payment_return')
    }
    window.addEventListener('pageshow', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [open, close, onRefreshQuota])

  const plan = plans.find(item => item.vipType === selected)
  const purchase = () => {
    if (!plan || loading || error || paying || handedOff.current) return
    if (!window.wx?.miniProgram?.navigateTo) {
      setError('微信支付暂不可用，请稍后重试')
      return
    }
    retention?.end()
    track('paywall_cta_click', { entry: 'mini_export_membership_sheet', exportType: retention?.exportType, action: 'purchase', vipType: plan.vipType, amount: plan.price, strategyVersion: retention?.enabled ? EXPORT_RETENTION_VERSION : undefined })
    setPaying(true)
    handedOff.current = true
    // Native checkout uses its prefetched catalogue; server signing remains the
    // authority for the actual product price.
    const params = new URLSearchParams({ from: 'export', checkout: '1', vipType: String(plan.vipType), price: String(plan.price) })
    window.wx.miniProgram.navigateTo({
      url: `/pages/payment/payment?${params}`,
      fail: () => {
        handedOff.current = false
        setPaying(false)
        setError('未能打开微信支付，请重试')
      },
    })
  }

  return <Dialog.Root open={open} onOpenChange={next => { if (!next) close() }}>
    <Dialog.Portal>
      <Dialog.Overlay className={`${styles.overlay} fixed inset-0 z-[70] bg-black/35`} />
      <Dialog.Content ref={sheetRef} tabIndex={-1} onOpenAutoFocus={event => { event.preventDefault(); sheetRef.current?.focus() }} data-export-membership-sheet className={`${styles.sheet} fixed inset-x-0 bottom-0 z-[71] flex max-h-[80dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-slate-200" />
        <div className="relative px-5 pb-3 pt-3">
          <Dialog.Title className="flex items-center gap-2 pr-8 text-xl font-semibold text-slate-900"><Crown className="size-5 text-violet-600" />开通会员，继续导出</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">免费次数已用完。开通后可导出 PDF、Word 和图片。</Dialog.Description>
          <Dialog.Close aria-label="关闭会员弹窗" className="absolute right-2 top-0 flex size-11 items-center justify-center rounded-lg text-slate-400 outline-none hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400"><X className="size-4" /></Dialog.Close>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-4">
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Check className="size-3.5 text-violet-600" />会员期内不限次导出</span>
            <span className="flex items-center gap-1"><Check className="size-3.5 text-violet-600" />保留当前简历和预览</span>
          </div>
          {loading && !plans.length ? <div className="flex h-28 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-5 animate-spin" />正在加载套餐…</div> : <div role="group" aria-label="会员套餐" aria-busy={loading} className="grid grid-cols-3 gap-2">
            {plans.map(item => <button key={item.vipType} type="button" aria-pressed={selected === item.vipType} onClick={() => { selectionRef.current.selected = item.vipType; setSelected(item.vipType); track('pay_plan_click', { entry: 'mini_export_membership_sheet', exportType: retention?.exportType, strategyVersion: retention?.enabled ? EXPORT_RETENTION_VERSION : undefined, vipType: item.vipType, amount: item.price }) }} disabled={paying} className={`rounded-xl border-2 px-1 py-4 text-center ${selected === item.vipType ? 'border-violet-500 bg-violet-50' : 'border-slate-100 bg-white'}`}>
              {retention?.enabled && item.vipType === 3 && <span className="mb-1 block text-[10px] font-medium text-violet-600">推荐开通</span>}
              <span className="block text-sm font-medium text-slate-900">{(item.name || item.vipName || '会员套餐').replace(/（永久）|\(永久\)/g, '')}</span>
              <span className="mt-2 block text-xl font-semibold text-violet-700"><span className="text-xs">¥</span>{item.price}</span>
              <span className="mt-1 block text-xs text-slate-500">{item.lifetime || item.vipType === 3 ? '长期有效' : `${item.duration} 天`}</span>
            </button>)}
          </div>}
          {error && <div role="alert" className="mt-3 text-sm text-rose-600">{error}<button className="ml-2 underline" onClick={() => setAttempt(value => value + 1)}>重试</button></div>}
          <p className="mt-3 text-xs leading-5 text-slate-400">Word 导出需使用支持 Word 的模板。支付完成后，返回当前预览确认导出。</p>
        </div>
        <div className="border-t border-slate-100 px-5 pb-4 pt-3">
          <button type="button" onClick={purchase} disabled={loading || !plan || paying || !!error} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-base font-semibold text-white disabled:opacity-50">{paying ? <><Loader2 className="size-4 animate-spin" />正在打开微信支付…</> : plan ? `确认开通 · ¥${plan.price}` : '请选择套餐'}</button>
          <p className="mt-2 text-center text-xs text-slate-400">微信支付 · 单次购买，不自动续费</p>
          {paying && <button className="mt-3 w-full text-center text-sm text-slate-500" onClick={() => { void onRefreshQuota(); close('payment_return') }}>已完成或取消支付，返回预览</button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
