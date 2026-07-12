import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, FileText, Lightbulb, Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { ReanalyzeButton } from '@/components/jobs/reanalyze-button'
import { getCurrentUser } from '@/lib/auth/current-user'
import type { JdMatchSectionSuggestion } from '@/lib/seo/jd-match'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: '岗位匹配分析', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface AnalysisPageProps { readonly params: Promise<{ id: string }> }
interface AnalysisSnapshot {
  readonly score: number
  readonly baselineScore: number
  readonly currentScore: number
  readonly matchedKeywords: readonly string[]
  readonly transferableKeywords?: readonly string[]
  readonly missingKeywords: readonly string[]
  readonly prioritySuggestions: readonly string[]
  readonly sectionSuggestions: readonly JdMatchSectionSuggestion[]
  readonly nextActions: readonly string[]
  readonly analyzedAt?: string
}

function parseAnalysis(value: unknown): AnalysisSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (typeof item.score !== 'number' || !Array.isArray(item.matchedKeywords) || !Array.isArray(item.missingKeywords)) return null
  return item as unknown as AnalysisSnapshot
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/analysis`)
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { tailoredResume: { select: { id: true } }, factSet: { select: { confirmedAt: true } } },
  })
  if (!job) notFound()
  if (!job.factSet.confirmedAt) redirect(`/dashboard/jobs/${job.id}/facts`)
  const analysis = parseAnalysis(job.matchSnapshot)
  if (!analysis) redirect(`/dashboard/jobs/${job.id}/facts`)

  return (
    <JobPageShell>
      <Link href={`/dashboard/jobs/${job.id}`} className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"><ArrowLeft className="h-4 w-4" />返回岗位详情</Link>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-800">岗位匹配分析</h1><p className="mt-1 text-sm text-slate-500">{job.company ? `${job.company} · ` : ''}{job.role}</p></div><ReanalyzeButton jobId={job.id} /></header>
      <div className="mb-6 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white text-center text-sm"><div className="px-3 py-3 text-slate-400">1 岗位信息</div><div className="border-l border-slate-100 px-3 py-3 text-slate-400">2 确认事实</div><div className="border-l border-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-3 font-medium text-white">3 分析与优化</div><div className="border-l border-slate-100 px-3 py-3 text-slate-400">4 编辑与导出</div></div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-white bg-white/90 p-6 text-center shadow-sm"><div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-violet-100 bg-violet-50 text-4xl font-bold text-violet-700">{analysis.score}</div><h2 className="mt-4 font-semibold text-slate-800">基础内容覆盖</h2><p className="mt-2 text-xs leading-5 text-slate-400">该分数只表示已确认事实对 JD 关键词的覆盖，不代表面试或录用概率。</p></section>
          <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5"><h3 className="font-medium text-slate-800">下一步</h3><p className="mt-2 text-sm leading-6 text-slate-500">基于已确认事实生成逐条建议，审核后再写入岗位简历。你也可以跳过 AI，直接编辑。</p><Button asChild className="mt-4 w-full bg-violet-600 text-white hover:bg-violet-700"><Link href={`/dashboard/jobs/${job.id}/tailor`}><Sparkles />生成岗位建议</Link></Button>{job.tailoredResume && <Button asChild variant="outline" className="mt-2 w-full border-violet-200 bg-white text-violet-700"><Link href={`/editor/${job.tailoredResume.id}`}><FileText />跳过 AI，直接编辑</Link></Button>}</section>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3"><section className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><h2 className="font-semibold text-slate-800">直接证据</h2></div><div>{analysis.matchedKeywords.length > 0 ? analysis.matchedKeywords.map((keyword) => <span key={keyword} className="mb-2 mr-2 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{keyword}</span>) : <p className="text-sm text-slate-400">暂未发现原词直接对应</p>}</div></section><section className="rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-blue-500" /><h2 className="font-semibold text-slate-800">可迁移证据</h2></div><div>{(analysis.transferableKeywords?.length ?? 0) > 0 ? analysis.transferableKeywords?.map((keyword) => <span key={keyword} className="mb-2 mr-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{keyword}</span>) : <p className="text-sm text-slate-400">暂未发现需要转换表达的相邻能力</p>}</div></section><section className="rounded-2xl border border-amber-100 bg-white/90 p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" /><h2 className="font-semibold text-slate-800">待确认或缺失</h2></div><div>{analysis.missingKeywords.map((keyword) => <span key={keyword} className="mb-2 mr-2 inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{keyword}</span>)}</div></section></div>
          <section className="rounded-2xl border border-white bg-white/90 p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-violet-500" /><h2 className="font-semibold text-slate-800">优先调整建议</h2></div><div className="space-y-3">{analysis.prioritySuggestions.map((suggestion, index) => <div key={suggestion} className="flex gap-3 rounded-xl bg-slate-50 p-4"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{index + 1}</span><p className="text-sm leading-6 text-slate-600">{suggestion}</p></div>)}</div></section>
          <section className="rounded-2xl border border-white bg-white/90 p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-fuchsia-500" /><h2 className="font-semibold text-slate-800">按模块检查</h2></div><div className="grid gap-4 lg:grid-cols-3">{analysis.sectionSuggestions.map((item) => <div key={item.section} className="rounded-xl border border-slate-100 p-4"><h3 className="font-medium text-slate-800">{item.section}</h3><p className="mt-2 text-xs leading-5 text-amber-700">{item.issue}</p><p className="mt-3 text-sm leading-6 text-slate-500">{item.suggestion}</p></div>)}</div></section>
          <div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href={`/dashboard/jobs/${job.id}/facts`}><ArrowLeft />重新选择事实</Link></Button><Button asChild className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-white hover:from-violet-700 hover:to-fuchsia-600"><Link href={`/dashboard/jobs/${job.id}/tailor`}>生成并审核 AI 建议<ArrowRight /></Link></Button></div>
        </div>
      </div>
    </JobPageShell>
  )
}
