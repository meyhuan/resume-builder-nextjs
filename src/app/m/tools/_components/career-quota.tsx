'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { useVipCheck } from '@/hooks/use-vip-check'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { useInMiniProgram } from '../../_components/use-mini-program'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function useCareerQuota() {
  const vip = useVipCheck()
  const inMini = useInMiniProgram()
  const [exhausted, setExhausted] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const q = vip.quota.aiEditorAssist
  const { refreshQuota } = vip
  useEffect(() => {
    const refresh = () => { void refreshQuota() }
    refresh()
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refreshQuota])
  const upgrade = () => {
    setExhausted(false)
    if (inMini && window.wx?.miniProgram?.navigateTo) {
      window.wx.miniProgram.navigateTo({ url: '/pages/payment/payment?from=ai' })
    } else {
      vip.setShowUpgrade(true, 'ai')
    }
  }
  return {
    allow: () => {
      if (vip.quotaLoaded && !q.isVip && !q.allowed) { setExhausted(true); return false }
      return true
    },
    handleError: (data: { quotaExceeded?: boolean }) => {
      if (!data.quotaExceeded) return false
      setExhausted(true)
      void vip.refreshQuota()
      return true
    },
    refresh: () => { void vip.refreshQuota() },
    ui: <>
      {vip.quotaLoaded && !q.isVip && <div className="mt-2 text-xs leading-5 text-slate-500">
        <div className="flex items-center justify-center">
          <span aria-live="polite">本次消耗 1 次 · <span className={Number(q.remaining) <= 3 ? 'font-medium text-amber-700' : undefined}>今日剩余 {q.remaining} 次</span></span>
          <button type="button" aria-label="查看扣次规则" onClick={() => setShowRules(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 focus-visible:outline-2 focus-visible:outline-violet-500">
            <Info size={14} aria-hidden="true" />
          </button>
        </div>
      </div>}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogTitle>扣次规则</DialogTitle>
          <DialogDescription className="leading-6">与 AI 助手共享每日额度。每次生成预扣 1 次，生成失败退回（翻译部分失败也会退回）；主动取消或离开页面不退次。每日额度次日重置。</DialogDescription>
          <button type="button" className="h-11 rounded-xl bg-slate-100" onClick={() => setShowRules(false)}>知道了</button>
        </DialogContent>
      </Dialog>
      <Dialog open={exhausted} onOpenChange={setExhausted}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogTitle>今日 AI 助手额度已用完</DialogTitle>
          <DialogDescription>打招呼、面试准备、岗位匹配和翻译共享每日免费额度。可以明日再试，或开通会员继续使用。已输入的内容会保留。</DialogDescription>
          <div className="flex gap-3">
            <button type="button" className="h-11 flex-1 rounded-xl bg-slate-100" onClick={() => setExhausted(false)}>明日再试</button>
            <button type="button" className="h-11 flex-1 rounded-xl bg-violet-600 text-white" onClick={upgrade}>开通会员</button>
          </div>
        </DialogContent>
      </Dialog>
      {!inMini && <VipUpgradeDialog open={vip.showUpgrade} onOpenChange={vip.setShowUpgrade} />}
    </>,
  }
}
