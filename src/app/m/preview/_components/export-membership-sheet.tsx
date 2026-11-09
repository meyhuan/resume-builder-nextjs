'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X } from 'lucide-react'
import Image from 'next/image'

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
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content ref={sheetRef} tabIndex={-1} onOpenAutoFocus={event => { event.preventDefault(); sheetRef.current?.focus() }} data-export-membership-sheet className={styles.sheet}>
        <Dialog.Close aria-label="关闭会员弹窗" className={styles.close}><X size={16} /></Dialog.Close>
        <div className={styles.body}>
          <div className={styles['export-paywall']}>
            <Dialog.Title className={styles['export-hero-title']}>导出<span className={styles['export-hero-highlight']}>高清无水印</span>简历</Dialog.Title>
            <Dialog.Description className={styles['export-hero-desc']}>开通会员后，返回预览确认导出</Dialog.Description>
            <div className={styles['export-benefits']}>
              {([['shield', '无损原画质'], ['file', 'PDF / 图片双格式'], ['flash', '支持相册/发好友']] as const).map(([icon, label]) => <span key={icon} className={styles['export-benefit']}><Image src={`/images/paywall/${icon}.svg`} width={14} height={14} alt="" />{label}</span>)}
            </div>
          </div>
          <div className={styles['export-plan-area']}>
            <div className={styles['export-mode-tabs']}><div className={`${styles['export-mode-tab']} ${styles.active}`}><span className={styles['export-mode-title-row']}>会员不限次导出<span className={styles['export-mode-badge']}>推荐</span></span></div></div>
            <div className={styles['export-plan-panel']}>
              <div className={styles['plan-benefits-compact']}>
                {['多份简历多次修改', '全场模板免费商用', '含 AI 诊断精修'].map(label => <span key={label} className={styles['plan-benefit-chip']}><Image src="/images/paywall/check-pink.svg" width={12} height={12} alt="" />{label}</span>)}
              </div>
              {loading && !plans.length ? <div className={styles.loading}><Loader2 className="size-5 animate-spin" />正在加载套餐…</div> : <div role="group" aria-label="会员套餐" aria-busy={loading} className={styles['membership-options']}>
                {plans.map(item => <button key={item.vipType} type="button" aria-pressed={selected === item.vipType} onClick={() => { selectionRef.current.selected = item.vipType; setSelected(item.vipType); track('pay_plan_click', { entry: 'mini_export_membership_sheet', exportType: retention?.exportType, strategyVersion: retention?.enabled ? EXPORT_RETENTION_VERSION : undefined, vipType: item.vipType, amount: item.price }) }} disabled={paying} className={`${styles['membership-card']} ${selected === item.vipType ? styles.selected : ''}`}>
                  <span className={`${styles['card-tag']} ${styles[item.vipType === 3 ? 'card-tag-amber' : item.vipType === 2 ? 'card-tag-purple' : 'card-tag-gray']}`}>{item.vipType === 3 ? '超值买断' : item.vipType === 2 ? '应届首选' : '短期突击'}</span>
                  <span className={styles['card-header-group']}>
                    <span className={styles['card-title']}>{(item.name || item.vipName || '会员套餐').replace(/（永久）|\(永久\)/g, '')}</span>
                    <span className={styles['card-subtitle']}>{item.lifetime || item.vipType === 3 ? '长期有效' : `${item.duration}天有效`}</span>
                  </span>
                  <span className={styles['card-price']}><span className={styles['price-symbol']}>¥</span><span className={styles['price-value']}>{item.price}</span></span>
                  <span className={`${styles['price-period']} ${item.vipType === 3 ? styles['price-period-pill'] : ''}`}>{item.vipType === 3 ? '永久免费重导' : item.vipType === 2 ? `约 ¥${(item.price / item.duration).toFixed(2)}/天` : '无限次修改'}</span>
                </button>)}
              </div>}
            </div>
          </div>
          {error && <div role="alert" className="mt-3 text-sm text-rose-600">{error}<button className="ml-2 underline" onClick={() => setAttempt(value => value + 1)}>重试</button></div>}
        </div>
        <div className={styles['bottom-section']}>
          <button type="button" onClick={purchase} disabled={loading || !plan || paying || !!error} className={styles['pay-button']}>{paying ? <><Loader2 className="size-4 animate-spin" />正在打开微信支付…</> : plan ? `¥${plan.price} ${plan.vipType === 3 ? '立即永久开通' : '立即开通'}` : '请选择套餐'}</button>
          <div className={styles['pay-safe-row']}><span className={styles['pay-safe-primary']}><Image src="/images/paywall/shield.svg" width={11} height={11} alt="" />微信安全支付</span><span>单次付费不自动续费</span><span>支付后生效</span></div>
          {paying && <button className="mt-3 w-full text-center text-sm text-slate-500" onClick={() => { void onRefreshQuota(); close('payment_return') }}>已完成或取消支付，返回预览</button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
