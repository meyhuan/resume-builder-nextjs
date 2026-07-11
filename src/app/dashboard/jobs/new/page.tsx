import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { NewJobForm } from '@/components/jobs/new-job-form'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: '新建目标岗位', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function NewJobPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/dashboard/jobs/new')

  const resumes = await prisma.resume.findMany({
    where: { userId: user.id, jobId: null },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, template: true, updatedAt: true },
  })

  if (resumes.length === 0) redirect('/dashboard')

  return (
    <JobPageShell>
      <header className="mb-7"><h1 className="text-2xl font-bold text-slate-800">新建目标岗位</h1><p className="mt-1 text-sm text-slate-500">创建岗位专属简历，为之后的事实确认和 JD 优化做好准备。</p></header>
      <NewJobForm resumes={resumes.map((resume) => ({ ...resume, updatedAt: resume.updatedAt.toISOString() }))} />
    </JobPageShell>
  )
}

