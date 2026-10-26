'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Loader2, CheckCircle, RefreshCw, Check, X, Infinity as InfinityIcon, ShieldCheck, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/use-auth-store';
import { useVipStore } from '@/store/use-vip-store';
import { track } from '@/lib/analytics';

const H5_PAY_BASE_URL = 'https://aijianli.cn/static/pay/dist/index.html';
const POLL_INTERVAL_MS = 3000;

function createPaySessionId(): string {
  const random = Math.random().toString(36).slice(2);
  return `pcpay_${Date.now().toString(36)}_${random}`;
}

interface ComparisonFeature {
  feature: string;
  subtext: string;
  nonVip: string;
  vip: string;
}

/**
 * Membership benefits comparison
 * Source of truth: src/lib/quota/membership-benefits.ts
 */
const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    feature: 'PDF 高清导出',
    subtext: '简历随时微调修改、针对不同公司定制导出',
    nonVip: '1',
    vip: 'infinity',
  },
  {
    feature: 'Word 导出（指定模板）',
    subtext: '国企/考公/校招网申必填，支持本地自由排版',
    nonVip: '与 PDF 共用次数',
    vip: 'infinity',
  },
  {
    feature: 'AI 编辑助手',
    subtext: 'STAR 法则重写经历、JD 匹配诊断、面试押题',
    nonVip: 'limited',
    vip: 'infinity',
  },
  {
    feature: '无水印导出 & 精品模板',
    subtext: '解锁全站 HR 严选专业模板，导出纯净无水印',
    nonVip: 'cross',
    vip: 'check',
  },
  {
    feature: '一对一简历指导 & 多格式导出',
    subtext: '含高清长图、Markdown 导出及专属求职辅导',
    nonVip: 'cross',
    vip: 'check',
  },
];

const CONTEXT_COPY = {
  'docx-export': {
    title: '导出可编辑的 Word 简历',
    description: 'Word 与 PDF 共用导出次数。当前免费次数已用完，开通会员后可继续导出。',
  },
  'pdf-export': {
    title: '你的简历已就绪，升级会员无限次高清导出',
    description: '求职投递往往需要反复微调简历，开通后支持不限次数导出高清无水印 PDF、可编辑 Word 及 AI 深度润色',
  },
  ai: {
    title: 'AI 编辑助手免费额度已用完，升级畅享无限次优化',
    description: '开通后可无限制使用对话、岗位匹配诊断、中英翻译、面试准备、简历检查和全文润色',
  },
  generic: {
    title: '升级 VIP 会员，解锁全部高通过率求职特权',
    description: '畅享无限次高清 PDF / 可编辑 Word 导出、AI 全套简历优化助手、全站精品无水印模板与一对一求职指导',
  },
};

interface VipPlan {
  id: number;
  vipType: number;
  vipName: string;
  price: number;
  duration: number;
  sort: number;
}

interface PlanDisplayMeta {
  badge: string | null;
  badgeStyle?: React.CSSProperties;
  originalPrice: number;
  bottomTag: string;
}

function getPlanDisplayMeta(plan: VipPlan): PlanDisplayMeta {
  const isLifetime = plan.duration >= 30000 || plan.vipType === 3;
  const isYearly = !isLifetime && (plan.duration >= 300 || plan.vipType === 2);

  if (isLifetime) {
    return {
      badge: '超值买断',
      badgeStyle: { background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' },
      originalPrice: plan.price > 100 ? Math.round(plan.price * 2.5) : 199,
      bottomTag: '一次开通永久用',
    };
  }

  if (isYearly) {
    const dailyPrice = (plan.price / (plan.duration || 365)).toFixed(2);
    return {
      badge: '应届首选',
      badgeStyle: { background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
      originalPrice: plan.price > 60 ? Math.round(plan.price * 2) : 99,
      bottomTag: `约 ${dailyPrice}元/天`,
    };
  }

  return {
    badge: null,
    originalPrice: plan.price > 25 ? Math.round(plan.price * 1.5) : 29.9,
    bottomTag: '短期突击投递',
  };
}

interface VipInfoResponse {
  status: number;
  data: {
    userId: number;
    vipStatus: number;
    vipType: number;
    vipExpireTime: string | null;
    isVip: boolean;
    plans: VipPlan[];
  };
}

interface VipPollResponse {
  status: number;
  data: {
    vipStatus: number;
    vipType: number;
    vipExpireTime: string | null;
    isVip: boolean;
  };
}

interface InvitationRewardInfo {
  invitationsRequired: number;
  description?: string;
  claimed?: boolean;
}

interface InvitationStats {
  successfulInvitations?: number;
  availableRewards?: InvitationRewardInfo[];
}

interface InviteMiniCodeResponse {
  ticket: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  invitationCode: string;
  invitationStats?: InvitationStats;
}

interface InviteStatusResponse {
  entry?: {
    status?: string;
    isVip?: boolean;
    vipStatus?: number;
    vipType?: number;
    vipExpireTime?: string | null;
    invitationStats?: InvitationStats;
  };
  pdfExport?: {
    allowed: boolean;
    isVip: boolean;
    remaining: number | 'unlimited';
  };
}

type DialogStep = 'loading' | 'qrcode' | 'success' | 'error';
type DialogMode = 'pay' | 'invite';

interface VipUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidePlanOptions?: boolean;
  overlayClassName?: string;
}

export default function VipUpgradeDialog({ open, onOpenChange, hidePlanOptions = false, overlayClassName = 'bg-black/35' }: VipUpgradeDialogProps): React.ReactElement {
  const { updateVipStatus, token } = useAuthStore();
  const upgradeContext = useVipStore((state) => state.upgradeContext);
  const quota = useVipStore((state) => state.quota);
  const refreshQuotaStore = useVipStore((state) => state.refreshQuota);
  const [step, setStep] = useState<DialogStep>('loading');
  const [mode, setMode] = useState<DialogMode>('pay');
  const [userId, setUserId] = useState<number | null>(null);
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [selectedVipType, setSelectedVipType] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [inviteData, setInviteData] = useState<InviteMiniCodeResponse | null>(null);
  const [inviteStatus, setInviteStatus] = useState<InviteStatusResponse | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string>('');
  const [inviteSuccess, setInviteSuccess] = useState<boolean>(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const invitePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasVipRef = useRef<boolean>(false);
  const paySessionIdRef = useRef<string>('');

  const stopPolling = useCallback((): void => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopInvitePolling = useCallback((): void => {
    if (invitePollRef.current) {
      clearInterval(invitePollRef.current);
      invitePollRef.current = null;
    }
  }, []);

  const resetInviteState = useCallback((): void => {
    stopInvitePolling();
    setInviteData(null);
    setInviteStatus(null);
    setInviteLoading(false);
    setInviteError('');
    setInviteSuccess(false);
  }, [stopInvitePolling]);

  const fetchVipInfo = useCallback(async (): Promise<void> => {
    setStep('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/next-api/vip/info');
      if (!res.ok) throw new Error('Failed to fetch VIP info');
      const json: VipInfoResponse = await res.json();
      const data = json.data;
      if (!data) throw new Error('Invalid response');
      wasVipRef.current = data.isVip;
      setUserId(data.userId);
      const sortedPlans = (data.plans || []).sort((a: VipPlan, b: VipPlan) => (b.sort || 0) - (a.sort || 0));
      setPlans(sortedPlans);
      setSelectedVipType(sortedPlans[0]?.vipType ?? null);
      if (data.isVip) {
        updateVipStatus({
          vipStatus: data.vipStatus,
          vipType: data.vipType,
          vipExpireTime: data.vipExpireTime,
          isVip: true,
        });
      }
      track('pay_page_view', {
        entry: 'vip_upgrade_dialog',
        upgradeContext,
        source: 'web',
        planCount: sortedPlans.length,
        recommendedVipType: sortedPlans[0]?.vipType,
      });
      if (upgradeContext === 'pdf-export') {
        track('export_paywall_view', {
          entry: 'vip_upgrade_dialog',
          upgradeContext,
          source: 'web',
          planCount: sortedPlans.length,
          recommendedVipType: sortedPlans[0]?.vipType,
        });
      }
      setStep('qrcode');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  }, [updateVipStatus, upgradeContext]);

  const startPolling = useCallback((): void => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/next-api/vip/poll');
        if (!res.ok) return;
        const json: VipPollResponse = await res.json();
        const data = json.data;
        if (data?.isVip && !wasVipRef.current) {
          stopPolling();
          updateVipStatus({
            vipStatus: data.vipStatus,
            vipType: data.vipType,
            vipExpireTime: data.vipExpireTime,
            isVip: true,
          });
          setStep('success');
        }
      } catch {
        // continue polling
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, updateVipStatus]);

  const pollInviteStatus = useCallback(async (ticket: string): Promise<void> => {
    const res = await fetch(`/next-api/invitation/status?ticket=${encodeURIComponent(ticket)}`);
    if (!res.ok) return;
    const data: InviteStatusResponse = await res.json();
    setInviteStatus(data);
    if (data.entry?.isVip) {
      updateVipStatus({
        vipStatus: data.entry.vipStatus ?? 1,
        vipType: data.entry.vipType ?? 0,
        vipExpireTime: data.entry.vipExpireTime ?? null,
        isVip: true,
      });
    }
    await refreshQuotaStore(token || 'cookie-auth');
    const remaining = data.pdfExport?.remaining;
    if (data.pdfExport?.isVip || remaining === 'unlimited' || (typeof remaining === 'number' && remaining > 0)) {
      setInviteSuccess(true);
      stopInvitePolling();
    }
  }, [refreshQuotaStore, stopInvitePolling, token, updateVipStatus]);

  const startInvitePolling = useCallback((ticket: string): void => {
    stopInvitePolling();
    void pollInviteStatus(ticket);
    invitePollRef.current = setInterval(() => {
      void pollInviteStatus(ticket);
    }, POLL_INTERVAL_MS);
  }, [pollInviteStatus, stopInvitePolling]);

  const loadInviteCode = useCallback(async (): Promise<void> => {
    track('paywall_cta_click', {
      entry: 'vip_upgrade_dialog',
      upgradeContext,
      source: 'web',
      action: 'invite_instead_of_pay',
    });
    setMode('invite');
    stopPolling();
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess(false);
    try {
      const res = await fetch('/next-api/invitation/mini-code');
      const data = await res.json().catch(() => null) as InviteMiniCodeResponse | { error?: string } | null;
      if (!res.ok || !data || !('ticket' in data)) {
        throw new Error((data && 'error' in data && data.error) ? data.error : '生成小程序码失败');
      }
      setInviteData(data);
      setInviteStatus(null);
      startInvitePolling(data.ticket);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : '生成小程序码失败');
    } finally {
      setInviteLoading(false);
    }
  }, [startInvitePolling, stopPolling, upgradeContext]);

  useEffect(() => {
    if (open) {
      paySessionIdRef.current = createPaySessionId();
      setMode('pay');
      resetInviteState();
      fetchVipInfo();
    } else {
      paySessionIdRef.current = '';
      stopPolling();
      resetInviteState();
      setStep('loading');
    }
    return () => {
      stopPolling();
      stopInvitePolling();
    };
  }, [open, fetchVipInfo, resetInviteState, stopInvitePolling, stopPolling]);

  const selectedPlan = plans.find((plan) => plan.vipType === selectedVipType) || plans[0];
  const selectedPlanMeta = selectedPlan ? getPlanDisplayMeta(selectedPlan) : null;
  const savedAmount = selectedPlan && selectedPlanMeta
    ? Math.max(0, Number((selectedPlanMeta.originalPrice - selectedPlan.price).toFixed(1)))
    : 0;
  const pcPaySessionId = paySessionIdRef.current;
  const payUrl = userId && pcPaySessionId
    ? `${H5_PAY_BASE_URL}?${new URLSearchParams({
        userId: String(userId),
        source: 'web',
        vipType: selectedVipType === null ? '' : String(selectedVipType),
        autoPay: '1',
        pcPaySessionId,
        entry: 'vip_upgrade_dialog',
        upgradeContext,
      }).toString()}`
    : '';

  useEffect(() => {
    if (step === 'qrcode' && mode === 'pay') {
      startPolling();
    }
    return () => {
      if (step !== 'qrcode' || mode !== 'pay') {
        stopPolling();
      }
    };
  }, [mode, step, startPolling, stopPolling]);

  useEffect(() => {
    if (step !== 'qrcode' || mode !== 'pay' || !payUrl || hidePlanOptions) {
      return;
    }
    track('pay_qrcode_view', {
      entry: 'vip_upgrade_dialog',
      upgradeContext,
      source: 'web',
      payChannel: 'wechat',
      pcPaySessionId,
      autoPay: true,
      planId: selectedPlan?.id,
      vipType: selectedVipType,
      amount: selectedPlan?.price,
    });
  }, [hidePlanOptions, mode, payUrl, pcPaySessionId, selectedPlan?.id, selectedPlan?.price, selectedVipType, step, upgradeContext]);

  const dialogCopy = CONTEXT_COPY[upgradeContext] || CONTEXT_COPY.generic;
  const handleSelectVipType = (plan: VipPlan): void => {
    setSelectedVipType(plan.vipType);
    track('paywall_cta_click', {
      entry: 'vip_upgrade_dialog',
      upgradeContext,
      source: 'web',
      action: 'select_plan',
      planId: plan.id,
      vipType: plan.vipType,
      amount: plan.price,
      payChannel: 'wechat',
    });
    track('pay_plan_click', {
      entry: 'vip_upgrade_dialog',
      upgradeContext,
      source: 'web',
      planId: plan.id,
      vipType: plan.vipType,
      amount: plan.price,
      payChannel: 'wechat',
    });
  };
  const handleDialogOpenChange = useCallback((nextOpen: boolean): void => {
    if (!nextOpen && open) {
      track('paywall_close', {
        entry: 'vip_upgrade_dialog',
        upgradeContext,
        source: 'web',
        mode,
        step,
      });
    }
    onOpenChange(nextOpen);
  }, [mode, onOpenChange, open, step, upgradeContext]);
  const canShowInviteOption = !hidePlanOptions
    && upgradeContext === 'pdf-export'
    && !quota.pdfExport.isVip
    && quota.pdfExport.remaining === 0;
  const activeInviteStats = inviteStatus?.entry?.invitationStats || inviteData?.invitationStats;
  const successfulInvitations = activeInviteStats?.successfulInvitations ?? 0;
  const nextReward = activeInviteStats?.availableRewards
    ?.filter((reward) => successfulInvitations < reward.invitationsRequired)
    .sort((a, b) => a.invitationsRequired - b.invitationsRequired)[0];
  const nextRewardText = nextReward
    ? `还差 ${nextReward.invitationsRequired - successfulInvitations} 人可得${nextReward.description || '下一档奖励'}`
    : '已获得全部邀请奖励';

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className="max-w-[880px] w-[92vw] gap-0 overflow-hidden rounded-2xl border border-violet-200/80 bg-white p-0 shadow-2xl"
      >
        {/* Header: Benefit-Driven Copy */}
        <div
          className="px-7 py-4 text-white"
          style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #6d28d9 100%)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
              <Crown className="w-5 h-5 text-amber-300 fill-amber-300 shrink-0" />
              {dialogCopy.title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-purple-100/95">
              {dialogCopy.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="bg-gradient-to-b from-slate-50/50 via-white to-white p-6 min-h-[430px]">
          {step === 'loading' && (
            <div className="flex h-[380px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <span className="text-sm text-slate-500">正在加载...</span>
            </div>
          )}

          {step === 'qrcode' && payUrl && mode === 'invite' && (
            <div className="flex h-full flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col justify-between rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <div>
                  <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-100">
                    不想付费，也可以邀请好友获取导出次数
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">邀请好友注册，导出次数自动加到电脑端</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    电脑端和小程序共用同一份用户权益。好友通过你的邀请注册后，下载次数和会员奖励会自动生效。
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold text-slate-900">{successfulInvitations}</div>
                    <div className="mt-1 text-xs text-slate-500">已邀请</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold text-slate-900">3人</div>
                    <div className="mt-1 text-xs text-slate-500">+3次下载</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold text-slate-900">5人+</div>
                    <div className="mt-1 text-xs text-slate-500">会员奖励</div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {inviteSuccess ? '导出次数或会员权益已到账，可以回到编辑器继续导出。' : nextRewardText}
                </div>
                <button
                  type="button"
                  onClick={(): void => {
                    track('paywall_cta_click', {
                      entry: 'vip_upgrade_dialog',
                      upgradeContext,
                      source: 'web',
                      action: 'back_to_pay',
                    });
                    setMode('pay');
                    stopInvitePolling();
                  }}
                  className="mt-4 w-fit text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  返回开通会员
                </button>
              </div>

              <div className="w-full md:w-[300px] shrink-0 flex flex-col items-center justify-center rounded-xl border border-amber-100 bg-amber-50/40 p-5">
                {inviteLoading && (
                  <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                    正在生成小程序码...
                  </div>
                )}
                {!inviteLoading && inviteError && (
                  <div className="text-center">
                    <div className="text-sm text-rose-600">{inviteError}</div>
                    <button
                      type="button"
                      onClick={loadInviteCode}
                      className="mt-4 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                    >
                      重新生成
                    </button>
                  </div>
                )}
                {!inviteLoading && !inviteError && inviteData && (
                  <>
                    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-amber-100">
                      <img src={inviteData.qrCodeDataUrl} alt="邀请好友小程序码" className="h-44 w-44" />
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm font-medium text-slate-800">微信扫码进入邀请页</p>
                      <p className="mt-1 text-xs text-slate-500">扫码后分享给好友，电脑端会自动刷新导出次数</p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-100">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        {inviteSuccess ? '权益已到账' : '等待邀请结果...'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 'qrcode' && payUrl && mode === 'pay' && (
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              {/* Left Column: High-Impact Value Comparison */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                      会员专属特权对比
                    </h3>
                    <span className="text-xs text-violet-600 font-medium bg-violet-50 px-2.5 py-0.5 rounded-full">
                      电脑端 & 微信小程序权益互通
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
                    {/* Table Header */}
                    <div className="flex items-center bg-slate-50 px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-500">
                      <div className="flex-1">核心求职权益</div>
                      <div className="w-24 text-center text-slate-400">免费用户</div>
                      <div className="w-28 text-center text-violet-700 flex items-center justify-center gap-1 bg-violet-50/60 -my-2.5 py-2.5 font-extrabold">
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> VIP 会员
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-100">
                      {COMPARISON_FEATURES.map((item, idx) => (
                        <div key={idx} className="flex items-center px-4 py-2.5 hover:bg-slate-50/50 transition-colors">
                          <div className="flex-1 pr-2">
                            <div className="text-xs font-bold text-slate-800">{item.feature}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.subtext}</div>
                          </div>
                          <div className="w-24 flex items-center justify-center text-center">
                            {item.nonVip === 'cross' ? (
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                <X className="w-3 h-3 text-slate-400" />
                              </div>
                            ) : item.nonVip === 'check' ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="w-3 h-3 text-emerald-500" />
                              </div>
                            ) : item.nonVip === 'infinity' ? (
                              <InfinityIcon className="w-4 h-4 text-slate-300" />
                            ) : item.nonVip === 'limited' ? (
                              <span className="text-xs text-slate-400 font-medium">每日限次</span>
                            ) : item.nonVip === '1' ? (
                              <span className="text-xs text-slate-400 font-medium">仅 1 次</span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">{item.nonVip}</span>
                            )}
                          </div>
                          <div className="w-28 flex items-center justify-center">
                            {item.vip === 'cross' ? (
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                <X className="w-3 h-3 text-slate-400" />
                              </div>
                            ) : item.vip === 'check' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                                全部解锁
                              </span>
                            ) : item.vip === 'infinity' ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-100 rounded-full">
                                <InfinityIcon className="w-3.5 h-3.5 text-violet-700" />
                                <span className="text-xs font-bold text-violet-700">无限次</span>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-violet-700 bg-violet-100 px-2.5 py-0.5 rounded-full">{item.vip}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Trust Guarantee */}
                <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      单次买断 · 绝不自动续费
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      支付成功秒级解锁
                    </span>
                  </div>
                  {canShowInviteOption && (
                    <button
                      type="button"
                      onClick={loadInviteCode}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline decoration-slate-300"
                    >
                      邀请好友领次数
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Pricing Cards + WeChat QR Code */}
              <div className="w-full md:w-[360px] shrink-0 flex flex-col justify-between">
                {!hidePlanOptions && plans.length > 0 && (
                  <div className="grid w-full grid-cols-3 gap-2.5 pt-1">
                    {plans.map((plan) => {
                      const isSelected = selectedVipType === plan.vipType;
                      const meta = getPlanDisplayMeta(plan);

                      return (
                        <div
                          key={plan.id}
                          onClick={(): void => handleSelectVipType(plan)}
                          style={isSelected ? {
                            background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
                            boxShadow: '0 6px 18px -3px rgba(124, 58, 237, 0.2)',
                          } : undefined}
                          className={isSelected
                            ? 'relative cursor-pointer rounded-xl border-2 border-violet-600 px-2 pt-3.5 pb-2.5 text-center transition-all flex flex-col items-center justify-between'
                            : 'relative cursor-pointer rounded-xl border border-slate-200 bg-white px-2 pt-3.5 pb-2.5 text-center transition-all hover:border-violet-300 hover:bg-violet-50/20 flex flex-col items-center justify-between'}
                        >
                          {meta.badge && (
                            <div
                              style={meta.badgeStyle}
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs whitespace-nowrap z-10"
                            >
                              {meta.badge}
                            </div>
                          )}

                          <div className={isSelected ? 'text-xs font-bold text-violet-950' : 'text-xs font-bold text-slate-700'}>
                            {plan.vipName}
                          </div>

                          <div className="my-1 flex flex-col items-center">
                            <div className={isSelected ? 'flex items-baseline justify-center text-violet-700' : 'flex items-baseline justify-center text-slate-800'}>
                              <span className="text-xs font-bold mr-0.5">¥</span>
                              <span className="text-2xl font-black tracking-tight">{plan.price}</span>
                            </div>
                            <span className="text-xs text-slate-400 line-through">原价 ¥{meta.originalPrice}</span>
                          </div>

                          <div
                            className={isSelected
                              ? 'w-full text-xs text-violet-700 bg-violet-100/80 rounded-md py-0.5 font-semibold whitespace-nowrap'
                              : 'w-full text-xs text-slate-500 bg-slate-100 rounded-md py-0.5 font-medium whitespace-nowrap'}
                          >
                            {meta.bottomTag}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hidePlanOptions && (
                  <div className="mt-3.5 flex flex-col items-center rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50/40 to-violet-50/10 p-4">
                    {/* Live Order Summary Header */}
                    {selectedPlan && (
                      <div className="w-full flex items-center justify-between pb-2.5 mb-3 border-b border-violet-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">已选：</span>
                          <span className="font-bold text-slate-800">{selectedPlan.vipName}</span>
                          {savedAmount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs">
                              已省 ¥{savedAmount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-slate-500">实付</span>
                          <span className="text-lg font-black text-violet-700">¥{selectedPlan.price}</span>
                        </div>
                      </div>
                    )}

                    {/* QR Code Box */}
                    <div className="rounded-xl bg-white p-3 shadow-sm border border-violet-100">
                      <QRCodeSVG
                        value={payUrl}
                        size={152}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    {/* Official WeChat Scan Callout & Non-Button Status */}
                    <div className="mt-3 text-center">
                      <p className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                        <svg className="w-4 h-4 text-[#07C160] fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M8.5 3C4.36 3 1 5.91 1 9.5c0 2.03 1.07 3.84 2.74 5.03l-.69 2.52 2.72-1.39c.84.22 1.74.34 2.73.34.25 0 .5-.01.75-.03-.23-.62-.36-1.28-.36-1.97 0-3.31 3.13-6 7-6 .38 0 .76.03 1.13.08C16.14 5.09 12.61 3 8.5 3zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.78 0 1.52-.13 2.19-.36l2.18 1.11-.55-2.02c1.33-.95 2.18-2.4 2.18-4.03 0-2.76-2.69-5-6-5z" />
                        </svg>
                        微信扫一扫，立即开通权益
                      </p>
                      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span>扫码支付后自动刷新，无需手动点击</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex h-[380px] flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-violet-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800">会员已生效</h3>
                <p className="text-sm text-slate-500 mt-1">可继续导出 PDF、Word、Markdown 和图片</p>
              </div>
              <button
                onClick={() => handleDialogOpenChange(false)}
                className="mt-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                开始使用
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex h-[380px] flex-col items-center justify-center gap-4">
              <div className="text-sm text-slate-600 text-center">{errorMsg}</div>
              <button
                onClick={fetchVipInfo}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重试
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
