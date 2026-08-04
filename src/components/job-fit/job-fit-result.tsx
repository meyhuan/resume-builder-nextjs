'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronRight, Eye, EyeOff, Info } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { JobFitChange, JobFitChangeCategory, JobFitScoring, JobFitSummary } from '@/lib/job-fit/types'
import ReadOnlyResumeRenderer from '@/components/resume/read-only-resume-renderer'
import { track } from '@/lib/analytics'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { JobFitClaim, SubmissionReadiness } from '@meyhuan/job-fit-engine/contracts'

interface Props {
  readonly taskId: string
  readonly companyName?: string
  readonly jobTitle: string
  readonly sourceResumeId: string
  readonly tailoredResumeId: string
  readonly templateId: string
  readonly originalResume: ResumeData
  readonly optimizedResume: ResumeData
  readonly scoring: JobFitScoring
  readonly summary: JobFitSummary
  readonly changes: readonly JobFitChange[]
  readonly claims: readonly JobFitClaim[]
  readonly readiness: SubmissionReadiness
  readonly optimizationMode: 'PROFESSIONAL' | 'SPRINT'
}

const CATEGORY = {
  KEYWORD: { label: '关键词匹配', chip: 'bg-violet-100 text-violet-700', border: 'border-violet-400' },
  CAPABILITY: { label: '能力匹配', chip: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400' },
  EXPERIENCE: { label: '经历强化', chip: 'bg-amber-100 text-amber-700', border: 'border-amber-400' },
} as const

export default function JobFitResult(props: Props): ReactElement {
  const [version, setVersion] = useState<'optimized' | 'original'>('optimized')
  const [showDiff, setShowDiff] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const selected = props.changes.find((change) => change.id === selectedId) ?? null
  const inferredCount = props.claims.filter((claim) => claim.status === 'AI_INFERRED').length
  const estimatedCount = props.claims.filter((claim) => claim.status === 'AI_ESTIMATED').length
  const displayedResume = useMemo(() => {
    const resume = structuredClone(version === 'optimized' ? props.optimizedResume : props.originalResume)
    return showDiff ? decorateResume(resume, props.changes, version) : resume
  }, [props.changes, props.optimizedResume, props.originalResume, showDiff, version])

  useEffect(() => { track('job_fit_result_view', { taskId: props.taskId, changeCount: props.changes.length }) }, [props.changes.length, props.taskId])

  function changeVersion(next: 'optimized' | 'original'): void {
    const element = previewRef.current
    const ratio = element && element.scrollHeight > element.clientHeight ? element.scrollTop / (element.scrollHeight - element.clientHeight) : 0
    setVersion(next)
    track('job_fit_version_switch', { taskId: props.taskId, version: next })
    requestAnimationFrame(() => { if (element) element.scrollTop = ratio * Math.max(0, element.scrollHeight - element.clientHeight) })
  }

  function openFromTarget(target: EventTarget | null): void {
    const element = target instanceof Element ? target.closest<HTMLElement>('[data-job-fit-change-id]') : null
    const id = element?.dataset.jobFitChangeId
    if (!id) return
    setSelectedId(id)
    track('job_fit_change_open', { taskId: props.taskId, changeId: id })
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') openFromTarget(event.target)
    if (event.key === 'Escape') setSelectedId(null)
  }

  function scrollToCategory(category: JobFitChangeCategory): void {
    const target = previewRef.current?.querySelector<HTMLElement>(`[data-job-fit-category="${category}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.focus({ preventScroll: true })
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <header className="border-b border-slate-100 bg-white px-5 py-5 md:px-6">
        <p className="text-xs font-medium text-violet-600">岗位定制&nbsp; / &nbsp;已生成</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div><h1 className="text-[28px] font-bold text-slate-900">{props.optimizedResume.name || '你的'}，你的岗位版简历已生成</h1><p className="mt-2 text-[13px] text-slate-500">{props.jobTitle}{props.companyName ? ` · ${props.companyName}` : ''} · 基于原简历生成独立岗位版本</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">✓ 内容完整，可直接投递</span>{props.readiness === 'READY_WITH_INFERENCES' ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">AI 推断 {inferredCount} 处{estimatedCount ? ` · 估算 ${estimatedCount} 处` : ''}</span> : null}</div></div>
          <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-medium text-emerald-600">已自动保存</span><Link onClick={() => track('job_fit_editor_open', { taskId: props.taskId })} href={`/editor/${props.tailoredResumeId}?source=job-fit&taskId=${props.taskId}`} className="flex h-11 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white hover:bg-violet-700">进入编辑器<ArrowRight className="ml-2 h-4 w-4" /></Link><span className="text-[11px] text-slate-500">可继续修改并导出 PDF</span><Link href={`/dashboard/job-fit?resumeId=${props.sourceResumeId}`} className="text-sm font-medium text-slate-500 hover:text-violet-600">重新定制</Link></div>
        </div>
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:p-6">
        <aside className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-900">岗位匹配度预估</p><p className="mt-1 text-[11px] text-slate-400">基于 JD 与原简历证据，不代表录用概率</p><div className="mt-5 text-center"><span className="text-5xl font-bold text-slate-900">{props.scoring.optimized}</span><span className="text-sm text-slate-400"> / 100</span></div><div className="mt-5 grid grid-cols-3 rounded-xl bg-slate-50 p-3 text-center"><Metric label="原始" value={`${props.scoring.original}`} /><Metric label="提升" value={`${props.scoring.improvement >= 0 ? '+' : ''}${props.scoring.improvement}`} accent /><Metric label="改动" value={`${props.changes.length}处`} /></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Info className="h-4 w-4 text-violet-600" />为什么不是 100 分？</div><p className="mt-2 text-xs leading-5 text-slate-500">{props.optimizationMode === 'SPRINT' ? '冲刺增强会补强相邻能力和合理估算，但不会改动公司、职位、日期和资质等关键履历事实。' : '专业优化优先使用已有事实和可迁移能力，不会为了高分编造关键履历。'}</p></section>
          <section className="space-y-2"><p className="px-1 text-xs font-semibold tracking-wide text-slate-500">优化结果 · 点击定位</p><ScoreButton category="KEYWORD" score={props.scoring.keyword} onClick={scrollToCategory} /><ScoreButton category="CAPABILITY" score={props.scoring.capability} onClick={scrollToCategory} /><ScoreButton category="EXPERIENCE" score={props.scoring.experience} onClick={scrollToCategory} /></section>
          {props.summary.suggestions.length ? <section className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-900">进一步提升建议</p><span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">未自动修改</span><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">{props.summary.suggestions.map((suggestion) => <li key={suggestion} className="flex gap-2"><ChevronRight className="mt-1 h-3 w-3 shrink-0 text-violet-500" />{suggestion}</li>)}</ul></section> : null}
        </aside>

        <main className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:p-5">
          <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between"><div className="grid grid-cols-2 rounded-[10px] bg-slate-100 p-1"><button onClick={() => changeVersion('optimized')} className={`h-9 rounded-lg px-5 text-sm font-medium ${version === 'optimized' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>优化后</button><button onClick={() => changeVersion('original')} className={`h-9 rounded-lg px-5 text-sm font-medium ${version === 'original' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>原简历</button></div><div className="flex flex-wrap items-center gap-3"><button onClick={() => { setShowDiff((value) => !value); track('job_fit_diff_toggle', { taskId: props.taskId, enabled: !showDiff }) }} className={`flex h-9 items-center rounded-lg border px-3 text-xs font-medium ${showDiff ? 'border-violet-300 bg-violet-50 text-violet-600' : 'border-slate-200 text-slate-500'}`}>{showDiff ? <Eye className="mr-1.5 h-4 w-4" /> : <EyeOff className="mr-1.5 h-4 w-4" />}标记 AI 改动</button>{Object.entries(CATEGORY).map(([key, item]) => <span key={key} className={`rounded px-2 py-1 text-[10px] font-medium ${item.chip}`}>{item.label}</span>)}</div></div>
          {selected ? <div className="hidden md:block"><ChangeDetail change={selected} onClose={() => setSelectedId(null)} /></div> : null}
          <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
            <SheetContent side="bottom" className="p-4 md:hidden">
              <SheetTitle className="sr-only">AI 改动详情</SheetTitle>
              {selected ? <ChangeDetail change={selected} onClose={() => setSelectedId(null)} /> : null}
            </SheetContent>
          </Sheet>
          <div ref={previewRef} onClick={(event: MouseEvent<HTMLDivElement>) => openFromTarget(event.target)} onKeyDown={handleKey} className="mt-4 max-h-[calc(100vh-190px)] min-h-[720px] overflow-auto rounded-xl bg-slate-200/60 p-4"><div className="mx-auto min-w-[794px] max-w-[794px] bg-white shadow-sm"><ReadOnlyResumeRenderer resume={displayedResume} templateId={props.templateId} /></div></div>
          <style>{`.job-fit-diff{cursor:pointer;border-radius:4px;outline:1px solid transparent;transition:box-shadow .15s}.job-fit-diff:hover,.job-fit-diff:focus{box-shadow:0 0 0 2px #7c3aed;outline:none}.job-fit-diff-keyword{background:#f5f3ff}.job-fit-diff-capability{background:#ecfdf5}.job-fit-diff-experience{background:#fffbeb}`}</style>
        </main>
      </div>
    </div>
  )
}

function Metric({ label, value, accent = false }: { readonly label: string; readonly value: string; readonly accent?: boolean }): ReactElement { return <div><p className="text-[10px] text-slate-400">{label}</p><p className={`mt-1 text-sm font-bold ${accent ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</p></div> }

function ScoreButton({ category, score, onClick }: { readonly category: JobFitChangeCategory; readonly score: JobFitScoring['keyword']; readonly onClick: (category: JobFitChangeCategory) => void }): ReactElement { const item = CATEGORY[category]; return <button onClick={() => onClick(category)} className={`w-full rounded-xl border bg-white p-4 text-left transition-colors hover:border-violet-300 ${item.border}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-900">{item.label}</span><span className="text-lg font-bold text-slate-900">{score.optimized}</span></div><p className="mt-1 text-[11px] text-slate-500">{score.changeCount} 处改动 · <span className="text-emerald-600">{score.improvement >= 0 ? '+' : ''}{score.improvement}</span></p><p className="mt-2 text-[11px] leading-4 text-slate-400">{score.summary}</p></button> }

function ChangeDetail({ change, onClose }: { readonly change: JobFitChange; readonly onClose: () => void }): ReactElement { return <section className="mt-3 rounded-xl border border-violet-200 bg-white p-4" role="dialog" aria-label="AI 改动详情"><div className="flex items-start justify-between"><div className="flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-[10px] font-medium ${CATEGORY[change.category].chip}`}>{CATEGORY[change.category].label}</span>{change.claimStatus ? <span className={`rounded px-2 py-1 text-[10px] font-medium ${change.claimStatus === 'AI_INFERRED' || change.claimStatus === 'AI_ESTIMATED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{claimLabel(change.claimStatus)}</span> : null}<p className="w-full mt-1 text-sm font-semibold text-slate-900">{change.reason}</p></div><button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700">关闭</button></div><div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-400">原文</p><p className="mt-1 text-xs leading-5 text-slate-600">{change.originalText || '原简历中没有这段内容'}</p></div><div className="rounded-lg bg-violet-50 p-3"><p className="text-[10px] font-semibold text-violet-500">优化后</p><p className="mt-1 text-xs leading-5 text-slate-700">{change.optimizedText}</p></div></div><p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />来源证据：{change.evidence}</p></section> }

function claimLabel(status: NonNullable<JobFitChange['claimStatus']>): string {
  return ({ SOURCE_BACKED: '原简历事实', TRANSFERRED: '可迁移能力', AI_INFERRED: 'AI 推断', AI_ESTIMATED: 'AI 合理估算', USER_EDITED: '用户已修改' } as const)[status]
}

function decorateResume(resume: ResumeData, changes: readonly JobFitChange[], version: 'optimized' | 'original'): ResumeData {
  for (const change of changes) {
    const section = resume.sections.find((item) => item.id === change.sectionId); const block = section?.blocks.find((item) => item.id === change.blockId); if (!block) continue
    const categoryClass = change.category === 'KEYWORD' ? 'job-fit-diff-keyword' : change.category === 'CAPABILITY' ? 'job-fit-diff-capability' : 'job-fit-diff-experience'
    const html = version === 'optimized' ? change.optimizedHtml : change.originalHtml
    const wrapped = `<div class="job-fit-diff ${categoryClass}" data-job-fit-change-id="${change.id}" data-job-fit-category="${change.category}" role="button" tabindex="0" aria-label="查看${CATEGORY[change.category].label}改动详情">${html}</div>`
    if (block.type === 'list' && change.itemId) { const item = block.items.find((candidate) => candidate.id === change.itemId); if (item) item.html = wrapped }
    else if (change.field === 'contentHtml' && (block.type === 'experience' || block.type === 'project' || block.type === 'campus')) (block as { contentHtml: string }).contentHtml = wrapped
    else if (change.field === 'courseHtml' && block.type === 'education') (block as { courseHtml?: string }).courseHtml = wrapped
    else if (change.field === 'html' && block.type === 'text') block.html = wrapped
  }
  return resume
}
