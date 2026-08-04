import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import JobFitProgress from '@/components/job-fit/job-fit-progress'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function JobFitProcessingPage({ params }: { readonly params: Promise<{ taskId: string }> }) {
  const wxId = (await cookies()).get('auth_uid')?.value
  const { taskId } = await params
  if (!wxId) redirect(`/login?redirect=/dashboard/job-fit/${taskId}/processing`)
  const task = await prisma.jobFitTask.findFirst({ where: { id: taskId, user: { wxId } }, select: { id: true, companyName: true, jobTitle: true, status: true, stage: true, progress: true, errorMessage: true, retryable: true, cancelRequestedAt: true } })
  if (!task) notFound()
  if (task.status === 'COMPLETED') redirect(`/dashboard/job-fit/${task.id}/result`)
  return <div className="min-h-screen bg-slate-50 px-5 pb-14 pt-20 md:px-12 md:pt-10"><JobFitProgress initialTask={{ ...task, cancelRequestedAt: task.cancelRequestedAt?.toISOString() ?? null }} /></div>
}
