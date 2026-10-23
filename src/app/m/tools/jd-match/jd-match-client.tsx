'use client'

import { JdInput } from '../_components/jd-input'

import { useEffect, useRef, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Copy,
  Check,
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  Target,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ResumeData } from '@/entities/resume/resume-data'
import { ScoreCircle } from '@/components/ai/score-circle'
import {
  MAX_JD_ANALYSIS_JD_LENGTH,
  type JdAnalysisOutput,
} from '@/lib/ai/jd-analysis-schema'
import {
  createHistoryId,
  deleteAnalysisHistory,
  listAnalysisHistory,
  saveAnalysisHistory,
  type AnalysisHistoryItem,
} from '@/lib/ai/analysis-history'
import { fetchInterviewPrepResume } from '@/lib/ai/interview-prep-resume'
import { formatJdSuggestionSection } from '@/lib/ai/jd-section-label'
import { resolveJdEditTarget, storeJdEditSuggestion } from '@/lib/ai/jd-edit-target'
import { GenerationFeedback, useGenerationRequest } from '../_components/generation-feedback'
import { useCareerQuota } from '../_components/career-quota'
import { MobileToolHeader } from '../_components/mobile-tool-header'
import { track } from '@/lib/analytics'

const HISTORY_KIND = 'jd-analysis'



interface ResumeOption {
  readonly id: string
  readonly title: string
}

interface MobileJdMatchClientProps {
  readonly initialResume: {
    readonly id: string
    readonly title: string
    readonly content: ResumeData
  } | null
  readonly resumeOptions: readonly ResumeOption[]
  readonly returnTo?: string
  readonly source?: string
}

export default function MobileJdMatchClient({
  initialResume,
  resumeOptions,
  returnTo,
  source = 'web',
}: MobileJdMatchClientProps): ReactElement {
  const router = useRouter()
  const quota = useCareerQuota()
  const generation = useGenerationRequest()
  const resumeSwitch = useRef(0)
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResume?.id || '')
  const [currentResume, setCurrentResume] = useState<{
    id: string
    title: string
    content: ResumeData
  } | null>(initialResume)

  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<JdAnalysisOutput | null>(null)
  const [selectedMissingWord, setSelectedMissingWord] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(0)
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem<JdAnalysisOutput>[]>([])
  const [showHistorySheet, setShowHistorySheet] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isSwitchingResume, startSwitchResume] = useTransition()

  // Load history from IndexedDB on mount
  useEffect(() => {
    if (!currentResume?.id) return
    void listAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, currentResume.id).then((items) => {
      setHistoryList(items)
    })
  }, [currentResume?.id])

  // Switch resume
  const handleSelectResume = async (resumeId: string): Promise<void> => {
    if (resumeId === selectedResumeId) return
    generation.cancel()
    setIsAnalyzing(false)
    const switchId = ++resumeSwitch.current
    setSelectedResumeId(resumeId)
    startSwitchResume(async () => {
      try {
        const fetched = await fetchInterviewPrepResume(resumeId)
        if (switchId !== resumeSwitch.current) return
        setResult(null)
        setCurrentResume({
          id: resumeId,
          title: fetched.title,
          content: fetched.resume,
        })
        const items = await listAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, resumeId)
        setHistoryList(items)
        toast.success(`已切换至简历「${fetched.title}」`)
      } catch {
        if (switchId !== resumeSwitch.current) return
        setSelectedResumeId(currentResume?.id || '')
        toast.error('切换简历失败，请稍后重试')
      }
    })
  }

  // Paste from clipboard
  // Copy helper
  const handleCopy = async (text: string, key: string, label = '内容已复制'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([15])
      }
      setCopiedKey(key)
      toast.success(label)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.error('复制失败，请手动长按复制')
    }
  }

  // Run analysis
  const handleAnalyze = async (): Promise<void> => {
    if (!currentResume?.content?.sections) {
      toast.error('请先选择一份包含内容的简历')
      return
    }

    const trimmedJd = jobDescription.trim()
    if (!trimmedJd) {
      toast.error('请先粘贴目标岗位的职位描述 (JD)')
      return
    }

    if (!quota.allow()) return
    const request = generation.begin()
    setIsAnalyzing(true)
    track('ai_assist_start', {
      feature: 'jd-match',
      resumeId: currentResume.id,
      source,
    })

    try {
      const response = await fetch('/next-api/ai/jd-analysis', {
        signal: request.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: currentResume.content,
          jobDescription: trimmedJd.slice(0, MAX_JD_ANALYSIS_JD_LENGTH),
        }),
      })

      const raw = await response.text()
      let data: JdAnalysisOutput & { error?: string; quotaExceeded?: boolean }
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error('服务返回结果异常，请稍后重试')
      }

      if (!response.ok) {
        if (quota.handleError(data)) return
        throw new Error(data.error || '分析失败，请稍后重试')
      }

      if (request.signal.aborted) return
      setResult(data)
      toast.success('岗位匹配度分析已完成！')

      // Save to IndexedDB history
      const historyItem: AnalysisHistoryItem<JdAnalysisOutput> = {
        id: createHistoryId(),
        createdAt: Date.now(),
        result: data,
        jobDescription: trimmedJd,
        overallScore: data.overallScore,
        atsScore: data.atsScore,
      }
      const updated = await saveAnalysisHistory<JdAnalysisOutput>(
        HISTORY_KIND,
        currentResume.id,
        historyItem,
      )
      if (!request.signal.aborted) setHistoryList(updated)

      track('ai_assist_success', {
        feature: 'jd-match',
        resumeId: currentResume.id,
        overallScore: data.overallScore,
        atsScore: data.atsScore,
      })
    } catch (err: unknown) {
      if (request.signal.aborted) return
      const msg = err instanceof Error ? err.message : '分析失败，请重试'
      toast.error(msg)
      track('ai_assist_failed', { feature: 'jd-match', error: msg })
    } finally {
      quota.refresh()
      if (!request.signal.aborted) setIsAnalyzing(false)
    }
  }

  // Restore history
  const handleRestoreHistory = (item: AnalysisHistoryItem<JdAnalysisOutput>): void => {
    generation.cancel()
    setIsAnalyzing(false)
    setResult(item.result)
    setJobDescription(item.jobDescription || '')
    setShowHistorySheet(false)
    toast.success('已加载历史匹配分析记录')
  }

  // Delete history
  const handleDeleteHistory = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!currentResume?.id) return
    const updated = await deleteAnalysisHistory<JdAnalysisOutput>(
      HISTORY_KIND,
      currentResume.id,
      id,
    )
    setHistoryList(updated)
    toast.success('已删除该条历史记录')
  }

  return (
    <div className="flex flex-col">
      <MobileToolHeader
        title="JD 岗位匹配测试"
        returnTo={returnTo}
        currentResumeTitle={currentResume?.title || '未命名简历'}
        selectedResumeId={selectedResumeId}
        resumeOptions={resumeOptions}
        onSelectResume={(id) => void handleSelectResume(id)}
        rightAction={
          historyList.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowHistorySheet(true)}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 active:bg-slate-200"
            >
              <History size={13} />
              <span>历史 ({historyList.length})</span>
            </button>
          ) : null
        }
      />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-3 space-y-3">
        {/* JD Input Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
          <JdInput value={jobDescription} onChange={setJobDescription} maxLength={MAX_JD_ANALYSIS_JD_LENGTH} />

          {!jobDescription.trim() ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">

              {[
                {
                  label: '技术研发',
                  jd: '岗位职责：1. 负责核心业务系统的架构设计与研发；2. 推动系统性能优化与工程化建设。任职要求：本科及以上学历，熟悉主流技术栈，具备高并发或复杂业务系统落地经验，有良好的跨团队沟通能力。',
                },
                {
                  label: '产品运营',
                  jd: '岗位职责：1. 负责产品核心链路迭代与增长策略落地；2. 通过漏斗分析与 A/B 实验持续提升核心转化率。任职要求：具备敏锐的数据洞察力与项目统筹推进能力，有成功的产品或增长案例。',
                },
                {
                  label: '校招',
                  jd: '岗位职责：参与核心业务模块日常推进、跨团队项目协同与质量标准化落地。任职要求：应届毕业生，具备良好的专业基础、结构化思维与执行力，有相关实习或学术项目成果优先。',
                },
              ].map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setJobDescription(sample.jd)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 active:border-violet-200 active:bg-violet-50 active:text-violet-700"
                >
                  + {sample.label}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={isSwitchingResume || isAnalyzing || !currentResume || !jobDescription.trim()}
            onClick={() => void handleAnalyze()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>分析比对中...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{result ? '重新测算匹配度' : '开始岗位匹配度测试'}</span>
              </>
            )}
          </button>
          {quota.ui}
        </div>

        {/* Empty State Diagnostic Preview */}
        {!result && !isAnalyzing ? (
          <details className="rounded-xl border border-slate-200/80 bg-white p-3 text-xs text-slate-600">
            <summary className="cursor-pointer leading-6">分析内容：岗位匹配 · 关键词 · 修改建议</summary>
            <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">AI 将为你深度诊断 3 大维度</span>
              <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">
                辅助参考
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Target size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">综合契合度 & ATS 初筛预测分</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    对照岗位要求评估经历与关键词覆盖情况，分数仅供完善简历参考。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <CheckCircle2 size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">已命中技能 & 缺失核心关键词雷达</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    逐字比对岗位 JD 硬性要求，精准揪出简历漏掉的高权重关键词，点击缺失词即可查看造句示范。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Lightbulb size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">简历原句 → 优化后对比建议</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    定位到具体模块给出「修改前 vs 修改后」示范句，一键复制并跳回编辑器完成补词闭环。
                  </p>
                </div>
              </div>
            </div>
            </div>
          </details>
        ) : null}

        {isAnalyzing ? <GenerationFeedback label="正在分析简历与岗位要求…" onCancel={() => { generation.cancel(); setIsAnalyzing(false) }} /> : null}

        {/* Results Presentation */}
        {result && !isAnalyzing ? (
          <div className="space-y-3">
            {/* Score Ring Gauge Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-around py-2">
                <ScoreCircle score={result.overallScore} label="综合契合度" />
                <div className="h-14 w-px bg-slate-100" />
                <ScoreCircle score={result.atsScore} label="ATS初筛预测" />
              </div>

              {result.summary ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900 mr-1">
                    <Target size={13} className="text-violet-600" />
                    <span>诊断综述：</span>
                  </span>
                  {result.summary}
                </div>
              ) : null}
            </div>

            {/* Keyword Diagnosis: Matched & Missing */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    已命中技能点 ({result.keywordMatches.length})
                  </span>
                </div>
                {result.keywordMatches.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywordMatches.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200"
                      >
                        <Check size={11} />
                        <span>{word}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">暂未检出与该 JD 强相关的已命中技能</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-900">
                      缺失核心词 ({result.missingKeywords.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">点击词条看补充建议</span>
                </div>

                {result.missingKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => setSelectedMissingWord(word)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                          selectedMissingWord === word
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span>+ {word}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>恭喜！未发现核心硬技能词缺失。</span>
                  </p>
                )}

                {/* Selected Missing Word Prompt Card */}
                {selectedMissingWord ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Lightbulb size={14} className="text-amber-600 shrink-0" />
                        <span>如何补充「{selectedMissingWord}」？</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedMissingWord(null)}
                        className="text-[11px] text-amber-700 active:underline"
                      >
                        收起
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-800">
                      建议在【工作经历】或【项目经历】的业绩描述中，结合 STAR
                      原则引入该技能，例如：“主导 {selectedMissingWord} 落地实施，推动系统性能与交付效率提升 25%”。
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopy(
                          `主导 ${selectedMissingWord} 落地实施，推动系统性能与交付效率提升 25%`,
                          `missing_${selectedMissingWord}`,
                          '推荐句式已复制，可粘贴进经历中润色！',
                        )
                      }
                      className="flex h-8 items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white active:bg-amber-700"
                    >
                      <Copy size={12} />
                      <span>复制推荐润色句</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Targeted Suggestions Checklist */}
            {result.suggestions.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lightbulb size={16} className="text-violet-600" />
                  <span className="text-sm font-bold text-slate-900">
                    针对性修改建议 ({result.suggestions.length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {result.suggestions.map((s, idx) => {
                    const isOpen = expandedSuggestion === idx
                    const copyKey = `sug_${idx}`
                    const isCopied = copiedKey === copyKey
                    const sectionLabel = currentResume?.content
                      ? formatJdSuggestionSection(s.section, currentResume.content, s.blockId)
                      : s.section

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedSuggestion(isOpen ? null : idx)}
                          className="flex w-full items-center justify-between p-3 text-left active:bg-slate-100/70"
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <span className="shrink-0 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              {sectionLabel}
                            </span>
                            <span className="truncate text-xs font-semibold text-slate-800">
                              建议 #{idx + 1}
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-slate-400 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isOpen ? (
                          <div className="border-t border-slate-100 bg-white p-3 space-y-2.5 text-xs leading-relaxed">
                            {s.current ? (
                              <div>
                                <span className="font-semibold text-slate-400">原内容：</span>
                                <p className="mt-0.5 rounded-lg bg-slate-50 p-2 text-slate-600 line-through">
                                  {s.current}
                                </p>
                              </div>
                            ) : null}

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                  <Sparkles size={13} className="text-emerald-600" />
                                  <span>建议改法：</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleCopy(s.suggested, copyKey, '建议改法已复制')}
                                  className="flex items-center gap-1 text-[11px] font-medium text-violet-600 active:text-violet-800"
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                  <span>{isCopied ? '已复制' : '复制改法'}</span>
                                </button>
                              </div>
                              <p className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2 text-emerald-900 whitespace-pre-wrap">
                                {s.suggested}
                              </p>
                            </div>

                            {currentResume?.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const target = resolveJdEditTarget(currentResume.content, s.section, s.blockId)
                                  if (target) {
                                    try { storeJdEditSuggestion(currentResume.id, target, s.suggested) } catch { /* Storage unavailable: the editor remains accessible. */ }
                                  } else {
                                    toast.info('请在编辑页选择对应模块进行修改')
                                  }
                                  router.push(`/m/edit?id=${encodeURIComponent(currentResume.id)}`)
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline pt-1"
                              >
                                <span>前往对应模块修改</span>
                                <ExternalLink size={12} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      {/* History Bottom Sheet */}
      {showHistorySheet ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
          <div className="max-h-[75vh] w-full overflow-hidden rounded-t-3xl bg-white flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-900">历史匹配分析记录</span>
              <button
                type="button"
                onClick={() => setShowHistorySheet(false)}
                className="text-xs text-slate-500 active:text-slate-800"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRestoreHistory(item)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 active:bg-slate-50"
                >
                  <div className="flex flex-col overflow-hidden mr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        {item.overallScore ?? item.result?.overallScore ?? 0}分
                      </span>
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {item.jobDescription
                          ? item.jobDescription.slice(0, 30) + '...'
                          : '岗位匹配记录'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {new Date(item.createdAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteHistory(item.id, e)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
