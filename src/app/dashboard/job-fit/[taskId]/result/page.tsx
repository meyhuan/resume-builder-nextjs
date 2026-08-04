import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import type { ResumeData } from '@/entities/resume/resume-data'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import JobFitResult from '@/components/job-fit/job-fit-result'
import type { JobFitChange, JobFitScoring, JobFitSummary } from '@/lib/job-fit/types'
import type { JobFitClaim, SubmissionReadiness } from '@meyhuan/job-fit-engine/contracts'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function JobFitResultPage({ params }: { readonly params: Promise<{ taskId: string }> }) {
  const wxId = (await cookies()).get('auth_uid')?.value
  const { taskId } = await params
  if (!wxId) redirect(`/login?redirect=/dashboard/job-fit/${taskId}/result`)
  const task = await prisma.jobFitTask.findFirst({ where: { id: taskId, user: { wxId } }, include: { sourceResume: true } })
  if (!task) notFound()
  if (task.status !== 'COMPLETED' || !task.sourceSnapshot || !task.optimizedSnapshot || !task.tailoredResumeId || !task.scoring || !task.summary || !task.changes) redirect(`/dashboard/job-fit/${task.id}/processing`)
  const original = normalizeResumeContent(task.sourceSnapshot as unknown as Partial<ResumeData>, { fallbackId: task.sourceResumeId ?? `${task.id}-source` })
  const optimized = normalizeResumeContent(task.optimizedSnapshot as unknown as Partial<ResumeData>, { fallbackId: task.tailoredResumeId })
  return <JobFitResult taskId={task.id} companyName={task.companyName ?? undefined} jobTitle={task.jobTitle ?? '目标岗位'} sourceResumeId={task.sourceResumeId ?? ''} tailoredResumeId={task.tailoredResumeId} templateId={task.sourceResume?.template ?? 'simple'} originalResume={original} optimizedResume={optimized} scoring={task.scoring as unknown as JobFitScoring} summary={task.summary as unknown as JobFitSummary} changes={task.changes as unknown as JobFitChange[]} claims={(task.claims as unknown as JobFitClaim[] | null) ?? []} readiness={(task.readiness as SubmissionReadiness | null) ?? 'READY'} optimizationMode={task.optimizationMode} />
}
