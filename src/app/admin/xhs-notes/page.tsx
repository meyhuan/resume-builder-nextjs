'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  RotateCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { getStoredAdminPassword } from '@/lib/admin-auth'
import { cn } from '@/lib/utils'

interface DraftPackage {
  titles?: string[]
  body?: string
  tags?: string[]
  cover?: { line1?: string; line2?: string; badge?: string; badCase?: string; goodCase?: string }
  beforeAfter?: { label?: string; bad?: string; good?: string }[]
}

interface NoteRow {
  id: number
  userId: number
  userName?: string | null
  topicKey: string
  noteUrl: string
  noteId: string
  status: number
  rejectReason?: string | null
  needsManualCheck: boolean
  inviteCode: string
  inviteConversions: number
  createdAt: string
  publishedAt?: string | null
  baseDays: number
  bonusDays: number
  views?: number | null
  likes?: number | null
  collects?: number | null
  comments?: number | null
  draft?: { id: string; topic: string; output?: DraftPackage; createdAt: string } | null
}

interface RecentDraftRow {
  id: string
  topic: string
  output: DraftPackage
  createdAt: string
  user?: { id: string; name?: string | null; wxId?: string | null; javaUserId?: string | null }
}

interface MetricInput {
  publishedAt: string
  views: string
  likes: string
  collects: string
  comments: string
}

type Queue = '0' | '1' | '2' | 'drafts'

const TOPIC_LABELS: Record<string, string> = {
  'template-share': '清爽一页纸模板分享',
  'pdf-import': '旧 PDF 简历一键导入',
  'clean-export': '干净无水印 PDF 导出',
  'first-draft': '快速搭出简历初稿',
  'cross-device': '手机随手记 + 电脑精修',
  'before-after': '流水账前后改造',
  'jd-align': '投递前对照 JD 查漏补缺',
  'one-page-fit': '一页半收进一页纸',
  pitfalls: '应届生没大厂实习怎么写',
  'career-switch': '跨专业 / 转岗简历重构',
  'job-hop-night': '在职下班更新简历',
  'hr-view': '投递前 5 分钟自查清单',
}

const STATUS_LABELS: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已拒绝', 3: '已回收' }

const QUICK_REASONS = [
  '正文或首评未自然提及「智简简历」',
  '笔记已删除或仅自己可见',
  '未使用活动生成的配图或内容',
  '内容与求职简历无关',
]

// 与后端 XhsNoteRewardCalculator 保持一致：互动 = 赞 + 藏 + 评，阈值取自 application.properties 默认值
const DEFAULT_RULE = { baseDays: 7, bonusAfterHours: 48, tier1Views: 300, tier1Engagement: 30, tier1TotalDays: 30, tier2Views: 1000, tier2TotalDays: 60 }
type RewardRules = typeof DEFAULT_RULE

function preview(row: NoteRow, m: MetricInput, rule: RewardRules) {
  const views = Math.max(0, Number(m.views) || 0)
  const likes = Math.max(0, Number(m.likes) || 0)
  const collects = Math.max(0, Number(m.collects) || 0)
  const comments = Math.max(0, Number(m.comments) || 0)
  const engagement = likes + collects + comments
  let target = 0
  if (views >= rule.tier2Views) target = rule.tier2TotalDays
  else if (views >= rule.tier1Views || engagement >= rule.tier1Engagement) target = rule.tier1TotalDays
  const granted = (row.baseDays || 0) + (row.bonusDays || 0)
  return { views, likes, collects, comments, engagement, target, granted, delta: Math.max(0, target - granted) }
}

function hoursSince(createdAt?: string): number {
  const t = createdAt ? new Date(createdAt.replace(/(?:Z|[+-]\d{2}:\d{2})$/, '') + '+08:00').getTime() : NaN
  return Number.isNaN(t) ? -1 : Math.floor((Date.now() - t) / 3600000)
}

const inputClass = 'min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-base sm:text-sm text-stone-900 outline-none transition-all focus:border-violet-600 focus:ring-2 focus:ring-violet-100'
const btnOutline = 'min-h-[44px] rounded-xl border border-violet-600 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center'
const btnSolid = 'min-h-[44px] rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.99] disabled:opacity-40 transition-all shadow-xs flex items-center justify-center'

export default function XhsNotesAdminPage() {
  const [queue, setQueue] = useState<Queue>('0')
  const [rows, setRows] = useState<NoteRow[]>([])
  const [drafts, setDrafts] = useState<RecentDraftRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState<Record<number, string>>({})
  const [metrics, setMetrics] = useState<Record<number, MetricInput>>({})
  const [rules, setRules] = useState<RewardRules>(DEFAULT_RULE)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    void load('0')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function call(action: string, extra: Record<string, unknown> = {}) {
    const adminPassword = getStoredAdminPassword()
    if (!adminPassword) throw new Error('请先在管理后台登录')
    const response = await fetch('/next-api/admin/xhs-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword, action, ...extra }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || (payload && typeof payload.status === 'number' && payload.status !== 100)) {
      throw new Error(payload?.result || payload?.error || '请求失败')
    }
    return payload
  }

  async function load(target: Queue = queue) {
    setError('')
    setLoading(true)
    try {
      if (target === 'drafts') {
        const payload = await call('drafts')
        setDrafts(Array.isArray(payload?.data) ? payload.data : [])
      } else {
        const [config, payload] = await Promise.all([
          call('config'),
          call('list', { status: target }),
        ])
        if (!config?.data) throw new Error('无法获取活动奖励规则')
        setRules(config.data)
        const list: NoteRow[] = Array.isArray(payload?.data) ? payload.data : []
        setRows(list)
        setMetrics((prev) => {
          const next: Record<number, MetricInput> = {}
          list.forEach((r) => {
            next[r.id] = prev[r.id] || {
              publishedAt: r.publishedAt?.slice(0, 16) || '',
              views: r.views != null ? String(r.views) : '',
              likes: r.likes != null ? String(r.likes) : '',
              collects: r.collects != null ? String(r.collects) : '',
              comments: r.comments != null ? String(r.comments) : '',
            }
          })
          return next
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function act(action: string, id: number, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setError('')
    try {
      await call(action, { id: String(id), ...extra })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  function setMetric(id: number, field: keyof MetricInput, value: string) {
    setMetrics((prev) => ({ ...prev, [id]: { ...(prev[id] || { publishedAt: '', views: '', likes: '', collects: '', comments: '' }), [field]: value } }))
  }

  async function toggleDraft(row: NoteRow): Promise<void> {
    if (open === row.id) {
      setOpen(null)
      return
    }
    setOpen(row.id)
    if (!row.draft || row.draft.output) return
    try {
      const payload = await call('draft', { draftId: row.draft.id })
      const output = payload?.data?.output as DraftPackage | undefined
      if (!output) return
      setRows((current) => current.map((item) => item.id === row.id && item.draft
        ? { ...item, draft: { ...item.draft, output } }
        : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : '原稿加载失败')
    }
  }

  function switchQueue(next: Queue) {
    setQueue(next)
    void load(next)
  }

  const stats = useMemo(
    () => ({
      count: rows.length,
      days: rows.reduce((s, r) => s + (r.baseDays || 0) + (r.bonusDays || 0), 0),
      conversions: rows.reduce((s, r) => s + (r.inviteConversions || 0), 0),
      manual: rows.filter((r) => r.needsManualCheck).length,
    }),
    [rows],
  )

  const tabs: { key: Queue; label: string }[] = [
    { key: '0', label: '待审核' },
    { key: '1', label: '已通过' },
    { key: '2', label: '已拒绝' },
    { key: 'drafts', label: '生成草稿' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 text-stone-900">
      {/* Page Header */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800">笔记奖励审核</h1>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              核对公开可见、自然提及「智简简历」、非搬运。满 {rules.bonusAfterHours} 小时后录入效果数据补发。
            </p>
          </div>
          <button
            className={cn(btnSolid, 'shrink-0 min-h-[40px] px-3.5 text-xs sm:text-sm')}
            type="button"
            disabled={loading}
            onClick={() => void load()}
          >
            <RotateCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            {loading ? '刷新中' : '刷新'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {queue !== 'drafts' && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            ['当前记录', stats.count, '条'],
            ['已发放时长', stats.days, '天'],
            ['口令带来新用户', stats.conversions, '人'],
            ['短链待人工核对', stats.manual, '条'],
          ].map(([label, value, unit]) => (
            <div key={label as string} className="rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[11px] sm:text-xs text-stone-500 block truncate">{label}</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-800">
                {value}
                <span className="ml-1 text-xs font-normal text-stone-400">{unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Queue Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200/60">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchQueue(t.key)}
            className={cn(
              'flex-1 min-h-[38px] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap text-center',
              queue === t.key
                ? 'bg-white text-violet-700 shadow-xs ring-1 ring-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] sm:text-xs text-stone-400 px-1">
        奖励规则：通过 {rules.baseDays} 天；浏览 ≥{rules.tier1Views} 或 赞+藏+评 ≥{rules.tier1Engagement} 累计至 {rules.tier1TotalDays} 天；浏览 ≥{rules.tier2Views} 累计至 {rules.tier2TotalDays} 天
      </p>

      {error && (
        <div className="rounded-xl bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-700 border border-rose-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {queue === 'drafts' ? (
        <div className="space-y-3">
          {drafts.map((d) => {
            const out = d.output || {}
            return (
              <article key={d.id} className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 pb-3">
                  <h2 className="font-bold text-sm sm:text-base text-slate-800">
                    {TOPIC_LABELS[d.topic] || d.topic}
                    <span className="ml-2 text-xs font-normal text-stone-500">
                      {d.user?.name || d.user?.wxId || d.user?.id}
                      {d.user?.javaUserId ? ` · Java ${d.user?.javaUserId}` : ''}
                    </span>
                  </h2>
                  <span className="text-xs text-stone-400">{new Date(d.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <ol className="space-y-1.5 text-xs sm:text-sm">
                  {(out.titles || []).map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 font-medium">
                        {['封面向', '发布向', '搜索向'][i]}
                      </span>
                      <span className="text-stone-800">{t}</span>
                    </li>
                  ))}
                </ol>
                <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-stone-700 bg-stone-50/70 p-3 rounded-xl border border-stone-100">
                  {out.body}
                </p>
                {Array.isArray(out.beforeAfter) && out.beforeAfter.length > 0 && (
                  <ul className="space-y-1.5 border-l-2 border-violet-400 pl-3 text-xs sm:text-sm">
                    {out.beforeAfter.map((p, i) => (
                      <li key={i}>
                        <span className="text-stone-400 line-through">{p.bad}</span>
                        <span className="mx-2 text-stone-400">→</span>
                        <span className="font-semibold text-violet-700">{p.good}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
          {drafts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center text-xs sm:text-sm text-stone-400">
              暂无草稿记录，点击上方「刷新」加载。
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {rows.map((row) => {
            const m = metrics[row.id] || { publishedAt: '', views: '', likes: '', collects: '', comments: '' }
            const p = preview(row, m, rules)
            const hours = hoursSince(row.publishedAt || m.publishedAt)
            const invalidMetrics = [m.views, m.likes, m.collects, m.comments].some(value => value.trim() !== '' && (!/^\d+$/.test(value) || Number(value) > 2147483647))
            const draft = row.draft
            return (
              <article key={row.id} className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-sm sm:text-base text-slate-800">
                        用户 {row.userId}
                        {row.userName ? ` · ${row.userName}` : ''}
                      </h2>
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 border border-violet-100">
                        {TOPIC_LABELS[row.topicKey] || row.topicKey || '未选题'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold border',
                          row.status === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.status === 2
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500 leading-normal">
                      提交于 {row.createdAt?.replace('T', ' ').slice(0, 16)} · 口令 <code className="font-mono text-violet-700">{row.inviteCode || '无'}</code> · 带来 {row.inviteConversions} 人 · 已发 {(row.baseDays || 0) + (row.bonusDays || 0)} 天
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-stone-400">笔记 ID: {row.noteId}</p>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    {draft && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 min-h-[36px]"
                        onClick={() => void toggleDraft(row)}
                      >
                        {open === row.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        <span>{open === row.id ? '收起原稿' : '对照原稿'}</span>
                      </button>
                    )}
                    <a
                      className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 border border-violet-100 min-h-[36px]"
                      href={row.noteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>查看笔记</span>
                    </a>
                  </div>
                </div>

                {row.needsManualCheck && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs sm:text-sm text-amber-900 border border-amber-200">
                    ⚠️ 短链没有展开成长链，请打开确认不是重复提交的旧笔记。
                  </p>
                )}

                {row.status === 2 && row.rejectReason && (
                  <p className="rounded-xl bg-rose-50 p-3 text-xs sm:text-sm text-rose-800 border border-rose-200">
                    拒绝原因：{row.rejectReason}
                  </p>
                )}

                {open === row.id && draft && (
                  <div className="rounded-2xl bg-stone-50 p-3.5 sm:p-4 text-xs sm:text-sm space-y-2 border border-stone-200 animate-in fade-in">
                    {draft.output ? (
                      <>
                        <p className="font-bold text-slate-800">{(draft.output.titles || []).join(' / ')}</p>
                        <p className="whitespace-pre-wrap leading-relaxed text-stone-700">{draft.output.body}</p>
                      </>
                    ) : (
                      <p className="text-stone-400">正在加载原稿...</p>
                    )}
                  </div>
                )}

                {/* Status 0: Review Actions */}
                {row.status === 0 && (
                  <div className="space-y-2.5 pt-1">
                    <button
                      className={cn(btnSolid, 'w-full')}
                      type="button"
                      onClick={() => void act('approve', row.id)}
                    >
                      通过审核，发放 {rules.baseDays} 天 VIP
                    </button>
                    <input
                      className={inputClass}
                      placeholder="如需拒绝，请输入拒绝原因"
                      value={reason[row.id] || ''}
                      onChange={(e) => setReason({ ...reason, [row.id]: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={btnOutline}
                        type="button"
                        onClick={() => void act('reject', row.id, { reason: reason[row.id] || '' })}
                      >
                        拒绝
                      </button>
                      <button
                        className="min-h-[44px] rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-500 hover:bg-stone-50 active:scale-[0.99] transition-all"
                        type="button"
                        onClick={() => void act('revoke', row.id, {}, '回收后该用户不能再领取奖励，确认？')}
                      >
                        回收资格
                      </button>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {QUICK_REASONS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="rounded-xl border border-stone-200/70 bg-stone-50/80 px-3 py-2 text-left text-xs leading-5 text-stone-600 hover:bg-stone-100 transition-colors"
                          onClick={() => setReason({ ...reason, [row.id]: t })}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status 1: Performance & Bonus */}
                {row.status === 1 && (
                  <div className="border-t border-stone-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-slate-800">核验效果数据</span>
                      <span className={cn('font-medium text-xs', hours >= rules.bonusAfterHours ? 'text-stone-500' : 'text-amber-700')}>
                        {hours < 0 ? '请核验实际发布时间' : `已发布 ${hours} 小时${hours >= rules.bonusAfterHours ? '（可补发）' : `，未满 ${rules.bonusAfterHours} 小时`}`}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">
                        笔记实际发布时间（北京时间，核验后填写）
                      </label>
                      <input
                        type="datetime-local"
                        className={inputClass}
                        aria-label="笔记实际发布时间（北京时间）"
                        value={row.publishedAt?.slice(0, 16) || m.publishedAt}
                        disabled={!!row.publishedAt}
                        onChange={e => setMetric(row.id, 'publishedAt', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {(
                        [
                          ['views', '浏览量'],
                          ['likes', '点赞数'],
                          ['collects', '收藏数'],
                          ['comments', '评论数'],
                        ] as [keyof MetricInput, string][]
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className="block text-[11px] font-medium text-stone-500 mb-1">
                            {label}
                          </label>
                          <input
                            type="number"
                            min={0}
                            className={inputClass}
                            value={m[field]}
                            onChange={(e) => setMetric(row.id, field, e.target.value)}
                          />
                        </div>
                      ))}
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          className={cn(btnSolid, 'w-full')}
                          disabled={hours < rules.bonusAfterHours || invalidMetrics}
                          onClick={() =>
                            void act(
                              'bonus',
                              row.id,
                              { publishedAt: row.publishedAt || m.publishedAt, views: String(p.views), likes: String(p.likes), collects: String(p.collects), comments: String(p.comments) },
                              p.delta > 0 ? `将补发 ${p.delta} 天会员，确认？` : undefined,
                            )
                          }
                        >
                          {p.delta > 0 ? `补发 ${p.delta} 天` : '保存数据'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-normal">
                      互动量 <strong>{p.engagement}</strong>（赞 {p.likes} + 藏 {p.collects} + 评 {p.comments}），
                      {p.target > 0 ? `达到 ${p.target} 天档，已发 ${p.granted} 天，` : '未达进阶档，'}
                      <span className={cn(p.delta > 0 ? 'font-bold text-violet-700' : '')}>
                        {p.delta > 0 ? `本次补发 ${p.delta} 天` : '本次不补发'}
                      </span>
                    </p>

                    <button
                      className="text-xs text-rose-600 hover:text-rose-700 underline pt-1 block"
                      type="button"
                      onClick={() => void act('revoke', row.id, {}, '确认该笔记已删除并回收资格？')}
                    >
                      笔记已删除，回收资格
                    </button>
                  </div>
                )}
              </article>
            )
          })}
          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center text-xs sm:text-sm text-stone-400">
              当前队列为空，点击上方「刷新」获取数据。
            </div>
          )}
        </div>
      )}
    </div>
  )
}
