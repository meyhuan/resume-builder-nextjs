'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Download,
  Gauge,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { TEMPLATE_METADATA } from '@/lib/templates/template-metadata';
import { cn } from '@/lib/utils';
import { getStoredAdminPassword } from '@/lib/admin-auth';

interface FunnelStep {
  eventName: string;
  count: number;
  users: number;
}

interface FunnelData {
  start: string;
  end: string;
  steps: FunnelStep[];
}

interface LifecycleStep {
  key: string;
  label: string;
  description: string;
  eventNames: string[];
  independentUsers: number;
  orderedUsers: number;
  conversionFromFirst: number;
  conversionFromPrevious: number;
}

interface LifecycleData {
  start: string;
  end: string;
  platform: string;
  clientType: string;
  steps: LifecycleStep[];
  notes: string[];
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
  visitorIdentityVersion?: number;
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
  total?: number;
  sampled?: number;
  truncated?: boolean;
}

interface RevenuePlan {
  vipType: number;
  vipName: string;
  orders: number;
  users: number;
  amount: number;
  avgOrderAmount: number;
  orderShare: number;
  amountShare: number;
}

interface RevenueChannel {
  source: string;
  payChannel: string;
  orders: number;
  amount: number;
  amountShare: number;
}

interface RevenueConversion {
  vipType: number;
  vipName: string;
  createdOrders: number;
  paidOrders: number;
  payRate: number;
  paidAmount: number;
}

interface RevenueData {
  start: string;
  end: string;
  paidOrders: number;
  paidUsers: number;
  totalAmount: number;
  avgOrderAmount: number;
  plans: RevenuePlan[];
  channels: RevenueChannel[];
  conversion: RevenueConversion[];
}

interface AttributionChannel {
  source: string;
  channel: string;
  visitors: number;
  pageViewUsers: number;
  loginUsers: number;
  resumeUsers: number;
  exportUsers: number;
  paidUsers: number;
  paidOrders: number;
}

interface AttributionData {
  attributionVersion?: number;
  channels: AttributionChannel[];
}

interface SelfReportedSource {
  source: string;
  sourceDetail?: string;
  responses: number;
  users: number;
  selected: number;
  skipped: number;
}

interface SelfReportedSourcesData {
  sources: SelfReportedSource[];
}

interface TemplateFunnelData { rows: { templateId: string; impressions: number; activeSelections: number; selectedImpressions: number; exposedSelections: number; savedJourneys: number; exportedJourneys: number; defaultSavedJourneys: number; selectionRate: number | null; saveToExportRate: number | null }[]; notes: string[] }

type AnalyticsState = {
  templates: TemplateFunnelData | null;
  overview: OverviewData | null;
  lifecycle: LifecycleData | null;
  pay: FunnelData | null;
  export: FunnelData | null;
  create: FunnelData | null;
  errors: ErrorData | null;
  revenue: RevenueData | null;
  channels: AttributionData | null;
  acquisitionSources: SelfReportedSourcesData | null;
};

type PlatformFilter = 'all' | 'web' | 'mini_program' | 'h5_pay' | 'backend';
type ClientTypeFilter = 'all' | 'pc_web' | 'mobile_web' | 'mini_program_webview' | 'mini_program_native';

const EVENT_LABELS: Record<string, string> = {
  page_view: '页面访问',
  acquisition_source_selected: '用户选择来源',
  acquisition_source_skipped: '用户跳过来源选择',
  login_success: '登录成功',
  login_prompt_view: '登录弹窗曝光',
  landing_cta_click: '首页 CTA 点击',
  dashboard_view: '访问个人中心',
  sidebar_nav_click: '侧边栏导航点击',
  extension_sidepanel_open: '打开网申助手',
  extension_onboarding_accept: '同意插件使用说明',
  extension_connect_success: '插件连接成功',
  extension_disconnect: '插件断开连接',
  extension_fill_start: '插件开始填写',
  extension_fill_result: '插件填写结果',
  extension_fill_complete: '插件填写完整成功',
  extension_fill_partial: '插件填写部分成功',
  extension_fill_failed: '插件填写失败',
  extension_permission_denied: '插件网页权限被拒绝',
  extension_application_created: '插件创建投递记录',
  extension_mark_applied: '插件确认已投递',
  resume_create_start: '开始创建简历',
  resume_create_success: '创建简历成功',
  resume_create_failed: '创建简历失败',
  resume_create_blocked_by_limit: '创建简历达到上限',
  resume_save_success: '保存简历成功',
  resume_save_failed: '保存简历失败',
  resume_import_start: '开始导入简历',
  resume_import_success: '导入简历成功',
  resume_import_failed: '导入简历失败',
  ai_generate_start: '开始 AI 生成',
  ai_generate_success: 'AI 生成成功',
  ai_generate_failed: 'AI 生成失败',
  ai_result_apply: '采用 AI 结果',
  ai_assist_interaction: 'AI 助手任务交互',
  ai_assist_start: '开始 AI 编辑助手',
  ai_assist_success: 'AI 编辑助手成功',
  ai_assist_failed: 'AI 编辑助手失败',
  ai_assist_blocked_by_quota: 'AI 编辑助手额度不足',
  template_impression: '模板可见曝光',
  template_select: '主动选择模板',
  resume_preview: '预览简历',
  editor_open: '打开编辑器',
  editor_first_edit: '首次编辑',
  export_click: '点击导出',
  export_blocked_by_paywall: '导出被付费墙拦截',
  export_paywall_view: '查看导出付费墙',
  export_success: '导出成功',
  export_failed: '导出失败',
  pay_page_view: '访问支付页',
  pay_plan_click: '点击套餐',
  pay_qrcode_view: '支付二维码展示',
  pay_qrcode_scanned: '扫码打开支付页',
  pay_auto_submit: '自动发起支付',
  pay_submit_click: '发起支付',
  pay_order_create: '创建订单',
  pay_invoke_wechat: '拉起微信支付',
  paywall_cta_click: '付费墙 CTA 点击',
  paywall_close: '关闭付费墙',
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

const ACQUISITION_SOURCE_LABELS: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  ai_tool: '豆包 / 其他 AI 工具',
  zhihu: '知乎',
  wechat: '微信公众号 / 朋友圈',
  search: '搜索引擎',
  friend: '朋友推荐',
  other: '其他渠道',
  prefer_not_to_say: '暂不选择',
  unattributed: '无法归因',
  mini_program_unspecified: '小程序（来源未细分）',
};

const PLATFORM_OPTIONS: Array<{ value: PlatformFilter; label: string }> = [
  { value: 'all', label: '全部端' },
  { value: 'web', label: 'Web（含 PC/移动）' },
  { value: 'mini_program', label: '小程序' },
  { value: 'h5_pay', label: 'H5 支付页' },
  { value: 'backend', label: '后端' },
];

const CLIENT_TYPE_OPTIONS: Array<{ value: ClientTypeFilter; label: string }> = [
  { value: 'all', label: '生命周期：全部类型' },
  { value: 'pc_web', label: '生命周期：PC Web' },
  { value: 'mobile_web', label: '生命周期：手机 Web' },
  { value: 'mini_program_webview', label: '生命周期：小程序 WebView' },
  { value: 'mini_program_native', label: '生命周期：小程序原生' },
];

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString('zh-CN') : '-';
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 10000) / 100}%`;
}

function formatCurrency(value: number | undefined): string {
  if (typeof value !== 'number') return '-';
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function labelEvent(eventName: string): string {
  return EVENT_LABELS[eventName] || eventName;
}

function labelAcquisitionSource(source: string): string {
  return ACQUISITION_SOURCE_LABELS[source] || source;
}

async function fetchAnalytics(
  type: keyof AnalyticsState,
  days: number,
  platform: PlatformFilter,
  adminPassword: string,
  clientType?: ClientTypeFilter,
): Promise<unknown> {
  const response = await fetch('/next-api/admin/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, days, platform, adminPassword, clientType }),
    cache: 'no-store',
  });
  const json = await response.json();
  if (!response.ok || json?.status !== 100) {
    throw new Error(json?.error || json?.result || '加载失败');
  }
  return json.data;
}

export default function AnalyticsAdminPage(): React.ReactElement {
  const [days, setDays] = useState(7);
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [clientType, setClientType] = useState<ClientTypeFilter>('all');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState({ days: 7, platform: 'all' as PlatformFilter, clientType: 'all' as ClientTypeFilter });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsState>({
    templates: null,
    overview: null,
    lifecycle: null,
    pay: null,
    export: null,
    create: null,
    errors: null,
    revenue: null,
    channels: null,
    acquisitionSources: null,
  });

  const totalEvents = useMemo(() => {
    return data.overview?.eventCounts.reduce((sum, item) => sum + item.count, 0);
  }, [data.overview]);

  useEffect(() => {
    void loadAll();
    // The shell has already stored the password. Reload stays on the refresh button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll(): Promise<void> {
    const passwordToUse = getStoredAdminPassword();
    if (!passwordToUse.trim()) {
      setError('请先在管理后台登录');
      return;
    }
    setLoading(true);
    setApplied({ days, platform, clientType });
    setLoaded(true);
    setError(null);
    setData({
      templates: null,
      overview: null,
      lifecycle: null,
      pay: null,
      export: null,
      create: null,
      errors: null,
      revenue: null,
      channels: null,
      acquisitionSources: null,
    });
    const requests: Array<keyof AnalyticsState> = [
      'overview', 'revenue', 'errors', 'pay', 'export', 'create',
      'channels', 'acquisitionSources', 'lifecycle', 'templates',
    ];
    const results: boolean[] = [];
    let next = 0;
    // Keep one refresh from starting ten database aggregations at the same time.
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < requests.length) {
        const key = requests[next++];
        try {
          const value = await fetchAnalytics(key, days, platform, passwordToUse, key === 'lifecycle' ? clientType : undefined);
          setData((current) => ({ ...current, [key]: value as AnalyticsState[typeof key] }));
          results.push(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : '加载失败');
          results.push(false);
        }
      }
    }));
    if (results.every((ok) => !ok)) setLoaded(false);
    setLoading(false);
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
            <p className="mt-1 text-sm text-slate-500">统计按服务端自然日（含今天）；模板漏斗按最近 N×24 小时。插件请查看「插件填写效果」。</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value as ClientTypeFilter)}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {CLIENT_TYPE_OPTIONS.map((item) => (
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
          </div>
        </div>

        {loaded && (days !== applied.days || platform !== applied.platform || clientType !== applied.clientType) && (
          <p className="mt-4 text-sm text-amber-700">筛选条件已更改，请点击刷新数据；下方仍显示上次查询结果。</p>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </section>

      {!loaded ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {loading ? '正在加载数据。' : '暂时没有数据。'}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={<Activity />} label="今日访问 UV（估算）" value={formatNumber(data.overview?.visitorIdentityVersion === 2 ? data.overview.todayDau : undefined)} />
            <MetricCard icon={<Gauge />} label={`${applied.days} 天事件数 · ${PLATFORM_LABELS[applied.platform]}`} value={formatNumber(totalEvents)} />
            <MetricCard icon={<TrendingUp />} label="当前已支付订单数" value={formatNumber(data.revenue?.paidOrders)} />
            <MetricCard icon={<Sparkles />} label="当前已支付订单金额" value={formatCurrency(data.revenue?.totalAmount)} />
          </section>
          {data.overview && data.overview.visitorIdentityVersion !== 2 && <p className="text-sm text-amber-700">统计服务尚未更新，今日访问 UV 暂不展示。</p>}

          <LifecycleFunnelCard data={data.lifecycle} />
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">模板使用漏斗</h2>
            <p className="mt-2 text-xs text-slate-500">保存、导出按有曝光的主动选择链路计数；默认使用单列。跨 H5 与原生小程序请选「全部平台」。</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr>{['模板', '曝光', '主动选择', '有曝光的选择', '保存链路', '成功导出链路', '默认保存', '曝光选择率', '保存导出率'].map(label => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
              <tbody>{data.templates?.rows.map(row => <tr key={row.templateId} className="border-t border-slate-100">
                <td className="whitespace-nowrap p-2">{TEMPLATE_METADATA[row.templateId as keyof typeof TEMPLATE_METADATA]?.name || row.templateId}</td>
                {[row.impressions, row.activeSelections, row.exposedSelections, row.savedJourneys, row.exportedJourneys, row.defaultSavedJourneys].map((value, i) => <td className="p-2" key={i}>{value}</td>)}
                <td className="p-2">{row.selectionRate === null ? '—' : `${(row.selectionRate * 100).toFixed(1)}%`}</td>
                <td className="p-2">{row.saveToExportRate === null ? '—' : `${(row.saveToExportRate * 100).toFixed(1)}%`}</td>
              </tr>)}</tbody>
            </table></div>
            {!data.templates && <p className="mt-3 text-sm text-amber-700">模板统计暂不可用，请确认统计服务已更新后重试。其他报表不受影响。</p>}
            {data.templates && !data.templates.rows.length && <p className="mt-3 text-sm text-slate-500">暂无新版模板链路数据，历史使用量不会回填为转化率。</p>}
            {data.templates?.notes.map(note => <p key={note} className="mt-2 text-xs text-slate-500">{note}</p>)}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <AttributionCard data={data.channels} />
            <SelfReportedSourcesCard data={data.acquisitionSources} />
          </section>

          <RevenueCard data={data.revenue} />

          <section className="grid gap-5 xl:grid-cols-3">
            <FunnelCard title="支付事件分布" icon={<Sparkles />} data={data.pay} />
            <FunnelCard title="导出事件分布" icon={<Download />} data={data.export} />
            <FunnelCard title="创建事件分布" icon={<BarChart3 />} data={data.create} />
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
                    <div className="mt-1 text-xs text-slate-500">事件身份数（账号或匿名 ID） {formatNumber(item.users)}</div>
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
            {data.errors?.truncated && <p className="mt-2 text-xs text-amber-700">共 {formatNumber(data.errors.total)} 条，仅按最近 {formatNumber(data.errors.sampled)} 条聚合，排行和次数不是全量结果。</p>}
            {data.errors && data.errors.truncated === undefined && <p className="mt-2 text-xs text-amber-700">统计服务未返回采样状态，错误排行可能不是全量结果。</p>}
            <div className="mt-4 space-y-3">
              {data.errors == null ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">加载中</div>
              ) : data.errors.errors.length === 0 ? (
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

function LifecycleFunnelCard(props: { data: LifecycleData | null }): React.ReactElement {
  const steps = props.data?.steps ?? [];
  const max = Math.max(...steps.map((step) => step.orderedUsers), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-violet-600" />
            生命周期漏斗
          </div>
          <p className="mt-1 text-xs text-slate-400">
            严格时序口径：同一用户按 访问 → 登录 → 新建 → 首次导出 → 二次导出 → 付费墙 → 支付 成功推进。
          </p>
        </div>
        <div className="text-xs text-slate-400 lg:text-right">
          <div>{props.data?.platform ?? 'all'} / {props.data?.clientType ?? 'all'}</div>
          <div>{props.data?.start ? new Date(props.data.start).toLocaleDateString('zh-CN') : '-'} - {props.data?.end ? new Date(props.data.end).toLocaleDateString('zh-CN') : '-'}</div>
        </div>
      </div>

      {!props.data && <p className="mt-4 text-sm text-slate-400">加载中</p>}
      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {steps.map((step, index) => {
          const width = Math.max(4, Math.round((step.orderedUsers / max) * 100));
          return (
            <div key={step.key} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{index + 1}. {step.label}</div>
                  <div className="mt-1 text-xs text-slate-400">{step.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-slate-900">{formatNumber(step.orderedUsers)}</div>
                  <div className="text-xs text-slate-400">严格 UV</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${width}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-slate-50 px-2 py-1">
                  <div className="text-slate-400">独立 UV</div>
                  <div className="font-semibold text-slate-800">{formatNumber(step.independentUsers)}</div>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  <div className="text-slate-400">较上步</div>
                  <div className="font-semibold text-slate-800">{index === 0 ? '-' : formatPercent(step.conversionFromPrevious)}</div>
                </div>
                <div className="rounded bg-slate-50 px-2 py-1">
                  <div className="text-slate-400">较访问</div>
                  <div className="font-semibold text-slate-800">{formatPercent(step.conversionFromFirst)}</div>
                </div>
              </div>
              <div className="mt-2 truncate text-[11px] text-slate-400">
                {step.eventNames.map(labelEvent).join(' / ')}
              </div>
            </div>
          );
        })}
      </div>

      {(props.data?.notes ?? []).length > 0 && (
        <div className="mt-4 space-y-1 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
          {(props.data?.notes ?? []).map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      )}
    </section>
  );
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

function AttributionCard(props: { data: AttributionData | null }): React.ReactElement {
  const channels = props.data?.channels ?? [];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">渠道行为与付费归因</h2>
          <p className="mt-1 text-xs text-slate-400">各行为按账号或匿名 ID 独立计数，可能重复，不是同一批用户的漏斗。付费来自当前已支付订单，按付款前 30 天同账号同端最后一次有来源的行为估算；缺失记为无法归因。</p>
        </div>
        <span className="text-xs text-slate-400">来源 / 媒介</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{props.data ? '暂无渠道数据。' : '渠道数据暂不可用。'}</div>
        ) : (
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 font-medium">来源</th>
                <th className="pb-2 font-medium">访问</th>
                <th className="pb-2 font-medium">登录</th>
                <th className="pb-2 font-medium">导出</th>
                <th className="pb-2 text-right font-medium">付费</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channels.map((item) => (
                <tr key={`${item.source}-${item.channel}`}>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-800">{labelAcquisitionSource(item.source)}</div>
                    <div className="text-[11px] text-slate-400">{item.channel}</div>
                  </td>
                  <td className="py-2 text-slate-600">{formatNumber(item.pageViewUsers)}</td>
                  <td className="py-2 text-slate-600">{formatNumber(item.loginUsers)}</td>
                  <td className="py-2 text-slate-600">{formatNumber(item.exportUsers)}</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{props.data?.attributionVersion === 2 ? `${formatNumber(item.paidUsers)} 人 / ${formatNumber(item.paidOrders)} 单` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {props.data && props.data.attributionVersion !== 2 && <p className="mt-2 text-xs text-amber-700">统计服务尚未更新，渠道付费数据暂不展示。</p>}
    </section>
  );
}

function SelfReportedSourcesCard(props: { data: SelfReportedSourcesData | null }): React.ReactElement {
  const sources = props.data?.sources ?? [];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">用户自报来源</h2>
        <p className="mt-1 text-xs text-slate-400">登录后弹窗收集，用户可跳过</p>
      </div>
      <div className="mt-4 space-y-2">
        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{props.data ? '暂无回答。' : '来源数据暂不可用。'}</div>
        ) : sources.map((item) => (
          <div key={`${item.source}-${item.sourceDetail || 'none'}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-slate-800">{labelAcquisitionSource(item.source)}</div>
              {item.sourceDetail && <div className="mt-0.5 text-xs text-violet-600">具体来源：{item.sourceDetail}</div>}
              <div className="mt-0.5 text-xs text-slate-400">回答身份数 {formatNumber(item.users)}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-900">{formatNumber(item.selected)}</div>
              <div className="text-[11px] text-slate-400">主动选择次数</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevenueCard(props: { data: RevenueData | null }): React.ReactElement {
  const plans = props.data?.plans ?? [];
  const channels = props.data?.channels ?? [];
  const conversion = props.data?.conversion ?? [];

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">会员收入结构</h2>
            <p className="mt-1 text-xs text-slate-400">统计当前状态为已支付的订单；支付时间缺失时使用更新或创建时间，退款状态不计入。非财务净收入，Web 与 H5 支付筛选均对应 Web 订单。</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">{formatCurrency(props.data?.totalAmount)}</div>
            <div className="text-xs text-slate-400">客单价 {formatCurrency(props.data?.avgOrderAmount)}</div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {props.data ? '当前范围内没有支付订单。' : '收入数据暂不可用。'}
            </div>
          ) : plans.map((item) => (
            <div key={item.vipType} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{item.vipName}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {formatNumber(item.orders)} 单 · {formatNumber(item.users)} 人 · 收入占比 {formatPercent(item.amountShare)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCurrency(item.amount)}</div>
                  <div className="text-xs text-slate-400">客单价 {formatCurrency(item.avgOrderAmount)}</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(item.amountShare * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">订单创建后支付比例</h2>
          <p className="mt-1 text-xs text-slate-400">按创建时间选订单，查看当前已支付状态；跨期支付包含在内，退款订单不计入已支付。</p>
          <div className="mt-4 space-y-3">
            {conversion.map((item) => (
              <div key={item.vipType} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.vipName}</span>
                  <span className="font-semibold text-slate-900">{formatPercent(item.payRate)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatNumber(item.createdOrders)} 创建 · {formatNumber(item.paidOrders)} 支付成功
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">渠道收入</h2>
          <div className="mt-4 space-y-3">
            {channels.map((item) => (
              <div key={`${item.source}-${item.payChannel}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{item.source || 'legacy'} / {item.payChannel}</div>
                  <div className="text-xs text-slate-400">{formatNumber(item.orders)} 单 · {formatPercent(item.amountShare)}</div>
                </div>
                <div className="font-semibold text-slate-900">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
      <p className="mt-1 text-xs text-slate-400">各事件独立计数，不代表同一批用户的转化。</p>
      {!props.data && <p className="mt-4 text-sm text-slate-400">加载中或读取失败</p>}
      <div className="mt-4 space-y-3">
        {(props.data?.steps ?? []).map((step) => {
          const width = Math.max(5, Math.round((step.count / max) * 100));
          return (
            <div key={step.eventName}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-600">{labelEvent(step.eventName)}</span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatNumber(step.count)} 次
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${width}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-400">事件身份数（账号或匿名 ID） {formatNumber(step.users)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
