'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminErrorText, adminJava, vipTypeLabel } from '@/lib/admin-java'

interface AdminUser {
  id: number
  name: string | null
  vipStatus: number
  vipType: number | null
  vipExpireTime: string | null
  freeExportCount?: number
}

interface UserPage {
  content: AdminUser[]
  totalPages: number
  totalElements: number
  number: number
  first: boolean
  last: boolean
}

interface VipHistoryItem {
  id: number
  code?: string
  vipType?: number
  vipDuration?: number
  oldVipExpireTime?: string | null
  newVipExpireTime?: string | null
  createdAt?: string
}

interface HistoryPage {
  content: VipHistoryItem[]
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN')
}

export function UserList(props: { onOpenUser: (id: number) => void }): React.ReactElement {
  const [userId, setUserId] = useState('')
  const [vipType, setVipType] = useState('')
  const [vipStatus, setVipStatus] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<UserPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyUserId, setHistoryUserId] = useState<number | null>(null)
  const [history, setHistory] = useState<VipHistoryItem[]>([])
  const [historyError, setHistoryError] = useState('')

  const load = useCallback(async (nextPage: number): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        size: '10',
        sort: 'id,desc',
      })
      if (userId.trim()) params.set('id', userId.trim())
      if (vipType) params.set('vipType', vipType)
      if (vipStatus) params.set('vipStatus', vipStatus)
      const result = await adminJava<UserPage>(`/users?${params.toString()}`)
      setData(result)
      setPage(result.number ?? nextPage)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '用户列表加载失败'))
    } finally {
      setLoading(false)
    }
  }, [userId, vipType, vipStatus])

  useEffect(() => {
    void load(0)
    // Load the first page once. Later fetches go through the filter form and pager.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openHistory(id: number): Promise<void> {
    setHistoryUserId(id)
    setHistory([])
    setHistoryError('')
    try {
      const result = await adminJava<HistoryPage>(`/users/${id}/vip-history?page=0&size=10`)
      setHistory(result.content ?? [])
    } catch (cause: unknown) {
      setHistoryError(adminErrorText(cause, '会员记录加载失败'))
    }
  }

  async function revoke(user: AdminUser): Promise<void> {
    const name = user.name || `用户 ${user.id}`
    if (!window.confirm(`撤销 ${name} 的会员？`)) return
    setError('')
    try {
      await adminJava(`/users/${user.id}/vip`, { method: 'DELETE' })
      await load(page)
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '撤销失败'))
    }
  }

  const users = data?.content ?? []

  function UserActions(actionProps: { user: AdminUser }): React.ReactElement {
    const user = actionProps.user
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => props.onOpenUser(user.id)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:border-violet-300">
          打开
        </button>
        <button type="button" onClick={() => void openHistory(user.id)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:border-violet-300">
          记录
        </button>
        {user.vipStatus === 1 && (
          <button type="button" onClick={() => void revoke(user)} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm text-rose-600 hover:bg-rose-50">
            撤销
          </button>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 md:rounded-2xl md:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">用户列表</h2>
        <p className="text-xs text-slate-400">{data ? `共 ${data.totalElements} 人` : ''}</p>
      </div>

      <form
        className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          void load(0)
        }}
      >
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          inputMode="numeric"
          placeholder="User ID"
          className="col-span-2 min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 sm:col-span-1"
        />
        <select value={vipType} onChange={(event) => setVipType(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm">
          <option value="">全部类型</option>
          <option value="1">月卡</option>
          <option value="2">年卡</option>
          <option value="3">终身</option>
        </select>
        <select value={vipStatus} onChange={(event) => setVipStatus(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm">
          <option value="">全部状态</option>
          <option value="1">有效</option>
          <option value="0">非会员</option>
        </select>
        <button type="submit" className="col-span-2 h-10 w-fit justify-self-start rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 sm:col-span-1">
          {loading ? '筛选中...' : '筛选'}
        </button>
      </form>

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="space-y-3 md:hidden">
        {users.length === 0 && !loading && <p className="py-8 text-center text-sm text-slate-400">没有匹配的用户</p>}
        {users.map((user) => (
          <article key={user.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-slate-800">{user.name || '未命名用户'} · {user.id}</p>
              <span className={user.vipStatus === 1 ? 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700' : 'shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600'}>
                {user.vipStatus === 1 ? vipTypeLabel(user.vipType) : '非会员'}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">到期 {formatWhen(user.vipExpireTime)} · 剩余导出 {user.freeExportCount ?? 0}</p>
            <div className="mt-3">
              <UserActions user={user} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">用户</th>
              <th className="px-3 py-2 font-medium">会员</th>
              <th className="px-3 py-2 font-medium">到期</th>
              <th className="px-3 py-2 font-medium">导出次数</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">没有匹配的用户</td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-3 py-3">{user.id}</td>
                <td className="px-3 py-3">{user.name || '未命名用户'}</td>
                <td className="px-3 py-3">{user.vipStatus === 1 ? vipTypeLabel(user.vipType) : '非会员'}</td>
                <td className="px-3 py-3">{formatWhen(user.vipExpireTime)}</td>
                <td className="px-3 py-3">{user.freeExportCount ?? 0}</td>
                <td className="px-3 py-3"><UserActions user={user} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" disabled={data.first || loading} onClick={() => void load(page - 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">
            上一页
          </button>
          <span className="text-sm text-slate-500">{page + 1} / {data.totalPages}</span>
          <button type="button" disabled={data.last || loading} onClick={() => void load(page + 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-40">
            下一页
          </button>
        </div>
      )}

      {historyUserId !== null && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">用户 {historyUserId} 的兑换记录</h3>
            <button type="button" onClick={() => setHistoryUserId(null)} className="text-sm text-slate-500">关闭</button>
          </div>
          {historyError && <p className="text-sm text-rose-600">{historyError}</p>}
          {history.length === 0 && !historyError && <p className="text-sm text-slate-400">暂无记录</p>}
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{item.code || '兑换'}</span>
                {' · '}{vipTypeLabel(item.vipType)}
                {item.vipDuration ? ` · ${item.vipDuration} 天` : ''}
                <span className="mt-1 block text-xs text-slate-400">
                  {formatWhen(item.createdAt)}
                  {item.newVipExpireTime ? ` · 新到期 ${formatWhen(item.newVipExpireTime)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
