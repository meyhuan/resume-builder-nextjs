'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, ArrowLeft, LogOut, Copy, Check, X, Sparkles, FileText, Zap, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useVipCheck } from '@/hooks/use-vip-check';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import JobSprintOffer from '@/components/vip/job-sprint-offer';

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
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDaysRemaining(expireTime: string | null): number | null {
  if (!expireTime) return null;
  const diff = new Date(expireTime).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const COMPARE_ROWS: Array<{ label: string; free: string | false; vip: string | true }> = [
  { label: 'AI 生成简历', free: '每日 3 次', vip: '无限次' },
  { label: 'AI 续写 & 润色', free: '每日 5 次', vip: '无限次' },
  { label: 'PDF 导出', free: '免费限 1 次', vip: '无水印 · 高清 · 无限' },
  { label: 'Markdown 导出', free: false, vip: true },
  { label: '图片导出', free: false, vip: true },
  { label: '精品模板', free: '部分可用', vip: '全部解锁' },
  { label: 'AI 导入解析', free: '每日 3 次', vip: '无限次' },
  { label: '简历答疑支持', free: false, vip: '会员专属' },
];

export default function MembershipPage(): React.ReactElement {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { isVip, quota } = useVipCheck();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hidePlanOptions, setHidePlanOptions] = useState(false);
  const [vipInfo, setVipInfo] = useState<VipInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [javaUserId, setJavaUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { fetchVipInfo(); }, []);

  function handleCopyId(): void {
    if (!javaUserId) return;
    navigator.clipboard.writeText(String(javaUserId)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }

  function openUpgrade(): void {
    setHidePlanOptions(false);
    setShowUpgrade(true);
  }

  async function deleteAccount(): Promise<void> {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch('/next-api/auth/delete-account', { method: 'DELETE' });
      if (!res.ok) throw new Error('请求失败');
      logout();
      router.push('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '注销失败，请稍后重试');
      setDeleteLoading(false);
    }
  }

  async function fetchVipInfo(): Promise<void> {
    try {
      const res = await fetch('/next-api/vip/info');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setVipInfo(json.data);
      if (json.data?.userId) setJavaUserId(json.data.userId);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  const daysRemaining = getDaysRemaining(vipInfo?.vipExpireTime ?? null);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  const quotaItems = [
    { label: 'AI 生成简历', remaining: quota.aiGenerateResume?.remaining, limit: 3 },
    { label: 'AI 导入解析', remaining: quota.aiImportSection?.remaining, limit: 3 },
    { label: 'AI 续写内容', remaining: quota.aiGenerateSection?.remaining, limit: 5 },
    { label: 'AI 润色文本', remaining: quota.aiPolishSection?.remaining, limit: 5 },
    { label: 'PDF 导出', remaining: quota.pdfExport?.remaining, limit: 1 },
  ];

  const anyDepleted = quotaItems.some((q) => {
    const r = typeof q.remaining === 'number' ? q.remaining : q.limit;
    return r === 0;
  });

  return (
    <div className="min-h-screen bg-[#F7F6FB]">
      <main className="min-h-screen px-6 py-8">
        <div className="w-full max-w-[860px] mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-[3px] border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* ══ VIP IDENTITY CARD ══ */}
            {isVip ? (
              <div className="relative overflow-hidden rounded-3xl px-8 py-8"
                style={{
                  background: 'linear-gradient(135deg, #1e0a4a 0%, #3b1278 40%, #5b1fa8 70%, #7c2fd4 100%)',
                  boxShadow: '0 8px 40px -8px rgba(109,40,217,0.45)',
                }}>
                {/* Radial color blooms */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: [
                    'radial-gradient(ellipse at 85% 15%, rgba(217,70,239,0.28) 0%, transparent 45%)',
                    'radial-gradient(ellipse at 15% 80%, rgba(124,47,212,0.35) 0%, transparent 50%)',
                    'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.10) 0%, transparent 70%)',
                  ].join(', '),
                }} />
                {/* Circle glows */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.22) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-20 -left-12 w-64 h-64 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)' }} />
                {/* Gold top strip */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, #f59e0b 30%, #fbbf24 50%, #f59e0b 70%, transparent 100%)' }} />

                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 2px 12px rgba(245,158,11,0.4)' }}>
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-amber-300"
                        style={{ textShadow: '0 1px 8px rgba(245,158,11,0.5)' }}>
                        {VIP_TYPE_NAMES[vipInfo?.vipType ?? 1]}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-1.5">
                      {isExpired ? '会员已过期' : isExpiringSoon ? `还剩 ${daysRemaining} 天` : '权益生效中'}
                    </h2>
                    <p className="text-sm text-violet-300/70">
                      {vipInfo?.vipExpireTime ? `到期时间：${formatExpireTime(vipInfo.vipExpireTime)}` : '永久有效，无到期时间'}
                    </p>
                    {javaUserId && (
                      <div className="mt-5 flex items-center gap-3">
                        <span className="text-xs text-violet-400/60 tabular-nums">用户 ID · {javaUserId}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            copied ? 'text-emerald-400' : 'text-violet-400/60 hover:text-violet-300'
                          }`}
                        >
                          {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Show upgrade/renew only for non-lifetime VIP or expired */}
                  {(vipInfo?.vipType !== 3 || isExpired) && (
                    <button
                      onClick={openUpgrade}
                      className="shrink-0 mt-1 px-5 py-2 rounded-2xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                    >
                      {isExpiringSoon || isExpired ? '立即续费' : '升级套餐'}
                    </button>
                  )}
                </div>

                {/* Active benefits pills */}
                {!isExpired && (
                  <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                    {[
                      { icon: Zap, label: 'AI 功能无限次' },
                      { icon: FileText, label: 'PDF 无水印导出' },
                      { icon: FileText, label: 'Markdown / 图片导出' },
                      { icon: Sparkles, label: '全站模板解锁' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10">
                        <Icon className="w-3 h-3 text-amber-400" />
                        <span className="text-xs text-violet-200/80">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ══ FREE USER: LOSS-AVERSION BANNER ══ */
              <div className="relative overflow-hidden rounded-3xl px-8 py-8"
                style={{
                  background: 'linear-gradient(135deg, #f0f2f5 0%, #e4e7ed 40%, #d8dce5 70%, #c9cdd5 100%)',
                  boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.06)',
                }}>
                {/* Subtle circle glows */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(100,100,140,0.12) 0%, transparent 65%)' }} />

                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-slate-200/70 border border-slate-300/50">
                        <Crown className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-base font-bold text-slate-500">免费用户</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-1.5">当前导出有水印</h2>
                    <p className="text-sm text-slate-500">模板仅部分可用 · AI 功能每日限次 · 无法高清导出</p>
                    {javaUserId && (
                      <div className="mt-5 flex items-center gap-3">
                        <span className="text-xs text-slate-400 tabular-nums">用户 ID · {javaUserId}</span>
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            copied ? 'text-emerald-600' : 'text-slate-400 hover:text-violet-600'
                          }`}
                        >
                          {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openUpgrade}
                    className="shrink-0 mt-1 px-6 py-2.5 rounded-2xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-300/50"
                  >
                    立即开通
                  </button>
                </div>
              </div>
            )}

            {/* ══ FREE: QUOTA WARNING ══ */}
            {!isVip && anyDepleted && (
              <div className="rounded-2xl px-6 py-4 bg-rose-50 border border-rose-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <X className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-700">额度已用尽</p>
                  <p className="text-xs text-rose-400 mt-0.5">开通会员即可无限使用，不受次数限制</p>
                </div>
                <button onClick={openUpgrade} className="shrink-0 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors">
                  立即开通 →
                </button>
              </div>
            )}

            {/* ══ FREE: QUOTA BARS ══ */}
            {!isVip && (
              <div className="bg-white rounded-3xl px-7 py-6 border border-violet-100/60">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">剩余额度</p>
                <div className="space-y-3.5">
                  {quotaItems.map((item) => {
                    const remaining = typeof item.remaining === 'number' ? item.remaining : item.limit;
                    const pct = Math.max(0, Math.min(100, (remaining / item.limit) * 100));
                    const depleted = remaining === 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-600">{item.label}</span>
                          <span className={`text-xs font-semibold tabular-nums ${depleted ? 'text-rose-500' : 'text-violet-600'}`}>
                            {depleted ? '已用尽' : `${remaining} / ${item.limit}`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${depleted ? 'bg-rose-400' : 'bg-violet-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ COMPARE TABLE ══ */}
            <div className="bg-white rounded-3xl border border-violet-100/60 overflow-hidden">
              <div className="grid grid-cols-3 text-xs font-semibold">
                <div className="px-6 py-4 text-slate-400 uppercase tracking-widest border-b border-slate-100">功能</div>
                <div className="px-6 py-4 text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">免费</div>
                <div className="px-6 py-4 text-amber-600 uppercase tracking-widest border-b border-violet-100 text-center bg-violet-50/60">
                  <span className="flex items-center justify-center gap-1.5">
                    <Crown className="w-3 h-3" />会员
                  </span>
                </div>
              </div>
              {COMPARE_ROWS.map((row, idx) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 text-sm ${idx < COMPARE_ROWS.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="px-6 py-3.5 text-slate-700 font-medium">{row.label}</div>
                  <div className="px-6 py-3.5 text-center">
                    {row.free === false
                      ? <X className="w-4 h-4 text-slate-300 mx-auto" />
                      : <span className="text-slate-400 text-xs">{row.free}</span>}
                  </div>
                  <div className="px-6 py-3.5 text-center bg-violet-50/40">
                    {row.vip === true
                      ? <Check className="w-4 h-4 text-violet-500 mx-auto" />
                      : <span className="text-violet-700 text-xs font-semibold">{row.vip}</span>}
                  </div>
                </div>
              ))}
              {!isVip && (
                <div className="px-6 py-5 bg-violet-50/40 border-t border-violet-100/60">
                  <button
                    onClick={openUpgrade}
                    className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 active:scale-[0.99]"
                  >
                    立即开通会员，解锁全部权益
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2.5">超过 10,000 名求职者已选择会员版简历</p>
                </div>
              )}
            </div>

            <JobSprintOffer entry="membership" />

            {/* ══ FOOTER ══ */}
            <div className="flex items-center gap-5 px-1 py-3">
              <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">隐私政策</Link>
              <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">服务条款</Link>
              <div className="ml-auto flex items-center gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  注销账号
                </button>
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  退出登录
                </button>
              </div>
            </div>

            {/* ══ DELETE ACCOUNT CONFIRM DIALOG ══ */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-7 h-7 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">确认注销账号？</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      注销后，您的账号及所有简历数据将被<span className="text-rose-500 font-semibold">永久删除</span>，无法恢复。
                    </p>
                    {deleteError && (
                      <p className="mt-3 text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-xl w-full">{deleteError}</p>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      onClick={deleteAccount}
                      disabled={deleteLoading}
                      className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-all disabled:opacity-50"
                    >
                      {deleteLoading ? '注销中...' : '确认注销账号'}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                      disabled={deleteLoading}
                      className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
        </div>
      </main>

      <VipUpgradeDialog
        open={showUpgrade}
        onOpenChange={(open) => {
          setShowUpgrade(open);
          if (!open) setHidePlanOptions(false);
        }}
        hidePlanOptions={hidePlanOptions}
      />
    </div>
  );
}
