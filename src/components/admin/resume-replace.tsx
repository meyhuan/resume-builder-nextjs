'use client'

import { useState } from 'react'
import { adminErrorText, adminJava } from '@/lib/admin-java'

interface ResumeFlat {
  id: number
  uid: number
  name?: string | null
  resumeJson?: string | null
}

interface ResumePreview {
  id: number
  uid: number
  title: string
  personName: string
  email: string
  phone: string
  objective: string
}

function previewResume(resume: ResumeFlat): ResumePreview {
  let personName = ''
  let email = ''
  let phone = ''
  let objective = ''
  if (resume.resumeJson) {
    try {
      const parsed = JSON.parse(resume.resumeJson) as {
        base_info?: { name?: string; mail?: string; phone?: string }
        job_intention?: { objective?: string }
      }
      personName = parsed.base_info?.name ?? ''
      email = parsed.base_info?.mail ?? ''
      phone = parsed.base_info?.phone ?? ''
      objective = parsed.job_intention?.objective ?? ''
    } catch {
      personName = ''
    }
  }
  return {
    id: resume.id,
    uid: resume.uid,
    title: resume.name || '未命名简历',
    personName: personName || '-',
    email: email || '-',
    phone: phone || '-',
    objective: objective || '-',
  }
}

export function ResumeReplace(): React.ReactElement {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [results, setResults] = useState<ResumePreview[]>([])
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function search(): Promise<void> {
    if (!name.trim() && !email.trim() && !phone.trim()) {
      setMessage({ type: 'error', text: '请至少填写姓名、邮箱或手机号' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const resumes = await adminJava<ResumeFlat[]>('/fetchResumeByKeyword', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      })
      setResults((resumes ?? []).map(previewResume))
      if ((resumes ?? []).length === 0) setMessage({ type: 'error', text: '没有找到简历' })
    } catch (cause: unknown) {
      setMessage({ type: 'error', text: adminErrorText(cause, '搜索失败') })
    } finally {
      setLoading(false)
    }
  }

  async function replace(): Promise<void> {
    if (!sourceId.trim() || !targetId.trim()) {
      setMessage({ type: 'error', text: '请填写来源简历 ID 和目标简历 ID' })
      return
    }
    if (!window.confirm('目标简历的内容会被来源简历覆盖，且不能撤销。继续？')) return
    setLoading(true)
    setMessage(null)
    try {
      await adminJava('/replaceResume', {
        method: 'POST',
        body: JSON.stringify({
          sourceId: Number(sourceId),
          targetId: Number(targetId),
        }),
      })
      setMessage({ type: 'success', text: `已用来源 ${sourceId} 覆盖目标 ${targetId}` })
    } catch (cause: unknown) {
      setMessage({ type: 'error', text: adminErrorText(cause, '覆盖失败') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      <h2 className="font-semibold text-slate-800">覆盖简历内容</h2>
      <p className="mt-1 text-sm text-slate-500">按姓名、邮箱或手机号查找 Java 简历，再把一份简历的内容覆盖到另一份。这和上面的账号间复制不同，覆盖不能撤销。</p>

      <form
        className="mt-4 grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱" className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="手机号" className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
        <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
          {loading ? '处理中...' : '搜索'}
        </button>
      </form>

      {message && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message.text}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((resume) => (
            <div key={resume.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-800">{resume.personName} · {resume.title}</p>
                <button type="button" onClick={() => setTargetId(String(resume.id))} className="text-violet-600">用作目标</button>
              </div>
              <p className="mt-1 text-slate-500">简历 ID {resume.id} · 用户 {resume.uid}</p>
              <p className="text-slate-500">{resume.email} · {resume.phone}</p>
              <p className="text-slate-500">意向 {resume.objective}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">覆盖不能撤销</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            来源简历 ID
            <input value={sourceId} onChange={(event) => setSourceId(event.target.value)} inputMode="numeric" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            目标简历 ID
            <input value={targetId} onChange={(event) => setTargetId(event.target.value)} inputMode="numeric" className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
          </label>
        </div>
        <button type="button" onClick={() => void replace()} disabled={loading} className="mt-3 min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
          覆盖目标简历
        </button>
      </div>
    </section>
  )
}
