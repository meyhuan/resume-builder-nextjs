'use client'

import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, FileText, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface BaseResumeOption {
  readonly id: string
  readonly title: string
  readonly template: string
  readonly updatedAt: string
}

interface NewJobFormProps {
  readonly resumes: readonly BaseResumeOption[]
}

interface CreateJobResponse {
  readonly jobId?: string
  readonly error?: string
}

const inputClassName = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const labelClassName = 'mb-1.5 block text-sm font-medium text-slate-700'

export function NewJobForm({ resumes }: NewJobFormProps): ReactElement {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [jdLength, setJdLength] = useState(0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)

    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const response = await fetch('/next-api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json() as CreateJobResponse
      if (!response.ok || !data.jobId) throw new Error(data.error || '创建岗位失败')

      toast.success('目标岗位已创建', { description: '母版已复制为独立岗位简历' })
      router.push(`/dashboard/jobs/${data.jobId}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建岗位失败，请稍后重试')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white text-center text-sm">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-3 font-medium text-white">1 岗位信息</div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">2 确认事实</div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">3 分析与优化</div>
        <div className="border-l border-slate-100 px-3 py-3 text-slate-400">4 编辑与导出</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BriefcaseBusiness /></div>
            <div><h2 className="font-semibold text-slate-800">岗位信息</h2><p className="text-sm text-slate-500">先保存真实 JD，后续分析和材料都围绕它展开。</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClassName}>公司名称</span><input className={inputClassName} name="company" maxLength={80} placeholder="例如：星河科技" /></label>
            <label><span className={labelClassName}>职位名称 *</span><input className={inputClassName} name="role" maxLength={80} required placeholder="例如：高级产品经理" /></label>
            <label><span className={labelClassName}>岗位来源</span><select className={inputClassName} name="source" defaultValue=""><option value="">请选择</option><option>BOSS 直聘</option><option>猎聘</option><option>招聘官网</option><option>内推</option><option>其他</option></select></label>
            <label><span className={labelClassName}>工作地点</span><input className={inputClassName} name="location" maxLength={80} placeholder="例如：上海 / 远程" /></label>
            <label><span className={labelClassName}>薪资范围</span><input className={inputClassName} name="salaryRange" maxLength={80} placeholder="例如：25–35K" /></label>
            <label><span className={labelClassName}>原始链接</span><input className={inputClassName} name="sourceUrl" type="url" placeholder="https://..." /></label>
          </div>

          <label className="mt-4 block"><span className={labelClassName}>职位描述 JD *</span><textarea className="min-h-64 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" name="jd" required minLength={50} maxLength={8000} placeholder="粘贴完整的岗位职责、任职要求和加分项……" onChange={(event) => setJdLength(event.target.value.length)} /><span className="mt-1.5 block text-xs text-slate-400">{jdLength}/8000 字，至少 50 字</span></label>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-violet-500" /><h2 className="font-semibold text-slate-800">选择母版简历</h2></div>
            <label><span className={labelClassName}>母版 *</span><select className={inputClassName} name="baseResumeId" required defaultValue={resumes[0]?.id ?? ''}><option value="" disabled>请选择一份母版</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}</select></label>
            {resumes[0] && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">会复制母版的内容、模板和排版。岗位版本的修改不会影响母版。</p>}
          </section>

          <section className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm backdrop-blur-md">
            <h2 className="mb-3 font-semibold text-slate-800">你的求职身份</h2>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50 has-[:checked]:text-violet-700"><input type="radio" name="identity" value="student" />在校生</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50 has-[:checked]:text-violet-700"><input type="radio" name="identity" value="graduate" />应届生</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2.5 text-sm text-violet-700"><input type="radio" name="identity" value="professional" defaultChecked />职场人士</label>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" /><div><h3 className="font-medium text-slate-800">母版始终保持不变</h3><p className="mt-1 text-sm leading-6 text-slate-500">新岗位会获得独立简历。事实确认和 AI 优化将在下一步进行。</p></div></div>
          </section>
        </aside>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/jobs')}><ArrowLeft />返回岗位列表</Button>
        <Button type="submit" disabled={submitting || resumes.length === 0} className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-600">
          {submitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}{submitting ? '正在创建…' : '创建岗位并继续'}
        </Button>
      </div>
    </form>
  )
}

