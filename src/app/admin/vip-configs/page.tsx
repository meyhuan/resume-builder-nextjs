'use client'

import { useEffect, useState } from 'react'
import { adminErrorText, adminJava, vipTypeLabel } from '@/lib/admin-java'

interface VipConfig {
  id?: number
  vipName: string
  vipType: number
  duration: number
  price: number
  status: number
  sort: number
}

const EMPTY_FORM: VipConfig = {
  vipName: '',
  vipType: 1,
  duration: 30,
  price: 0,
  status: 1,
  sort: 0,
}

const DURATION_BY_TYPE: Record<number, number> = { 1: 30, 2: 365, 3: 30000 }

export default function VipConfigsPage(): React.ReactElement {
  const [configs, setConfigs] = useState<VipConfig[]>([])
  const [form, setForm] = useState<VipConfig>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load(): Promise<void> {
    setError('')
    try {
      const result = await adminJava<VipConfig[]>('/vip-configs')
      setConfigs(result ?? [])
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '套餐加载失败'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function edit(config: VipConfig): void {
    setForm({
      id: config.id,
      vipName: config.vipName,
      vipType: config.vipType,
      duration: config.duration,
      price: Number(config.price),
      status: config.status,
      sort: config.sort ?? 0,
    })
    setNotice('')
  }

  async function save(): Promise<void> {
    if (!form.vipName.trim()) {
      setError('请填写套餐名称')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        vipName: form.vipName.trim(),
        vipType: Number(form.vipType),
        duration: Number(form.duration),
        price: Number(form.price),
        status: Number(form.status),
        sort: Number(form.sort),
      }
      if (form.id) {
        await adminJava(`/vip-configs/${form.id}`, { method: 'PUT', body: JSON.stringify({ ...payload, id: form.id }) })
        setNotice('套餐已更新')
      } else {
        await adminJava('/vip-configs', { method: 'POST', body: JSON.stringify(payload) })
        setNotice('套餐已创建')
      }
      setForm(EMPTY_FORM)
      await load()
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '保存失败'))
    } finally {
      setLoading(false)
    }
  }

  async function remove(config: VipConfig): Promise<void> {
    if (!config.id) return
    if (!window.confirm(`删除套餐「${config.vipName}」？`)) return
    setError('')
    try {
      await adminJava(`/vip-configs/${config.id}`, { method: 'DELETE' })
      if (form.id === config.id) setForm(EMPTY_FORM)
      await load()
    } catch (cause: unknown) {
      setError(adminErrorText(cause, '删除失败'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">VIP 套餐</h2>
        <p className="mt-1 text-sm text-slate-500">类型 1 月卡、2 年卡、3 终身。每种类型只能有一条配置。</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
        <h3 className="font-medium text-slate-800">{form.id ? `编辑套餐 #${form.id}` : '新建套餐'}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            名称
            <input value={form.vipName} onChange={(event) => setForm((current) => ({ ...current, vipName: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            类型
            <select
              value={form.vipType}
              onChange={(event) => {
                const vipType = Number(event.target.value)
                setForm((current) => ({ ...current, vipType, duration: DURATION_BY_TYPE[vipType] ?? current.duration }))
              }}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value={1}>月卡</option>
              <option value={2}>年卡</option>
              <option value={3}>终身</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            时长（天）
            <input type="number" min={1} value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            价格
            <input type="number" min={0} step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            状态
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
              <option value={1}>启用</option>
              <option value={0}>停用</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            排序
            <input type="number" min={0} value={form.sort} onChange={(event) => setForm((current) => ({ ...current, sort: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => void save()} disabled={loading} className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY_FORM)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm">取消编辑</button>
          )}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      </section>

      <section className="space-y-3">
        {configs.map((config) => (
          <article key={config.id ?? config.vipType} className="rounded-2xl border border-slate-200 bg-white p-4 md:flex md:items-center md:justify-between">
            <div>
              <p className="font-medium text-slate-800">{config.vipName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {vipTypeLabel(config.vipType)} · {config.duration} 天 · ¥{config.price} · {config.status === 1 ? '启用' : '停用'} · 排序 {config.sort ?? 0}
              </p>
            </div>
            <div className="mt-3 flex gap-2 md:mt-0">
              <button type="button" onClick={() => edit(config)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm">编辑</button>
              <button type="button" onClick={() => void remove(config)} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm text-rose-600">删除</button>
            </div>
          </article>
        ))}
        {configs.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">还没有套餐</p>}
      </section>
    </div>
  )
}
