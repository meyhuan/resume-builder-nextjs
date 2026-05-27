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
  { feature: 'AI 生成简历', nonVip: '3', vip: 'infinity' },
  { feature: 'AI 导入优化', nonVip: '3', vip: 'infinity' },
  { feature: 'AI 续写内容', nonVip: '5', vip: 'infinity' },
  { feature: 'AI 润色文本', nonVip: '5', vip: 'infinity' },
  { feature: 'PDF 高清导出', nonVip: '1', vip: 'infinity' },
  { feature: '精品模板', nonVip: 'cross', vip: 'check' },
  { feature: '无水印导出', nonVip: 'cross', vip: 'check' },
];

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

type DialogStep = 'loading' | 'qrcode' | 'success' | 'error';

interface VipUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidePlanOptions?: boolean;
  overlayClassName?: string;
}

export default function VipUpgradeDialog({ open, onOpenChange, hidePlanOptions = false, overlayClassName = 'bg-black/35' }: VipUpgradeDialogProps): React.ReactElement {
  const { updateVipStatus } = useAuthStore();
  const [step, setStep] = useState<DialogStep>('loading');
  const [userId, setUserId] = useState<number | null>(null);
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [selectedVipType, setSelectedVipType] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasVipRef = useRef<boolean>(false);

  const stopPolling = useCallback((): void => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

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
      setStep('qrcode');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  }, [updateVipStatus]);

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

  useEffect(() => {
    if (open) {
      fetchVipInfo();
    } else {
      stopPolling();
      setStep('loading');
    }
    return () => stopPolling();
  }, [open, fetchVipInfo, stopPolling]);

  useEffect(() => {
    if (step === 'qrcode') {
      startPolling();
    }
    return () => {
      if (step !== 'qrcode') {
        stopPolling();
      }
    };
  }, [step, startPolling, stopPolling]);

  const payUrl = userId
    ? `${H5_PAY_BASE_URL}?userId=${userId}&source=web&vipType=${selectedVipType ?? ''}&autoPay=1`
    : '';

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
              升级会员
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/85">
              解锁全部模板、AI 功能与无限导出
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

          {step === 'qrcode' && payUrl && (
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
                      const isRecommended = index === 0;
                      const dailyPrice = plan.duration >= 30000
                        ? '<0.01'
                        : (plan.price / plan.duration).toFixed(2);

                      return (
                        <div
                          key={plan.id}
                          onClick={(): void => setSelectedVipType(plan.vipType)}
                          className={selectedVipType === plan.vipType
                            ? 'relative overflow-hidden cursor-pointer rounded-xl border border-violet-500 bg-violet-50/50 px-1 py-3 text-center shadow-sm shadow-violet-100 transition-all flex flex-col justify-center'
                            : 'relative overflow-hidden cursor-pointer rounded-xl border border-slate-200 bg-white px-1 py-3 text-center transition-all hover:border-violet-200 hover:bg-violet-50/20 flex flex-col justify-center'}
                        >
                          {isRecommended && (
                            <div className="absolute top-0 left-0 bg-violet-600 text-white text-[9px] font-medium px-2 py-0.5 rounded-br-lg z-10">限时特惠</div>
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
                            <span className={selectedVipType === plan.vipType ? "rounded-full bg-violet-100 px-1.5 py-0.5 mt-0.5 scale-95" : "rounded-full bg-slate-100 px-1.5 py-0.5 mt-0.5 scale-95"}>
                              约 {dailyPrice}元/天
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
                <p className="text-sm text-slate-500 mt-1">尽享全部高级功能</p>
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
