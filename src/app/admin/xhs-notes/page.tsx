'use client'

import { useState } from 'react'
import { getStoredAdminPassword, setStoredAdminPassword } from '@/lib/admin-auth'

interface NoteRow {
  id: number
  userId: number
  topicKey: string
  noteUrl: string
  noteId: string
  status: number
  needsManualCheck: boolean
  inviteCode: string
  inviteConversions: number
  createdAt: string
  baseDays: number
  bonusDays: number
}

export default function XhsNotesAdminPage() {
  const [password, setPassword] = useState(getStoredAdminPassword())
  const [queue, setQueue] = useState<'0' | '1'>('0')
  const [rows, setRows] = useState<NoteRow[]>([])
  const [error, setError] = useState('')
  const [reason, setReason] = useState<Record<number, string>>({})
  const [metrics, setMetrics] = useState<Record<number, string>>({})

  async function call(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch('/next-api/admin/xhs-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword: password, action, ...extra }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || (payload && typeof payload.status === 'number' && payload.status !== 100)) {
      throw new Error(payload?.result || payload?.error || '请求失败')
    }
    return payload
  }

  async function load(status = queue) {
    setError('')
    try {
      setStoredAdminPassword(password)
      const payload = await call('list', { status })
      setRows(Array.isArray(payload?.data) ? payload.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    }
  }

  async function act(action: string, id: number, extra: Record<string, unknown> = {}) {
    setError('')
    try {
      await call(action, { id: String(id), ...extra })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">笔记奖励审核</h1>
      <p className="mt-2 text-sm text-gray-500">通过前核对：公开可见、含口令句、非搬运、无违规词。效果数据发布满 48 小时后人工录入。</p>
      <div className="mt-4 flex gap-2">
        <input
          className="rounded border px-3 py-2"
          type="password"
          value={password}
          placeholder="管理密码"
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="rounded bg-violet-600 px-4 py-2 text-white" type="button" onClick={() => void load()}>刷新</button>
        <button className={`rounded px-4 py-2 ${queue === '0' ? 'bg-violet-100 text-violet-800' : 'border'}`} type="button" onClick={() => { setQueue('0'); void load('0') }}>待审核</button>
        <button className={`rounded px-4 py-2 ${queue === '1' ? 'bg-violet-100 text-violet-800' : 'border'}`} type="button" onClick={() => { setQueue('1'); void load('1') }}>已通过，可补发</button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">用户 {row.userId} · {row.topicKey || '未选题'}</div>
                <div className="text-sm text-gray-500">{row.createdAt} · 口令 {row.inviteCode || '无'} · 转化 {row.inviteConversions}</div>
              </div>
              <a className="text-violet-700 underline" href={row.noteUrl} target="_blank" rel="noreferrer">打开笔记</a>
            </div>
            {row.needsManualCheck ? <p className="mt-2 text-sm text-amber-700">短链未能展开，需要人工核对是不是同一篇笔记。</p> : null}
            <p className="mt-2 break-all text-xs text-gray-400">{row.noteId}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === 0 ? <button className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white" type="button" onClick={() => act('approve', row.id)}>通过</button> : null}
              {row.status === 0 ? (
                <>
                  <input
                    className="rounded border px-2 py-1 text-sm"
                    placeholder="拒绝原因"
                    value={reason[row.id] || ''}
                    onChange={(event) => setReason({ ...reason, [row.id]: event.target.value })}
                  />
                  <button className="rounded border px-3 py-1.5 text-sm" type="button" onClick={() => act('reject', row.id, { reason: reason[row.id] || '' })}>拒绝</button>
                </>
              ) : null}
              <button className="rounded border px-3 py-1.5 text-sm" type="button" onClick={() => act('revoke', row.id)}>回收</button>
            </div>
            {row.status === 1 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <input
                  className="w-64 rounded border px-2 py-1"
                  placeholder="浏览,点赞,收藏,评论"
                  value={metrics[row.id] || ''}
                  onChange={(event) => setMetrics({ ...metrics, [row.id]: event.target.value })}
                />
                <button
                  className="rounded border px-3 py-1.5"
                  type="button"
                  onClick={() => {
                    const [views, likes, collects, comments] = (metrics[row.id] || '').split(',').map((part) => part.trim())
                    void act('bonus', row.id, { views, likes, collects, comments })
                  }}
                >
                  录入数据补发
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-gray-500">待审核队列是空的。</p> : null}
      </div>
    </div>
  )
}
