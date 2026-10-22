'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminErrorText, adminJava, vipTypeLabel } from '@/lib/admin-java'

interface RedemptionCode {
  id: number
  code: string
  type: number
  isUsed: boolean
  usedByUserId?: number | null
  createdAt?: string | null
  expiresAt?: string | null
  redeemedAt?: string | null
}

interface CodePage {
  content: RedemptionCode[]
  totalPages: number
  totalElements: number
  number: number
  first: boolean
  last: boolean
}

interface HistoryItem {
  id: number
  code?: string
  userId?: number
  vipType?: number
  createdAt?: string
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ')
  return date.toLocaleString('zh-CN')
}

function dateBound(value: string, end: boolean): string {
  if (!value) return ''
  return `${value}T${end ? '23:59:59' : '00:00:00'}`
}

export default function RedemptionCodesPage(): React.ReactElement {
  const [code, setCode] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('false')
  const [hideExpired, setHideExpired] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [queryVersion, setQueryVersion] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [data, setData] = useState<CodePage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [vipType, setVipType] = useState('1')
  const [count, setCount] = useState(10)
  const [history, setHistory] = useState<HistoryItem[] | null>(null)
  const [copiedCode, setCopiedCode] = useState('')
  const cursors = useState<Array<{ page: number; index: number }>>([{ page: 0, index: 0 }])[0]

  function isUnexpired(item: RedemptionCode): boolean {
    if (!item.expiresAt) return true
    const time = new Date(item.expiresAt).getTime()
    return Number.isNaN(time) || time > Date.now()
  }

  const filters = useCallback(() => {
    const params = new URLSearchParams()
    if (code.trim()) params.set('code', code.trim())
    if (type) params.set('type', type)
    if (status) params.set('isUsed', status)
    const start = dateBound(startDate, false)
    const end = dateBound(endDate, true)
    if (start) params.set('startDate', start)
    if (end) params.set('endDate', end)
    return params
  }, [code, type, status, startDate, endDate])

  const fetchServerPage = useCallback(async (pageNumber: number): Promise<CodePage> => {
    const params = filters()
    params.set('page', String(pageNumber))
    params.set('size', '10')
    params.set('sort', 'createdAt,desc')
    return adminJava<CodePage>(`/redemption-codes?${params.toString()}`)
  }, [filters])

  const load = useCallback(async (uiPage: number): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const start = cursors[uiPage] ?? { page: 0, index: 0 }
      const items: RedemptionCode[] = []
      let serverPage = start.page
      let index = start.index
      let more = true
      let steps = 0
      while (items.length < 10 && more && steps < 40) {
        const result = await fetchServerPage(serverPage)
        const content = result.content ?? []
        while (index < content.length && items.length < 10) {
          const row = content[index]
          index += 1
          if (!hideExpired || isUnexpired(row)) items.push(row)
        }
        if (index < content.length) {
          more = true
          break
        }
        more = !result.last
        serverPage += 1
        index = 0
        steps += 1
      }
      cursors[uiPage + 1] = { page: serverPage, index }
      setData({
        content: items,
        totalPages: 0,
        totalElements: items.length,
        number: uiPage,
        first: uiPage === 0,
        last: !more,
      })
      setPage(uiPage)
      setHasMore(more)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '兑换码加载失败'))
    } finally {
      setLoading(false)
    }
  }, [cursors, fetchServerPage, hideExpired])

  useEffect(() => {
    cursors.splice(1)
    cursors[0] = { page: 0, index: 0 }
    void load(0)
    // Reload after the default filter, or after 应用 / 恢复默认 updates state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryVersion])

  async function generate(): Promise<void> {
    setNotice('')
    setError('')
    try {
      const created = await adminJava<RedemptionCode[]>('/redemption-codes/batch', {
        method: 'POST',
        body: new URLSearchParams({ vipType, count: String(count) }),
      })
      setNotice(`已生成 ${created?.length ?? count} 个${vipTypeLabel(Number(vipType))}兑换码`)
      await load(0)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '生成失败'))
    }
  }

  async function remove(item: RedemptionCode): Promise<void> {
    if (!window.confirm(`删除兑换码 ${item.code}？`)) return
    setError('')
    try {
      await adminJava(`/redemption-codes/${item.id}`, { method: 'DELETE' })
      await load(page)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '删除失败'))
    }
  }

  async function showHistory(id: number): Promise<void> {
    setHistory(null)
    setError('')
    try {
      const result = await adminJava<{ content: HistoryItem[] }>(`/redemption-codes/${id}/history?page=0&size=10`)
      setHistory(result.content ?? [])
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '记录加载失败'))
    }
  }

  async function copyCode(value: string): Promise<void> {
    setError('')
    setCopiedCode(value)
    setNotice(`已复制 ${value}`)
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setCopiedCode('')
      setNotice('')
      setError('复制失败')
    }
  }

  async function exportCsv(): Promise<void> {
    setError('')
    try {
      const params = filters()
      const blob = await adminJava<Blob>(`/redemption-codes/export?${params.toString()}`)
      const text = await blob.text()
      const [header, ...lines] = text.split(/\r?\n/)
      const kept = hideExpired ? lines.filter((line) => {
        if (!line.trim()) return false
        const expiresAt = line.split(',')[5]?.replace(/"/g, '').trim()
        if (!expiresAt) return true
        const time = new Date(expiresAt).getTime()
        return Number.isNaN(time) || time > Date.now()
      }) : lines
      const file = new Blob([[header, ...kept].join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'redemption_codes.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '导出失败'))
    }
  }

  const codes = data?.content ?? []
  const field = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-violet-400'

  function applyFilters(): void {
    setFiltersOpen(false)
    setQueryVersion((version) => version + 1)
  }

  function resetFilters(): void {
    setCode('')
    setType('')
    setStatus('false')
    setHideExpired(true)
    setStartDate('')
    setEndDate('')
    setFiltersOpen(false)
    setQueryVersion((version) => version + 1)
  }

  function StatusMark(markProps: { used: boolean }): React.ReactElement {
    return markProps.used ? (
      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-100 px-2 text-xs text-slate-500">已使用</span>
    ) : (
      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-800">未使用</span>
    )
  }

  function CodeActions(actionProps: { item: RedemptionCode }): React.ReactElement {
    const item = actionProps.item
    const copied = copiedCode === item.code
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void copyCode(item.code)}
          className={`h-9 min-w-16 rounded-lg px-3 text-sm font-semibold text-white ${copied ? 'bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'}`}
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" onClick={() => void showHistory(item.id)} className="h-9 px-1.5 text-xs text-slate-400">记录</button>
        {!item.isUsed && (
          <button type="button" onClick={() => void remove(item)} className="h-9 px-1.5 text-xs text-rose-500">删除</button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">兑换码</h2>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">已使用的兑换码不能删除。</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="text-sm font-medium text-slate-800">批量生成</h3>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_4.5rem_4.25rem] gap-2">
          <select aria-label="生成类型" value={vipType} onChange={(event) => setVipType(event.target.value)} className={field}>
            <option value="1">月卡</option>
            <option value="2">年卡</option>
            <option value="3">终身</option>
          </select>
          <input aria-label="生成数量" type="number" min={1} max={100} value={count} onChange={(event) => setCount(Number(event.target.value))} className={field} />
          <button type="button" onClick={() => void generate()} className="h-11 rounded-lg bg-violet-600 text-sm font-medium text-white hover:bg-violet-700">生成</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-xs text-slate-500">
            {status === 'false' ? <StatusMark used={false} /> : status === 'true' ? <StatusMark used /> : <span className="shrink-0">全部状态</span>}
            <span className="truncate">{[code.trim(), type ? vipTypeLabel(Number(type)) : '', hideExpired ? '未过期' : '', startDate || endDate ? `${startDate || '不限'}至${endDate || '不限'}` : ''].filter(Boolean).join(' · ')}</span>
          </p>
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="h-11 shrink-0 px-2 text-sm text-violet-700">
            {filtersOpen ? '收起' : '筛选'}
          </button>
          <button type="button" onClick={() => void exportCsv()} className="h-11 shrink-0 px-2 text-sm text-slate-600">导出</button>
        </div>
        {filtersOpen && (
          <form
            className="mt-2 grid grid-cols-2 gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              applyFilters()
            }}
          >
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="兑换码" className={`${field} col-span-2`} />
            <select aria-label="类型" value={type} onChange={(event) => setType(event.target.value)} className={field}>
              <option value="">全部类型</option>
              <option value="1">月卡</option>
              <option value="2">年卡</option>
              <option value="3">终身</option>
            </select>
            <select aria-label="状态" value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
              <option value="">全部状态</option>
              <option value="false">未使用</option>
              <option value="true">已使用</option>
            </select>
            <label className="col-span-2 flex h-11 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={hideExpired} onChange={(event) => setHideExpired(event.target.checked)} className="h-4 w-4 accent-violet-600" />
              只看未过期
            </label>
            <label className="text-xs text-slate-500">
              开始
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="text-xs text-slate-500">
              结束
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${field} mt-1`} />
            </label>
            <button type="submit" className="h-11 rounded-lg bg-violet-600 text-sm font-medium text-white">{loading ? '查询中...' : '应用'}</button>
            <button type="button" onClick={resetFilters} className="h-11 rounded-lg border border-slate-200 text-sm text-slate-700">恢复默认</button>
          </form>
        )}

        {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {notice && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

        <div className="mt-2 divide-y divide-slate-100 md:hidden">
          {codes.map((item) => (
            <article key={item.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-mono text-base font-semibold tracking-wide text-slate-900">{item.code}</p>
                  <StatusMark used={item.isUsed} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {vipTypeLabel(item.type)}
                  {item.usedByUserId ? ` · 用户 ${item.usedByUserId}` : ''} · {formatWhen(item.createdAt)}
                </p>
              </div>
              <CodeActions item={item} />
            </article>
          ))}
          {codes.length === 0 && !loading && <p className="py-6 text-center text-sm text-slate-400">没有兑换码</p>}
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">兑换码</th>
                <th className="px-3 py-2 font-medium">类型</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">使用者</th>
                <th className="px-3 py-2 font-medium">创建时间</th>
                <th className="px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-mono text-base font-semibold tracking-wide text-slate-900">{item.code}</td>
                  <td className="px-3 py-3">{vipTypeLabel(item.type)}</td>
                  <td className="px-3 py-3"><StatusMark used={item.isUsed} /></td>
                  <td className="px-3 py-3">{item.usedByUserId ?? '-'}</td>
                  <td className="px-3 py-3">{formatWhen(item.createdAt)}</td>
                  <td className="px-3 py-3"><CodeActions item={item} /></td>
                </tr>
              ))}
              {codes.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">没有兑换码</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {(page > 0 || hasMore) && (
          <div className="mt-3 flex items-center justify-between">
            <button type="button" disabled={page === 0 || loading} onClick={() => void load(page - 1)} className="h-11 rounded-lg border px-3 text-sm disabled:opacity-40">上一页</button>
            <span className="text-sm text-slate-500">第 {page + 1} 页</span>
            <button type="button" disabled={!hasMore || loading} onClick={() => void load(page + 1)} className="h-11 rounded-lg border px-3 text-sm disabled:opacity-40">下一页</button>
          </div>
        )}

        {history && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex justify-between">
              <h3 className="text-sm font-semibold">使用记录</h3>
              <button type="button" onClick={() => setHistory(null)} className="text-sm text-slate-500">关闭</button>
            </div>
            {history.length === 0 ? <p className="text-sm text-slate-400">暂无记录</p> : (
              <ul className="space-y-2 text-sm text-slate-600">
                {history.map((item) => (
                  <li key={item.id}>{item.code} · 用户 {item.userId ?? '-'} · {vipTypeLabel(item.vipType)} · {formatWhen(item.createdAt)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
