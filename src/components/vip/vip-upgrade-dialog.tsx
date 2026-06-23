'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Loader2, CheckCircle, RefreshCw, Sparkles, Check, X, Infinity as InfinityIcon } from 'lucide-react';
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

interface ComparisonFeature {
  feature: string;
  nonVip: string;
  vip: string;
}

/**
 * Membership benefits comparison
 * Source of truth: src/lib/quota/membership-benefits.ts
 */
const COMPARISON_FEATURES: ComparisonFeature[] = [
  { feature: 'PDF 高清导出', nonVip: '1', vip: 'infinity' },
  { feature: 'Markdown 导出', nonVip: 'cross', vip: 'check' },
  { feature: '图片导出', nonVip: 'cross', vip: 'check' },
  { feature: 'AI 优化简历', nonVip: 'limited', vip: 'infinity' },
  { feature: '精品模板', nonVip: 'cross', vip: 'check' },
  { feature: '无水印导出', nonVip: 'cross', vip: 'check' },
  { feature: '一对一简历指导', nonVip: 'cross', vip: 'check' },
];

const CONTEXT_COPY = {
  'pdf-export': {
    title: '你的简历已完成',
    description: '开通后可导出高清 PDF、Markdown 和图片，长期修改下载',
  },
  ai: {
    title: 'AI 优化额度已用完',
    description: '开通后可继续使用 AI 生成、润色和优化，让简历更贴合岗位',
  },
  generic: {
    title: '升级会员',
    description: '解锁高清导出、AI 优化、无水印、精品模板和一对一简历指导',
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
  }, [startInvitePolling, stopPolling]);

  useEffect(() => {
    if (open) {
      setMode('pay');
      resetInviteState();
      fetchVipInfo();
    } else {
      stopPolling();
      resetInviteState();
      setStep('loading');
    }
    return () => {
      stopPolling();
      stopInvitePolling();
    };
  }, [open, fetchVipInfo, resetInviteState, stopInvitePolling, stopPolling]);

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

  const payUrl = userId
    ? `${H5_PAY_BASE_URL}?userId=${userId}&source=web&vipType=${selectedVipType ?? ''}&autoPay=1`
    : '';
  const dialogCopy = CONTEXT_COPY[upgradeContext] || CONTEXT_COPY.generic;
  const handleSelectVipType = (plan: VipPlan): void => {
    setSelectedVipType(plan.vipType);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className="max-w-[880px] w-[90vw] gap-0 overflow-hidden rounded-2xl border border-violet-200 bg-white p-0 shadow-lg"
      >
        <div className="px-6 pt-5 pb-4 text-white" style={{ background: 'linear-gradient(135deg, #D946EF 0%, #8B5CF6 100%)' }}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-lg font-semibold">
              <Crown className="w-5 h-5 text-white" />
              {dialogCopy.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/85">
              {dialogCopy.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="bg-gradient-to-b from-slate-50/50 via-white to-white px-8 py-6 h-[460px]">
          {step === 'loading' && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <span className="text-sm text-slate-500">正在加载...</span>
            </div>
          )}

          {step === 'qrcode' && payUrl && mode === 'invite' && (
            <div className="flex h-full flex-col md:flex-row gap-8">
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
                    <div className="mt-1 text-[11px] text-slate-500">已邀请</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold text-slate-900">3人</div>
                    <div className="mt-1 text-[11px] text-slate-500">+3次下载</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                    <div className="text-lg font-semibold text-slate-900">5人+</div>
                    <div className="mt-1 text-[11px] text-slate-500">会员奖励</div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {inviteSuccess ? '导出次数或会员权益已到账，可以回到编辑器继续导出。' : nextRewardText}
                </div>
                <button
                  type="button"
                  onClick={(): void => {
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
            <div className="flex flex-col md:flex-row gap-8 h-full">
              {/* Left: Comparison */}
              <div className="flex-1 flex flex-col">
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  会员权益对比
                </h3>
                <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex items-center bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                    <div className="flex-1 text-xs font-bold text-slate-500">特权项</div>
                    <div className="w-20 text-center text-xs font-bold text-slate-400">非会员</div>
                    <div className="w-36 text-center text-xs font-semibold text-violet-600 flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> VIP 会员
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 flex flex-col divide-y divide-slate-100">
                    {COMPARISON_FEATURES.map((item, idx) => (
                      <div key={idx} className="flex flex-1 items-center px-4 py-2 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 text-sm text-slate-600">{item.feature}</div>
                        <div className="w-20 flex items-center justify-center">
                          {item.nonVip === 'cross' ? (
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <X className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          ) : item.nonVip === 'check' ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          ) : item.nonVip === 'infinity' ? (
                            <InfinityIcon className="w-5 h-5 text-slate-300" />
                          ) : item.nonVip === 'limited' ? (
                            <span className="text-xs text-slate-500 font-medium">每日限次</span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">{item.nonVip}次</span>
                          )}
                        </div>
                        <div className="w-36 flex items-center justify-center">
                          {item.vip === 'cross' ? (
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <X className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          ) : item.vip === 'check' ? (
                            <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-violet-600" />
                            </div>
                          ) : item.vip === 'infinity' ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 rounded-full">
                              <InfinityIcon className="w-3.5 h-3.5 text-violet-600" />
                              <span className="text-xs font-medium text-violet-600">无限次</span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">{item.vip}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Plans & QR */}
              <div className="w-full md:w-[340px] shrink-0 flex flex-col gap-5">
                {!hidePlanOptions && plans.length > 0 && (
                  <div className="grid w-full grid-cols-3 gap-2">
                    {plans.map((plan, index) => {
                      const isRecommended = plan.vipType === 3 || index === 0;
                      const dailyPrice = plan.duration >= 30000
                        ? '<0.01'
                        : (plan.price / plan.duration).toFixed(2);

                      return (
                        <div
                          key={plan.id}
                          onClick={(): void => handleSelectVipType(plan)}
                          className={selectedVipType === plan.vipType
                            ? 'relative overflow-hidden cursor-pointer rounded-xl border border-violet-500 bg-violet-50/50 px-1 py-3 text-center shadow-sm shadow-violet-100 transition-all flex flex-col justify-center'
                            : 'relative overflow-hidden cursor-pointer rounded-xl border border-slate-200 bg-white px-1 py-3 text-center transition-all hover:border-violet-200 hover:bg-violet-50/20 flex flex-col justify-center'}
                        >
                          {isRecommended && (
                            <div className="absolute top-0 left-0 bg-violet-600 text-white text-[9px] font-medium px-2 py-0.5 rounded-br-lg z-10">推荐</div>
                          )}
                          {plan.duration >= 30000 && (
                            <div className="absolute top-0 right-0 bg-fuchsia-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-bl-lg z-10">终身</div>
                          )}
                          {selectedVipType === plan.vipType && (
                             <div className="absolute top-0 right-0 bg-violet-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-bl-lg z-10">已选</div>
                          )}
                          <div className={selectedVipType === plan.vipType ? 'text-xs font-medium text-violet-700 mt-1' : 'text-xs font-medium text-slate-500 mt-1'}>{plan.vipName}</div>
                          <div className={selectedVipType === plan.vipType ? 'mt-1 text-2xl font-bold text-violet-700 tracking-tight' : 'mt-1 text-2xl font-bold text-slate-700 tracking-tight'}>
                            <span className="text-sm font-medium mr-0.5">¥</span>{plan.price}
                          </div>
                          <div className={selectedVipType === plan.vipType ? 'mt-0.5 flex flex-col items-center gap-0.5 text-[9px] font-medium text-violet-600' : 'mt-0.5 flex flex-col items-center gap-0.5 text-[9px] text-slate-400'}>
                            <span className={selectedVipType === plan.vipType ? 'rounded-full bg-violet-100 px-1.5 py-0.5 mt-0.5 scale-95' : 'rounded-full bg-slate-100 px-1.5 py-0.5 mt-0.5 scale-95'}>
                              {plan.duration >= 30000 ? '一次开通' : `约 ${dailyPrice}元/天`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hidePlanOptions && (
                  <div className="flex flex-col items-center gap-4 rounded-xl border border-violet-100 bg-violet-50/30 p-4 shadow-sm">
                    <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-violet-100">
                      <QRCodeSVG
                        value={payUrl}
                        size={160}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-slate-700 flex items-center justify-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        微信扫码，立即开通
                      </p>
                      <p className="text-xs text-slate-500">已锁定优惠，支付后自动生效</p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-600 border border-violet-100">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                        </span>
                        等待支付结果...
                      </div>
                      {canShowInviteOption && (
                        <button
                          type="button"
                          onClick={loadInviteCode}
                          className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                        >
                          不想付费？邀请好友得下载次数
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-violet-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800">会员已生效</h3>
                <p className="text-sm text-slate-500 mt-1">可继续导出 PDF、Markdown 和图片</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="mt-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                开始使用
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
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
