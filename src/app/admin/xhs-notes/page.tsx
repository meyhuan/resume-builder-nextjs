'use client'

import { useEffect, useMemo, useState } from 'react'
import { getStoredAdminPassword } from '@/lib/admin-auth'

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

const input = 'h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-violet-600'
const btn = 'h-11 rounded-lg border border-violet-600 px-4 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-40'
const btnSolid = 'h-11 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40'

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
    <div className="max-w-5xl text-stone-900">
      <div className="border-b-2 border-violet-600 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">笔记奖励审核</h1>
          <button className={`${btnSolid} shrink-0`} type="button" disabled={loading} onClick={() => void load()}>
            {loading ? '加载中' : '刷新'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          通过前核对：公开可见、正文或首评自然提及「智简简历」、非搬运。已通过的笔记需核验实际发布时间（北京时间），发布满 {rules.bonusAfterHours} 小时后录入数据补发。
        </p>
      </div>

      {queue !== 'drafts' && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-4 border-b border-stone-200 py-4 sm:grid-cols-4">
          {[
            ['当前记录', stats.count, '条'],
            ['已发放时长', stats.days, '天'],
            ['口令带来新用户', stats.conversions, '人'],
            ['短链待人工核对', stats.manual, '条'],
          ].map(([label, value, unit]) => (
            <div key={label as string} className="min-w-0">
              <dt className="text-xs leading-5 text-stone-500">{label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">
                {value}
                <span className="ml-1 text-sm font-normal text-stone-500">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchQueue(t.key)}
            className={`h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm ${
              queue === t.key ? 'border-violet-600 font-semibold text-violet-700' : 'border-transparent text-stone-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <p className="mt-2 text-xs leading-5 text-stone-400">
        规则：通过 {rules.baseDays} 天；浏览 ≥{rules.tier1Views} 或 赞+藏+评 ≥{rules.tier1Engagement} 累计至 {rules.tier1TotalDays} 天；浏览 ≥{rules.tier2Views} 累计至 {rules.tier2TotalDays} 天
      </p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {queue === 'drafts' ? (
        <div className="mt-2 divide-y divide-stone-200">
          {drafts.map((d) => {
            const out = d.output || {}
            return (
              <article key={d.id} className="py-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    {TOPIC_LABELS[d.topic] || d.topic}
                    <span className="ml-3 text-sm font-normal text-stone-500">
                      {d.user?.name || d.user?.wxId || d.user?.id}
                      {d.user?.javaUserId ? ` · Java ${d.user.javaUserId}` : ''}
                    </span>
                  </h2>
                  <span className="text-xs text-stone-400">{new Date(d.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <ol className="mt-3 space-y-1 text-sm">
                  {(out.titles || []).map((t, i) => (
                    <li key={i}>
                      <span className="mr-2 text-stone-400">{['封面向', '发布向', '搜索向'][i]}</span>
                      {t}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{out.body}</p>
                {Array.isArray(out.beforeAfter) && out.beforeAfter.length > 0 && (
                  <ul className="mt-4 space-y-1 border-l-2 border-violet-300 pl-4 text-sm">
                    {out.beforeAfter.map((p, i) => (
                      <li key={i}>
                        <span className="text-stone-400 line-through">{p.bad}</span>
                        <span className="mx-2 text-stone-400">→</span>
                        <span className="font-medium">{p.good}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
          {drafts.length === 0 && <p className="py-12 text-sm text-stone-500">没有草稿。输入密码后点「刷新」。</p>}
        </div>
      ) : (
        <div className="divide-y divide-stone-200">
          {rows.map((row) => {
            const m = metrics[row.id] || { publishedAt: '', views: '', likes: '', collects: '', comments: '' }
            const p = preview(row, m, rules)
            const hours = hoursSince(row.publishedAt || m.publishedAt)
            const invalidMetrics = [m.views, m.likes, m.collects, m.comments].some(value => value.trim() !== '' && (!/^\d+$/.test(value) || Number(value) > 2147483647))
            const draft = row.draft
            return (
              <article key={row.id} className="py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="font-semibold">
                        用户 {row.userId}
                        {row.userName ? ` · ${row.userName}` : ''}
                      </h2>
                      <span className="text-sm text-stone-500">{TOPIC_LABELS[row.topicKey] || row.topicKey || '未选题'}</span>
                      <span className="rounded border border-stone-300 px-1.5 text-xs text-stone-600">{STATUS_LABELS[row.status] ?? row.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {row.createdAt?.replace('T', ' ').slice(0, 16)} · 口令 <span className="font-mono">{row.inviteCode || '无'}</span> · 带来 {row.inviteConversions} 人 · 已发 {(row.baseDays || 0) + (row.bonusDays || 0)} 天
                    </p>
                    <p className="mt-0.5 break-all font-mono text-xs text-stone-400">{row.noteId}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {draft && (
                      <button type="button" className="text-stone-600 underline" onClick={() => void toggleDraft(row)}>
                        {open === row.id ? '收起原稿' : '对照原稿'}
                      </button>
                    )}
                    <a className="font-medium text-violet-700 underline" href={row.noteUrl} target="_blank" rel="noreferrer">
                      打开笔记
                    </a>
                  </div>
                </div>

                {row.needsManualCheck && (
                  <p className="mt-3 border-l-2 border-amber-600 pl-3 text-sm text-amber-800">短链没有展开成长链，请打开确认不是重复提交的旧笔记。</p>
                )}
                {row.status === 2 && row.rejectReason && <p className="mt-3 text-sm text-red-700">拒绝原因：{row.rejectReason}</p>}

                {open === row.id && draft && (
                  <div className="mt-4 bg-stone-100 p-4 text-sm">
                    {draft.output ? (
                      <>
                        <p className="font-medium">{(draft.output.titles || []).join(' / ')}</p>
                        <p className="mt-2 whitespace-pre-wrap leading-7 text-stone-700">{draft.output.body}</p>
                      </>
                    ) : (
                      <p className="text-stone-500">正在加载原稿</p>
                    )}
                  </div>
                )}

                {row.status === 0 && (
                  <div className="mt-4 space-y-2">
                    <button className={`${btnSolid} w-full sm:w-auto`} type="button" onClick={() => void act('approve', row.id)}>
                      通过，发放 {rules.baseDays} 天
                    </button>
                    <input
                      className={input}
                      placeholder="拒绝原因"
                      value={reason[row.id] || ''}
                      onChange={(e) => setReason({ ...reason, [row.id]: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button className={btn} type="button" onClick={() => void act('reject', row.id, { reason: reason[row.id] || '' })}>
                        拒绝
                      </button>
                      <button
                        className="h-11 rounded-lg text-sm text-stone-500"
                        type="button"
                        onClick={() => void act('revoke', row.id, {}, '回收后该用户不能再领取奖励，确认？')}
                      >
                        回收资格
                      </button>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {QUICK_REASONS.map((t) => (
                        <button key={t} type="button" className="rounded-lg bg-stone-50 px-3 py-2 text-left text-xs leading-5 text-stone-600" onClick={() => setReason({ ...reason, [row.id]: t })}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {row.status === 1 && (
                  <div className="mt-4 border-t border-stone-200 pt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold">效果数据</span>
                      <span className={hours >= rules.bonusAfterHours ? 'text-stone-500' : 'text-amber-800'}>
                        {hours < 0 ? '请核验实际发布时间' : `已发布 ${hours} 小时${hours >= rules.bonusAfterHours ? '' : `，未满 ${rules.bonusAfterHours} 小时`}`}
                      </span>
                    </div>
                    <label className="mt-3 block text-xs text-stone-600">
                      笔记实际发布时间（北京时间，核验后填写）
                      <input type="datetime-local" className={`${input} mt-1 block`} aria-label="笔记实际发布时间（北京时间）" value={row.publishedAt?.slice(0, 16) || m.publishedAt} disabled={!!row.publishedAt} onChange={e => setMetric(row.id, 'publishedAt', e.target.value)} />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {(
                        [
                          ['views', '浏览'],
                          ['likes', '点赞'],
                          ['collects', '收藏'],
                          ['comments', '评论'],
                        ] as [keyof MetricInput, string][]
                      ).map(([field, label]) => (
                        <label key={field} className="text-xs text-stone-500">
                          {label}
                          <input
                            type="number"
                            min={0}
                            className={`${input} mt-1 w-full`}
                            value={m[field]}
                            onChange={(e) => setMetric(row.id, field, e.target.value)}
                          />
                        </label>
                      ))}
                      <div className="flex items-end">
                        <button
                          type="button"
                          className={`${btnSolid} w-full`}
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
                    <p className="mt-3 text-sm text-stone-600">
                      互动 {p.engagement}（赞 {p.likes} + 藏 {p.collects} + 评 {p.comments}），
                      {p.target > 0 ? `达到 ${p.target} 天档，已发 ${p.granted} 天，` : '未达进阶档，'}
                      <span className={p.delta > 0 ? 'font-semibold text-violet-700' : ''}>
                        {p.delta > 0 ? `本次补发 ${p.delta} 天` : '本次不补发'}
                      </span>
                    </p>
                    <button
                      className="mt-2 text-xs text-stone-500 underline"
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
          {rows.length === 0 && <p className="py-12 text-sm text-stone-500">这个队列是空的。输入密码后点「刷新」。</p>}
        </div>
      )}
    </div>
  )
}
