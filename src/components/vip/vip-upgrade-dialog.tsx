'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Crown, Loader2, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
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

const COMPARISON_FEATURES: ComparisonFeature[] = [
  { feature: '简历模板', nonVip: '仅基础款', vip: '全站精品免费用' },
  { feature: 'AI 辅写能力', nonVip: '消耗次数', vip: '不限次持续用' },
  { feature: 'PDF 高清导出', nonVip: '需消耗次数', vip: '无限次免费导出' },
  { feature: '去除底部水印', nonVip: '不可用', vip: '一键去除水印' },
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
}

export default function VipUpgradeDialog({ open, onOpenChange }: VipUpgradeDialogProps): React.ReactElement {
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
      if (data.isVip) {
        updateVipStatus({
          vipStatus: data.vipStatus,
          vipType: data.vipType,
          vipExpireTime: data.vipExpireTime,
          isVip: true,
        });
        setStep('success');
        return;
      }
      wasVipRef.current = data.isVip;
      setUserId(data.userId);
      const sortedPlans = (data.plans || []).sort((a: VipPlan, b: VipPlan) => (b.sort || 0) - (a.sort || 0));
      setPlans(sortedPlans);
      setSelectedVipType(sortedPlans[0]?.vipType ?? null);
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
      <DialogContent className="max-w-[880px] w-[90vw] gap-0 overflow-hidden rounded-3xl border border-rose-100 bg-white p-0 shadow-2xl shadow-rose-100/60">
        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 px-6 pt-6 pb-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <Crown className="w-5 h-5" />
              升级会员
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/85">
              解锁全部模板、AI 功能与无限导出
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="bg-gradient-to-b from-rose-50/70 via-white to-white px-8 py-8">
          <div className="min-h-[400px]">
          {step === 'loading' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-sm text-slate-500">正在加载...</span>
            </div>
          )}

          {step === 'qrcode' && payUrl && (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left: Comparison */}
              <div className="flex-1 flex flex-col">
                <h3 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-rose-500" />
                  会员权益对比
                </h3>
                <div className="flex-1 rounded-2xl border border-rose-100 bg-white shadow-sm overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex items-center bg-rose-50/60 px-4 py-3 border-b border-rose-100/60">
                    <div className="flex-1 text-xs font-bold text-slate-500">特权项</div>
                    <div className="w-20 text-center text-xs font-bold text-slate-400">非会员</div>
                    <div className="w-36 text-center text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5" /> VIP 会员
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 flex flex-col divide-y divide-rose-50">
                    {COMPARISON_FEATURES.map((item, idx) => (
                      <div key={idx} className="flex flex-1 items-center px-4 py-2 hover:bg-rose-50/30 transition-colors">
                        <div className="flex-1 text-sm font-bold text-slate-700">{item.feature}</div>
                        <div className="w-20 text-center text-xs text-slate-500">{item.nonVip}</div>
                        <div className="w-36 text-center text-xs font-bold text-rose-600 bg-rose-50/50 rounded-lg py-2 ring-1 ring-rose-100/50 shadow-sm shadow-rose-100/20">{item.vip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Plans & QR */}
              <div className="w-full md:w-[340px] shrink-0 flex flex-col gap-5">
                {plans.length > 0 && (
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
                            ? 'relative overflow-hidden cursor-pointer rounded-2xl border-2 border-rose-500 bg-rose-50/50 px-1 py-3 text-center shadow-md shadow-rose-100 transition-all flex flex-col justify-center'
                            : 'relative overflow-hidden cursor-pointer rounded-2xl border-2 border-slate-100 bg-white px-1 py-3 text-center transition-all hover:border-rose-200 hover:bg-rose-50/30 flex flex-col justify-center'}
                        >
                          {isRecommended && (
                            <div className="absolute top-0 left-0 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-10 shadow-sm shadow-orange-500/30">限时优惠</div>
                          )}
                          {selectedVipType === plan.vipType && (
                             <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg z-10">已选</div>
                          )}
                          <div className={selectedVipType === plan.vipType ? 'text-xs font-bold text-rose-600 mt-1' : 'text-xs font-medium text-slate-500 mt-1'}>{plan.vipName}</div>
                          <div className={selectedVipType === plan.vipType ? 'mt-1 text-2xl font-black text-rose-600 tracking-tight' : 'mt-1 text-2xl font-bold text-slate-700 tracking-tight'}>
                            <span className="text-sm font-semibold mr-0.5">¥</span>{plan.price}
                          </div>
                          <div className={selectedVipType === plan.vipType ? 'mt-0.5 flex flex-col items-center gap-0.5 text-[9px] font-medium text-rose-500' : 'mt-0.5 flex flex-col items-center gap-0.5 text-[9px] text-slate-400'}>
                            <span className={selectedVipType === plan.vipType ? "rounded-full bg-rose-100 px-1.5 py-0.5 mt-0.5 scale-95" : "rounded-full bg-slate-100 px-1.5 py-0.5 mt-0.5 scale-95"}>
                              约 {dailyPrice}元/天
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col items-center gap-4 rounded-3xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/30 p-5 shadow-lg shadow-rose-100/40">
                  <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <QRCodeSVG
                      value={payUrl}
                      size={160}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-bold text-slate-700 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-rose-500" />
                      微信扫码，立即开通
                    </p>
                    <p className="text-[11px] text-slate-500">已锁定优惠，支付后自动生效</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      等待支付结果...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">会员已生效!</h3>
                <p className="text-sm text-slate-500 mt-1">尽享全部高级功能</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="mt-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-2 text-sm font-medium text-white transition-shadow hover:shadow-lg"
              >
                开始使用
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-8">
              <div className="text-sm text-rose-600 text-center">{errorMsg}</div>
              <button
                onClick={fetchVipInfo}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重试
              </button>
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
