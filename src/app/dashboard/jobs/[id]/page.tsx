import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BriefcaseBusiness, CalendarClock, ExternalLink, FileText, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobActions } from '@/components/jobs/job-actions'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: '岗位详情', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface JobDetailPageProps {
  readonly params: Promise<{ id: string }>
}

function countJsonArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const user = await getCurrentUser()
  const { id } = await params
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}`)

  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: {
      baseResume: { select: { id: true, title: true, updatedAt: true } },
      tailoredResume: { select: { id: true, title: true, template: true, thumbnail: true, updatedAt: true } },
      factSet: { select: { revision: true, facts: true, confirmedFactIds: true, confirmedAt: true } },
    },
  })
  if (!job) notFound()

  const factCount = countJsonArray(job.factSet.facts)
  const confirmedFactCount = countJsonArray(job.factSet.confirmedFactIds)
  const dateText = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(job.updatedAt)

  return (
    <JobPageShell>
      <Link href="/dashboard/jobs" className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-violet-600"><ArrowLeft className="h-4 w-4" />返回目标岗位</Link>
      <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-800">{job.company ? `${job.company} · ` : ''}{job.role}</h1><JobStatusBadge status={job.status} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">{job.source && <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-4 w-4" />{job.source}</span>}{job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>}<span className="inline-flex items-center gap-1"><CalendarClock className="h-4 w-4" />更新于 {dateText}</span></div></div>
        <div className="flex flex-wrap gap-2"><JobActions jobId={job.id} archived={job.status === 'ARCHIVED'} />{job.tailoredResume && <Button asChild className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600"><Link href={`/editor/${job.tailoredResume.id}`}><FileText />打开岗位简历</Link></Button>}</div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">事实快照</p><p className="mt-1 text-xl font-bold text-slate-800">{factCount || '待提取'}</p><p className="mt-1 text-xs text-slate-400">修订 R{job.factSet.revision}</p></div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">已确认事实</p><p className="mt-1 text-xl font-bold text-slate-800">{confirmedFactCount || '待确认'}</p><p className="mt-1 text-xs text-slate-400">{job.factSet.confirmedAt ? '事实已确认' : '下一阶段完成确认'}</p></div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">岗位简历</p><p className="mt-1 text-xl font-bold text-slate-800">{job.tailoredResume ? '已创建' : '未创建'}</p><p className="mt-1 text-xs text-slate-400">{job.tailoredResume?.template ?? '—'}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-800">职位描述</h2>{job.sourceUrl && <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700">查看原岗位<ExternalLink className="h-3.5 w-3.5" /></a>}</div><div className="max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{job.jd}</div></section>
          <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md"><h2 className="mb-4 font-semibold text-slate-800">岗位资料</h2><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">求职身份</dt><dd className="mt-1 font-medium text-slate-700">{job.identity === 'student' ? '在校生' : job.identity === 'graduate' ? '应届生' : '职场人士'}</dd></div><div><dt className="text-slate-400">薪资范围</dt><dd className="mt-1 font-medium text-slate-700">{job.salaryRange || '未填写'}</dd></div><div><dt className="text-slate-400">母版简历</dt><dd className="mt-1 font-medium text-slate-700">{job.baseResume?.title || '原母版已删除'}</dd></div><div><dt className="text-slate-400">岗位来源</dt><dd className="mt-1 font-medium text-slate-700">{job.source || '未填写'}</dd></div></dl></section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm"><Sparkles /></div><h2 className="font-semibold text-slate-800">岗位工作区已建立</h2><p className="mt-2 text-sm leading-6 text-slate-500">岗位信息和独立简历已经保存。事实提取、JD 匹配和建议审核将在下一阶段接入这份工作区。</p>{job.tailoredResume && <Button asChild className="mt-4 w-full rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Link href={`/editor/${job.tailoredResume.id}`}>继续编辑岗位简历</Link></Button>}</section>
          <section className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-800">当前流程</h2><ol className="space-y-4 text-sm"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span><div><p className="font-medium text-slate-700">保存岗位信息</p><p className="text-xs text-slate-400">已完成</p></div></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">2</span><div><p className="font-medium text-slate-700">确认真实事实</p><p className="text-xs text-slate-400">待完成</p></div></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">3</span><div><p className="font-medium text-slate-700">匹配与优化</p><p className="text-xs text-slate-400">待完成</p></div></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">4</span><div><p className="font-medium text-slate-700">编辑与导出</p><p className="text-xs text-slate-400">岗位简历可编辑</p></div></li></ol></section>
        </aside>
      </div>
    </JobPageShell>
  )
}

