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
import { loadMiniSingleExport, type MiniSingleExport } from '@/lib/mini-single-export'
import { miniProgramRuntime } from '@/app/m/_components/mini-program-runtime'

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
  const [mode, setMode] = useState<'member' | 'single_export'>('member')
  const [singleProduct, setSingleProduct] = useState<MiniSingleExport | null>(null)
  const [singleLoading, setSingleLoading] = useState(true)
  const [singleError, setSingleError] = useState('')
  const handedOff = useRef(false)
  const singleAttempt = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef({ session: -1, request: 0, selected: undefined as number | undefined })
  const closeRef = useRef({ onClose, retention, plans, loading, error })
  useLayoutEffect(() => {
    closeRef.current = { onClose, retention, plans, loading: mode === 'single_export' ? singleLoading : loading, error: mode === 'single_export' ? singleError : error }
  }, [onClose, retention, plans, loading, error, mode, singleLoading, singleError])
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
    setSingleLoading(true)
    setSingleError('')
    const refreshSingle = singleAttempt.current !== attempt
    singleAttempt.current = attempt
    loadMiniSingleExport(refreshSingle).then(product => {
      if (!cancelled) setSingleProduct(product)
    }).catch(() => {
      if (!cancelled) { setSingleProduct(null); setSingleError('单次导出方案加载失败，请重试') }
    }).finally(() => { if (!cancelled) setSingleLoading(false) })
    loadMiniMembershipPlans()
      .then(sorted => {
        if (cancelled) return
        const policy = closeRef.current.retention
        const next = policy?.enabled ? recommendExportMembership(sorted) : sorted
        if (!next.length) throw new Error('暂无可购买套餐，请稍后再试')
        setPlans(next)
        const previous = selectionRef.current
        const forcedMonthly = policy?.enabled && policy.monthlyRequest !== previous.request
        if (forcedMonthly || (policy && previous.session !== policy.previewSession)) setMode('member')
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

  const isSingle = mode === 'single_export'
  const monthly = plans.find(item => item.vipType === 1)
  const plan = isSingle ? singleProduct : plans.find(item => item.vipType === selected)
  const activeLoading = isSingle ? singleLoading : loading
  const activeError = isSingle ? singleError : error
  const purchase = () => {
    if (!plan || activeLoading || activeError || paying || handedOff.current) return
    if (isSingle && !miniProgramRuntime.supportsSingleExportCheckout()) {
      setSingleError('请更新小程序后购买单次导出')
      return
    }
    if (!window.wx?.miniProgram?.navigateTo) {
      if (isSingle) setSingleError('微信支付暂不可用，请稍后重试')
      else setError('微信支付暂不可用，请稍后重试')
      return
    }
    retention?.end()
    track('paywall_cta_click', { entry: 'mini_export_membership_sheet', exportType: retention?.exportType, action: 'purchase', productType: isSingle ? 'single_export' : 'vip', vipType: plan.vipType, amount: plan.price, strategyVersion: retention?.enabled ? EXPORT_RETENTION_VERSION : undefined })
    setPaying(true)
    handedOff.current = true
    // Native checkout uses its prefetched catalogue; server signing remains the
    // authority for the actual product price.
    const params = new URLSearchParams({ from: 'export', checkout: '1', vipType: String(plan.vipType), price: String(plan.price) })
    if (isSingle && singleProduct) {
      params.set('productType', 'single_export')
      params.set('goodsId', singleProduct.goodsId)
    }
    window.wx.miniProgram.navigateTo({
      url: `/pages/payment/payment?${params}`,
      fail: () => {
        handedOff.current = false
        setPaying(false)
        if (isSingle) setSingleError('未能打开微信支付，请重试')
        else setError('未能打开微信支付，请重试')
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
            <Dialog.Description className={styles['export-hero-desc']}>支付后，返回预览确认导出</Dialog.Description>
            <div className={styles['export-benefits']}>
              {([['shield', '无损原画质'], ['file', 'PDF / 图片双格式'], ['flash', '支持相册/发好友']] as const).map(([icon, label]) => <span key={icon} className={styles['export-benefit']}><Image src={`/images/paywall/${icon}.svg`} width={14} height={14} alt="" />{label}</span>)}
            </div>
          </div>
          <div className={styles['export-plan-area']}>
            <div className={styles['export-mode-tabs']} role="group" aria-label="导出购买方式">
              <button type="button" aria-pressed={!isSingle} disabled={paying} onClick={() => setMode('member')} className={`${styles['export-mode-tab']} ${!isSingle ? styles.active : ''}`}><span className={styles['export-mode-title-row']}>会员不限次导出<span className={styles['export-mode-badge']}>推荐</span></span></button>
              <button type="button" aria-pressed={isSingle} disabled={paying} onClick={() => setMode('single_export')} className={`${styles['export-mode-tab']} ${isSingle ? styles.active : ''}`}>单次导出 (仅限1次)</button>
            </div>
            <div className={styles['export-plan-panel']}>
              {isSingle ? <div className={styles['export-plan-content-single']}>
                {singleLoading ? <div className={styles.loading}><Loader2 className="size-5 animate-spin" />正在加载单次导出方案…</div> : singleProduct ? <>
                  <div className={styles['single-limit-warning']}><Image className={styles['warning-icon-svg']} src="/images/paywall/warning.svg" width={13} height={13} alt="" /><span className={styles['warning-text']}>仅限导出当前版本 1 次，后续错别字修改需重新购买</span></div>
                  <div className={`${styles['single-offer-card']} ${styles.selected}`}>
                    <div className={styles['single-offer-main']}><span className={styles['single-offer-title']}>{singleProduct.name}</span><span className={styles['single-offer-period']}>仅本次有效 · 无法修改重新导出</span></div>
                    <span className={styles['single-offer-price']}><span className={styles['single-price-symbol']}>¥</span><span className={styles['single-price-value']}>{singleProduct.price}</span></span>
                  </div>
                  {monthly && monthly.price > singleProduct.price && <button type="button" disabled={paying} className={styles['upgrade-banner']} onClick={() => { setMode('member'); setSelected(monthly.vipType); selectionRef.current.selected = monthly.vipType }}>
                    <span className={styles['upgrade-banner-left']}><span className={styles['upgrade-banner-title-row']}><Image className={styles['upgrade-icon-svg']} src="/images/paywall/sparkles.svg" width={14} height={14} alt="" /><span className={styles['upgrade-banner-title']}>仅多加 ¥{Number((monthly.price - singleProduct.price).toFixed(2))} 升级求职月卡</span><span className={styles['upgrade-banner-badge']}>推荐</span></span><span className={styles['upgrade-banner-desc']}>{monthly.duration}天无限次修改重新导出 · 赠 AI 简历精修</span></span><span className={styles['upgrade-banner-cta']}>升级 ›</span>
                  </button>}
                </> : !singleError && <div className={styles.loading}>单次导出暂不可购买</div>}
              </div> : <>
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
              </>}
            </div>
          </div>
          {activeError && <div role="alert" className="mt-3 text-sm text-rose-600">{activeError}<button className="ml-2 underline" onClick={() => setAttempt(value => value + 1)}>重试</button></div>}
        </div>
        <div className={styles['bottom-section']}>
          <button type="button" onClick={purchase} disabled={activeLoading || !plan || paying || !!activeError} className={styles['pay-button']}>{paying ? <><Loader2 className="size-4 animate-spin" />正在打开微信支付…</> : plan ? `¥${plan.price} ${isSingle ? '立即单次导出' : plan.vipType === 3 ? '立即永久开通' : '立即开通'}` : '请选择套餐'}</button>
          <div className={styles['pay-safe-row']}><span className={styles['pay-safe-primary']}><Image src="/images/paywall/shield.svg" width={11} height={11} alt="" />微信安全支付</span><span>单次付费不自动续费</span><span>支付后生效</span></div>
          {paying && <button className="mt-3 w-full text-center text-sm text-slate-500" onClick={() => { void onRefreshQuota(); close('payment_return') }}>已完成或取消支付，返回预览</button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
