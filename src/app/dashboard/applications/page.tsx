import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApplicationWorkspace, type ApplicationWorkspaceItem } from '@/components/applications/application-workspace'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: '投递管理', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/dashboard/applications')
  const applications = await prisma.application.findMany({
    where: { job: { userId: user.id, status: { not: 'ARCHIVED' } } },
    orderBy: [{ nextActionAt: 'asc' }, { updatedAt: 'desc' }],
    include: { job: { select: { id: true, company: true, role: true } } },
  })
  const items: ApplicationWorkspaceItem[] = applications.map((item) => ({
    id: item.id,
    status: item.status,
    channel: item.channel,
    appliedAt: item.appliedAt.toISOString(),
    nextActionAt: item.nextActionAt?.toISOString() ?? null,
    contactName: item.contactName,
    note: item.note,
    job: item.job,
  }))
  const dueCount = applications.filter((item) => item.nextActionAt && item.nextActionAt <= new Date() && !['OFFER', 'REJECTED', 'WITHDRAWN'].includes(item.status)).length

  return (
    <JobPageShell>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-800">投递管理</h1><p className="mt-1 text-sm text-slate-500">按阶段管理投递，所有状态变化都会保留在岗位时间线。</p></div><Button asChild className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600"><Link href="/dashboard/jobs"><Plus />从目标岗位添加投递</Link></Button></header>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">全部投递</p><p className="mt-1 text-2xl font-bold text-slate-800">{applications.length}</p></div><div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">面试中</p><p className="mt-1 text-2xl font-bold text-amber-600">{applications.filter((item) => item.status === 'INTERVIEWING').length}</p></div><div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">待跟进</p><p className="mt-1 text-2xl font-bold text-rose-600">{dueCount}</p></div></div>
      {applications.length === 0 && <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700"><BriefcaseBusiness className="h-4 w-4" />请先在目标岗位详情页记录投递。</div>}
      <ApplicationWorkspace initialItems={items} />
    </JobPageShell>
  )
}
