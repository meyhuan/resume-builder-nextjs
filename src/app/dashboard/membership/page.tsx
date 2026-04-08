'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, Clock, Calendar, ArrowLeft, Sparkles, ChevronRight, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useVipCheck } from '@/hooks/use-vip-check';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';

interface VipInfo {
  isVip: boolean;
  vipType: number;
  vipStatus: number;
  vipExpireTime: string | null;
}

const VIP_TYPE_NAMES: Record<number, string> = {
  1: '月卡会员',
  2: '年卡会员',
  3: '终身会员',
};

function formatExpireTime(expireTime: string | null): string {
  if (!expireTime) return '永久有效';
  const date = new Date(expireTime);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDaysRemaining(expireTime: string | null): number | null {
  if (!expireTime) return null;
  const now = new Date();
  const expire = new Date(expireTime);
  const diff = expire.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MembershipPage(): React.ReactElement {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { isVip, quota, refreshVip } = useVipCheck();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hidePlanOptions, setHidePlanOptions] = useState(false);
  const [vipInfo, setVipInfo] = useState<VipInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshVip();
    fetchVipInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchVipInfo(): Promise<void> {
    try {
      const res = await fetch('/next-api/vip/info');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setVipInfo(json.data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  const daysRemaining = vipInfo?.vipExpireTime
    ? getDaysRemaining(vipInfo.vipExpireTime)
    : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar />

      <main className="ml-[200px] min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回仪表板</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900">会员中心</h1>
          <p className="text-slate-500 mt-1">管理您的会员状态和权益</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {/* Membership Card */}
            <div
              className={`
                relative overflow-hidden rounded-2xl p-8
                ${isVip
                  ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'}
              `}
            >
              {isVip && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              )}

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`
                      w-16 h-16 rounded-2xl flex items-center justify-center
                      ${isVip ? 'bg-white/20' : 'bg-slate-100'}
                    `}
                  >
                    <Crown className={`w-8 h-8 ${isVip ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {isVip ? VIP_TYPE_NAMES[vipInfo?.vipType ?? 1] : '免费用户'}
                    </h2>
                    <p className={`text-sm ${isVip ? 'text-white/80' : 'text-slate-500'}`}>
                      {isVip
                        ? isExpired
                          ? '会员已过期'
                          : isExpiringSoon
                            ? `即将过期，还剩 ${daysRemaining} 天`
                            : '会员权益生效中'
                        : '升级会员解锁全部功能'}
                    </p>
                  </div>
                </div>

                {isVip && !isExpired && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>到期时间：{formatExpireTime(vipInfo?.vipExpireTime ?? null)}</span>
                    </div>
                    {daysRemaining !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>剩余天数：{daysRemaining} 天</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setHidePlanOptions(false);
                    setShowUpgrade(true);
                  }}
                  className={`
                    mt-6 px-6 py-2.5 rounded-xl font-medium transition-all
                    ${isVip
                      ? 'bg-white text-orange-600 hover:bg-white/90'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-lg'}
                  `}
                >
                  {isVip ? (isExpiringSoon || isExpired ? '立即续费' : '升级套餐') : '立即升级'}
                </button>
              </div>
            </div>

            {/* Quota Status */}
            {!isVip && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">今日使用额度</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">AI 生成</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {quota.ai.isVip ? '∞' : `${quota.ai.remaining}次`}
                    </div>
                    {!quota.ai.isVip && (
                      <div className="text-xs text-slate-400 mt-1">每日限制 3 次</div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-500 mb-1">PDF 导出</div>
                    <div className="text-2xl font-bold text-slate-800">
                      {quota.pdf.isVip ? '∞' : `${quota.pdf.remaining}次`}
                    </div>
                    {!quota.pdf.isVip && (
                      <div className="text-xs text-slate-400 mt-1">每日限制 1 次</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIP Benefits */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">会员权益</h3>
              <div className="space-y-3">
                {[
                  { icon: Sparkles, text: '无限次 AI 简历生成' },
                  { icon: Crown, text: '全站精品模板免费用' },
                  { icon: Calendar, text: '无限次 PDF 高清导出' },
                  { icon: Clock, text: '去除简历底部水印' },
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-slate-700">{benefit.text}</span>
                    {isVip && <span className="ml-auto text-emerald-500 text-sm">✓ 已解锁</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">更多操作</h3>
              <div className="space-y-2">
                <Link
                  href="/privacy"
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="text-slate-600">隐私政策</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
                <Link
                  href="/terms"
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="text-slate-600">服务条款</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="flex items-center justify-between w-full p-3 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <span className="text-rose-600 flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <VipUpgradeDialog
        open={showUpgrade}
        onOpenChange={(open) => {
          setShowUpgrade(open);
          if (!open) {
            setHidePlanOptions(false);
          }
        }}
        hidePlanOptions={hidePlanOptions}
      />
    </div>
  );
}
