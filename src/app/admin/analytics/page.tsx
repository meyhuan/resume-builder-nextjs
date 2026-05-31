'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Download,
  Gauge,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearStoredAdminPassword, getStoredAdminPassword, setStoredAdminPassword } from '@/lib/admin-auth';

interface FunnelStep {
  eventName: string;
  count: number;
  users: number;
  conversionFromFirst: number;
}

interface FunnelData {
  start: string;
  end: string;
  steps: FunnelStep[];
}

interface EventCount {
  eventName: string;
  count: number;
}

interface PlatformCount {
  platform: string;
  count: number;
  users: number;
}

interface OverviewData {
  start: string;
  end: string;
  todayDau: number;
  eventCounts: EventCount[];
  platforms: PlatformCount[];
}

interface ErrorGroup {
  platform: string;
  page: string;
  errorType: string;
  errorMessage: string;
  statusCode: string;
  count: number;
  lastSeenAt: string;
}

interface ErrorData {
  start: string;
  end: string;
  errors: ErrorGroup[];
}

type AnalyticsState = {
  overview: OverviewData | null;
  pay: FunnelData | null;
  export: FunnelData | null;
  create: FunnelData | null;
  errors: ErrorData | null;
};

type PlatformFilter = 'all' | 'web' | 'mini_program' | 'h5_pay' | 'backend';

const EVENT_LABELS: Record<string, string> = {
  page_view: '页面访问',
  login_success: '登录成功',
  resume_create_start: '开始创建简历',
  resume_create_success: '创建简历成功',
  resume_import_start: '开始导入简历',
  resume_import_success: '导入简历成功',
  resume_import_failed: '导入简历失败',
  ai_generate_start: '开始 AI 生成',
  ai_generate_success: 'AI 生成成功',
  ai_generate_failed: 'AI 生成失败',
  template_select: '选择模板',
  resume_preview: '预览简历',
  export_click: '点击导出',
  export_success: '导出成功',
  export_failed: '导出失败',
  pay_page_view: '访问支付页',
  pay_plan_click: '点击套餐',
  pay_order_create: '创建订单',
  pay_invoke_wechat: '拉起微信支付',
  pay_success: '支付成功',
  pay_cancel: '取消支付',
  pay_failed: '支付失败',
  app_error: '程序错误',
};

const PLATFORM_LABELS: Record<string, string> = {
  all: '全部端',
  web: 'Web',
  mini_program: '小程序',
  h5_pay: 'H5 支付页',
  backend: '后端',
};

const PLATFORM_OPTIONS: Array<{ value: PlatformFilter; label: string }> = [
  { value: 'all', label: '全部端' },
  { value: 'web', label: 'Web / PC' },
  { value: 'mini_program', label: '小程序' },
  { value: 'h5_pay', label: 'H5 支付页' },
  { value: 'backend', label: '后端' },
];

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString('zh-CN') : '-';
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 10000) / 100}%`;
}

function labelEvent(eventName: string): string {
  return EVENT_LABELS[eventName] || eventName;
}

async function fetchAnalytics(type: keyof AnalyticsState, days: number, platform: PlatformFilter, adminPassword: string): Promise<unknown> {
  const response = await fetch('/next-api/admin/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, days, platform, adminPassword }),
    cache: 'no-store',
  });
  const json = await response.json();
  if (!response.ok || json?.status !== 100) {
    throw new Error(json?.error || json?.result || '加载失败');
  }
  return json.data;
}

export default function AnalyticsAdminPage(): React.ReactElement {
  const [adminPassword, setAdminPassword] = useState('');
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [days, setDays] = useState(7);
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsState>({
    overview: null,
    pay: null,
    export: null,
    create: null,
    errors: null,
  });

  const totalEvents = useMemo(() => {
    return data.overview?.eventCounts.reduce((sum, item) => sum + item.count, 0) ?? 0;
  }, [data.overview]);

  useEffect(() => {
    const storedPassword = getStoredAdminPassword();
    if (storedPassword) {
      setAdminPassword(storedPassword);
      setHasStoredPassword(true);
      void loadAll(storedPassword);
    }
  }, []);

  async function loadAll(passwordOverride?: string): Promise<void> {
    const passwordToUse = passwordOverride || adminPassword;
    if (!passwordToUse.trim()) {
      setError('请输入管理员密码');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [overview, pay, exportFunnel, create, errors] = await Promise.all([
        fetchAnalytics('overview', days, platform, passwordToUse) as Promise<OverviewData>,
        fetchAnalytics('pay', days, platform, passwordToUse) as Promise<FunnelData>,
        fetchAnalytics('export', days, platform, passwordToUse) as Promise<FunnelData>,
        fetchAnalytics('create', days, platform, passwordToUse) as Promise<FunnelData>,
        fetchAnalytics('errors', days, platform, passwordToUse) as Promise<ErrorData>,
      ]);
      setStoredAdminPassword(passwordToUse);
      setHasStoredPassword(true);
      setData({ overview, pay, export: exportFunnel, create, errors });
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              埋点统计
            </div>
            <p className="mt-1 text-sm text-slate-500">轻量封装数据库事件数据，便于查看核心漏斗。</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!hasStoredPassword && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void loadAll()}
                  placeholder="管理员密码"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-52"
                />
              </div>
            )}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value={1}>最近 1 天</option>
                <option value={7}>最近 7 天</option>
                <option value={30}>最近 30 天</option>
                <option value={90}>最近 90 天</option>
              </select>
            </div>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformFilter)}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {PLATFORM_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              {loading ? '加载中' : '刷新数据'}
            </button>
            {hasStoredPassword && (
              <button
                type="button"
                onClick={() => {
                  clearStoredAdminPassword();
                  setHasStoredPassword(false);
                  setAdminPassword('');
                  setLoaded(false);
                  setData({ overview: null, pay: null, export: null, create: null, errors: null });
                }}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                退出
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </section>

      {!loaded ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {hasStoredPassword ? '正在加载数据。' : '输入管理员密码后刷新数据。'}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard icon={<Activity />} label="今日 DAU" value={formatNumber(data.overview?.todayDau)} />
            <MetricCard icon={<Gauge />} label={`${days} 天事件数 · ${PLATFORM_LABELS[platform]}`} value={formatNumber(totalEvents)} />
            <MetricCard icon={<TrendingUp />} label="支付成功数" value={formatNumber(getStep(data.pay, 'pay_success')?.count)} />
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <FunnelCard title="支付漏斗" icon={<Sparkles />} data={data.pay} />
            <FunnelCard title="导出漏斗" icon={<Download />} data={data.export} />
            <FunnelCard title="创建漏斗" icon={<BarChart3 />} data={data.create} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">事件排行</h2>
              <div className="mt-4 space-y-2">
                {(data.overview?.eventCounts ?? []).slice(0, 12).map((item) => (
                  <div key={item.eventName} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{labelEvent(item.eventName)}</div>
                      <div className="text-xs text-slate-400">{item.eventName}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{formatNumber(item.count)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">平台分布</h2>
              <div className="mt-4 space-y-3">
                {(data.overview?.platforms ?? []).map((item) => (
                  <div key={item.platform} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{PLATFORM_LABELS[item.platform] || item.platform}</span>
                      <span className="text-sm font-semibold text-slate-900">{formatNumber(item.count)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">用户数 {formatNumber(item.users)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">错误排行</h2>
              <span className="text-xs text-slate-400">按平台、页面、错误信息聚合</span>
            </div>
            <div className="mt-4 space-y-3">
              {(data.errors?.errors ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  当前时间范围内没有错误上报。
                </div>
              ) : (
                (data.errors?.errors ?? []).map((item, index) => (
                  <div key={`${item.platform}-${item.page}-${item.errorType}-${item.errorMessage}-${index}`} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">{item.errorType || 'Error'}</span>
                          <span className="text-xs text-slate-500">{PLATFORM_LABELS[item.platform] || item.platform}</span>
                          {item.statusCode && <span className="text-xs text-slate-400">HTTP {item.statusCode}</span>}
                        </div>
                        <div className="mt-2 break-words text-sm font-medium text-slate-800">{item.errorMessage || '-'}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">{item.page || '-'}</div>
                      </div>
                      <div className="shrink-0 text-left lg:text-right">
                        <div className="text-lg font-semibold text-slate-900">{formatNumber(item.count)}</div>
                        <div className="text-xs text-slate-400">{item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString('zh-CN') : '-'}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function getStep(data: FunnelData | null, eventName: string): FunnelStep | undefined {
  return data?.steps.find((step) => step.eventName === eventName);
}

function MetricCard(props: { icon: React.ReactNode; label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{props.label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          {props.icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{props.value}</div>
    </div>
  );
}

function FunnelCard(props: { title: string; icon: React.ReactNode; data: FunnelData | null }): React.ReactElement {
  const max = Math.max(...(props.data?.steps.map((step) => step.count) ?? [0]), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="text-violet-600">{props.icon}</span>
        {props.title}
      </div>
      <div className="mt-4 space-y-3">
        {(props.data?.steps ?? []).map((step) => {
          const width = Math.max(5, Math.round((step.count / max) * 100));
          return (
            <div key={step.eventName}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-600">{labelEvent(step.eventName)}</span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatNumber(step.count)} / {formatPercent(step.conversionFromFirst)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${width}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-400">用户数 {formatNumber(step.users)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
