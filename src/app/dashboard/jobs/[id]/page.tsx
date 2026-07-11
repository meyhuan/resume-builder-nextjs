import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BriefcaseBusiness, CalendarClock, ExternalLink, Files, FileText, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobActions } from '@/components/jobs/job-actions'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { ApplicationCreateDialog } from '@/components/applications/application-create-dialog'
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge'
import { ApplicationManageDialog } from '@/components/applications/application-manage-dialog'
import { InterviewDialog } from '@/components/interviews/interview-dialog'
import { OutcomeDialog } from '@/components/interviews/outcome-dialog'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { APPLICATION_STATUS_META, isApplicationStatus } from '@/lib/applications/application-contracts'
import { INTERVIEW_RESULT_LABEL, type InterviewResult } from '@/lib/interviews/interview-contracts'

export const metadata: Metadata = { title: '岗位详情', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface JobDetailPageProps {
  readonly params: Promise<{ id: string }>
}

function countJsonArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function applicationStatusLabel(status: string | null): string {
  if (!status) return ''
  return isApplicationStatus(status) ? APPLICATION_STATUS_META[status].label : status
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
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
      materials: { select: { id: true, title: true } },
      applications: {
        orderBy: { appliedAt: 'desc' },
        include: {
          activities: { orderBy: { occurredAt: 'desc' }, take: 5 },
          interviews: { orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }] },
          outcome: true,
        },
      },
      _count: { select: { materials: true } },
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
        <div className="flex flex-wrap gap-2"><JobActions jobId={job.id} archived={job.status === 'ARCHIVED'} /><Button asChild variant="outline" className="rounded-lg border-violet-200 bg-white text-violet-700"><Link href={`/dashboard/jobs/${job.id}/materials`}><Files />求职材料</Link></Button>{job.tailoredResume && <Button asChild className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600"><Link href={`/editor/${job.tailoredResume.id}`}><FileText />打开岗位简历</Link></Button>}</div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">事实快照</p><p className="mt-1 text-xl font-bold text-slate-800">{factCount || '待提取'}</p><p className="mt-1 text-xs text-slate-400">修订 R{job.factSet.revision}</p></div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">已确认事实</p><p className="mt-1 text-xl font-bold text-slate-800">{confirmedFactCount || '待确认'}</p><p className="mt-1 text-xs text-slate-400">{job.factSet.confirmedAt ? '事实已确认' : '等待用户确认'}</p></div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">岗位简历</p><p className="mt-1 text-xl font-bold text-slate-800">{job.tailoredResume ? '已创建' : '未创建'}</p><p className="mt-1 text-xs text-slate-400">{job.tailoredResume?.template ?? '—'}</p></div>
        <div className="rounded-xl border border-white bg-white/80 p-4 shadow-sm"><p className="text-xs text-slate-400">求职材料</p><p className="mt-1 text-xl font-bold text-slate-800">{job._count.materials} / 5</p><p className="mt-1 text-xs text-slate-400">自我介绍、求职信等</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-800">职位描述</h2>{job.sourceUrl && <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700">查看原岗位<ExternalLink className="h-3.5 w-3.5" /></a>}</div><div className="max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{job.jd}</div></section>
          <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md"><h2 className="mb-4 font-semibold text-slate-800">岗位资料</h2><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-400">求职身份</dt><dd className="mt-1 font-medium text-slate-700">{job.identity === 'student' ? '在校生' : job.identity === 'graduate' ? '应届生' : '职场人士'}</dd></div><div><dt className="text-slate-400">薪资范围</dt><dd className="mt-1 font-medium text-slate-700">{job.salaryRange || '未填写'}</dd></div><div><dt className="text-slate-400">母版简历</dt><dd className="mt-1 font-medium text-slate-700">{job.baseResume?.title || '原母版已删除'}</dd></div><div><dt className="text-slate-400">岗位来源</dt><dd className="mt-1 font-medium text-slate-700">{job.source || '未填写'}</dd></div></dl></section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm"><Sparkles /></div><h2 className="font-semibold text-slate-800">{job.factSet.confirmedAt ? '查看岗位匹配分析' : '确认可用于分析的真实事实'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{job.factSet.confirmedAt ? '已基于你确认的事实完成确定性关键词分析，可以随时重新分析。' : '选择哪些母版经历可以用于当前岗位，联系方式等个人信息不会进入事实集。'}</p><Button asChild className="mt-4 w-full rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Link href={job.factSet.confirmedAt && job.matchSnapshot ? `/dashboard/jobs/${job.id}/analysis` : `/dashboard/jobs/${job.id}/facts`}>{job.factSet.confirmedAt && job.matchSnapshot ? '查看匹配分析' : '开始确认事实'}</Link></Button></section>
          <section className="rounded-2xl border border-white bg-white/85 p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-800">当前流程</h2><ol className="space-y-4 text-sm"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span><div><p className="font-medium text-slate-700">保存岗位信息</p><p className="text-xs text-slate-400">已完成</p></div></li><li className="flex gap-3"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${job.factSet.confirmedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>{job.factSet.confirmedAt ? '✓' : '2'}</span><div><p className="font-medium text-slate-700">确认真实事实</p><p className="text-xs text-slate-400">{job.factSet.confirmedAt ? `已确认 ${confirmedFactCount} 条` : '当前步骤'}</p></div></li><li className="flex gap-3"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${job.matchSnapshot ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{job.matchSnapshot ? '✓' : '3'}</span><div><p className="font-medium text-slate-700">岗位匹配分析</p><p className="text-xs text-slate-400">{job.matchSnapshot ? '已完成' : '待完成'}</p></div></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">4</span><div><p className="font-medium text-slate-700">编辑与导出</p><p className="text-xs text-slate-400">岗位简历可编辑</p></div></li></ol></section>
        </aside>
      </div>
      <section className="mt-6 rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-md">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-800">投递记录与时间线</h2><p className="mt-1 text-sm text-slate-500">记录实际使用的简历、材料、渠道和每一次状态变化。</p></div><ApplicationCreateDialog jobId={job.id} resumeId={job.tailoredResume?.id ?? null} materials={job.materials} /></div>
        {job.applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center"><p className="text-sm text-slate-500">还没有投递记录。完成投递后在这里建立时间线。</p></div>
        ) : (
          <div className="space-y-4">
            {job.applications.map((application) => (
              <article key={application.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-slate-800">{application.channel}</h3><ApplicationStatusBadge status={application.status} /></div>
                    <p className="mt-1 text-xs text-slate-400">投递于 {new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(application.appliedAt)}{application.contactName ? ` · 联系人 ${application.contactName}` : ''}</p>
                    {application.note && <p className="mt-2 text-sm leading-6 text-slate-600">{application.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {application.nextActionAt && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">下次跟进：{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(application.nextActionAt)}</span>}
                    <InterviewDialog applicationId={application.id} />
                    <OutcomeDialog applicationId={application.id} outcome={application.outcome ? { result: application.outcome.result, replyReceived: application.outcome.replyReceived, interviewReached: application.outcome.interviewReached, offerReceived: application.outcome.offerReceived, reasonCodes: jsonStringArray(application.outcome.reasonCodes), note: application.outcome.note } : null} />
                    <ApplicationManageDialog application={{ id: application.id, status: application.status, channel: application.channel, contactName: application.contactName, contactInfo: application.contactInfo, nextActionAt: application.nextActionAt?.toISOString() ?? null, note: application.note }} />
                  </div>
                </div>
                {application.interviews.length > 0 && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {application.interviews.map((interview) => (
                      <div key={interview.id} className="rounded-xl border border-violet-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-700">第 {interview.round} 轮面试</p><p className="mt-1 text-xs text-slate-400">{interview.scheduledAt ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(interview.scheduledAt) : '时间待定'}{interview.interviewer ? ` · ${interview.interviewer}` : ''}</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700">{INTERVIEW_RESULT_LABEL[interview.result as InterviewResult] ?? interview.result}</span></div>
                        {jsonStringArray(interview.questions).length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">问题：{jsonStringArray(interview.questions).join('、')}</p>}
                        {interview.review && <p className="mt-2 text-xs leading-5 text-slate-500">复盘：{interview.review}</p>}
                        <div className="mt-3"><InterviewDialog applicationId={application.id} interview={{ id: interview.id, round: interview.round, scheduledAt: interview.scheduledAt?.toISOString() ?? null, interviewer: interview.interviewer, questions: jsonStringArray(interview.questions), answers: jsonStringArray(interview.answers), review: interview.review, nextActions: jsonStringArray(interview.nextActions), result: interview.result as InterviewResult }} /></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 border-l border-slate-200 pl-4">
                  {application.activities.map((activity) => <div key={activity.id} className="relative mb-3 last:mb-0"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-violet-400 bg-white" /><p className="text-xs text-slate-500">{activity.type === 'STATUS_CHANGE' ? `${activity.fromStatus ? `${applicationStatusLabel(activity.fromStatus)} → ` : ''}${applicationStatusLabel(activity.toStatus)}` : activity.note}</p><p className="mt-0.5 text-[11px] text-slate-400">{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(activity.occurredAt)}</p></div>)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </JobPageShell>
  )
}
