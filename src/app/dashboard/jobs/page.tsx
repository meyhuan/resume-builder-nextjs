import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArrowRight, BriefcaseBusiness, Clock3, FilePlus2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: '目标岗位 - 为每个岗位准备独立简历',
  description: '管理目标岗位、岗位简历和求职材料。',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

interface JobsPageProps {
  readonly searchParams: Promise<{ status?: string; q?: string }>
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value)
}

function getScore(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  const score = (snapshot as Record<string, unknown>).currentScore ?? (snapshot as Record<string, unknown>).score
  return typeof score === 'number' && Number.isFinite(score) ? Math.round(score) : null
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/dashboard/jobs')

  const params = await searchParams
  const statusFilter = params.status === 'archived' ? 'archived' : 'active'
  const query = params.q?.trim().toLocaleLowerCase('zh-CN') ?? ''
  const allJobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      company: true,
      role: true,
      source: true,
      status: true,
      matchSnapshot: true,
      updatedAt: true,
      lastExportedAt: true,
      tailoredResume: { select: { id: true } },
    },
  })

  const filteredJobs = allJobs.filter((job) => {
    const statusMatches = statusFilter === 'archived' ? job.status === 'ARCHIVED' : job.status !== 'ARCHIVED'
    const queryMatches = !query || `${job.company ?? ''} ${job.role}`.toLocaleLowerCase('zh-CN').includes(query)
    return statusMatches && queryMatches
  })
  const preparingCount = allJobs.filter((job) => job.status === 'PREPARING').length
  const readyCount = allJobs.filter((job) => job.status === 'READY').length
  const exportedCount = allJobs.filter((job) => job.status === 'EXPORTED').length
  const archivedCount = allJobs.filter((job) => job.status === 'ARCHIVED').length

  return (
    <JobPageShell>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">目标岗位</h1><p className="mt-1 text-sm text-slate-500">每个岗位都有独立简历，母版内容不会被覆盖。</p></div>
        <Button asChild className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm hover:from-violet-700 hover:to-fuchsia-600"><Link href="/dashboard/jobs/new"><FilePlus2 />新建目标岗位</Link></Button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['准备中', preparingCount, 'text-amber-600'], ['已完成', readyCount, 'text-violet-600'], ['已导出', exportedCount, 'text-emerald-600'], ['已归档', archivedCount, 'text-slate-500']].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur-md"><p className="text-xs font-medium text-slate-400">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white bg-white/85 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button asChild size="sm" variant={statusFilter === 'active' ? 'default' : 'ghost'} className={statusFilter === 'active' ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-slate-500'}><Link href="/dashboard/jobs">进行中</Link></Button>
            <Button asChild size="sm" variant={statusFilter === 'archived' ? 'default' : 'ghost'} className={statusFilter === 'archived' ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-slate-500'}><Link href="/dashboard/jobs?status=archived"><Archive />已归档</Link></Button>
          </div>
          <form className="relative" action="/dashboard/jobs"><input type="hidden" name="status" value={statusFilter} /><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={params.q} placeholder="搜索公司或职位" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-64" /></form>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><BriefcaseBusiness className="h-8 w-8" /></div>
            <h2 className="text-lg font-semibold text-slate-800">{query ? '没有找到匹配的岗位' : statusFilter === 'archived' ? '还没有归档岗位' : '为第一个目标岗位准备独立简历'}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{query ? '尝试搜索其他公司或职位名称。' : '选择一份母版、粘贴 JD，系统会创建独立岗位版本，后续修改不会影响母版。'}</p>
            {!query && statusFilter === 'active' && <Button asChild className="mt-6 rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Link href="/dashboard/jobs/new"><FilePlus2 />新建目标岗位</Link></Button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredJobs.map((job) => {
              const score = getScore(job.matchSnapshot)
              return (
                <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="group grid gap-4 px-5 py-5 transition hover:bg-violet-50/30 md:grid-cols-[minmax(0,1.4fr)_140px_120px_150px_32px] md:items-center">
                  <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate font-semibold text-slate-800 group-hover:text-violet-700">{job.role}</h2><JobStatusBadge status={job.status} /></div><p className="mt-1 truncate text-sm text-slate-500">{job.company || '未填写公司'}{job.source ? ` · ${job.source}` : ''}</p></div>
                  <div><p className="text-xs text-slate-400">内容匹配</p><p className="mt-1 text-sm font-medium text-slate-700">{score === null ? '待分析' : `${score} 分`}</p></div>
                  <div><p className="text-xs text-slate-400">岗位简历</p><p className="mt-1 text-sm font-medium text-slate-700">{job.tailoredResume ? '已创建' : '未创建'}</p></div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{formatDate(job.updatedAt)}</div>
                  <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500 md:block" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </JobPageShell>
  )
}

