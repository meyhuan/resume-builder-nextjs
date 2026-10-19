'use client'

import { useEffect, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Clipboard,
  Copy,
  Check,
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Target,
  FileText,
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
import { MobileToolHeader } from '../_components/mobile-tool-header'
import { track } from '@/lib/analytics'

const HISTORY_KIND = 'jd-analysis'

const WAITING_MESSAGES = [
  'AI 正在解析目标岗位核心要求…',
  '正在比对简历经历与技能关键词…',
  '正在计算 ATS 契合度与优化建议…',
] as const

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
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResume?.id || '')
  const [currentResume, setCurrentResume] = useState<{
    id: string
    title: string
    content: ResumeData
  } | null>(initialResume)

  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [waitingStep, setWaitingStep] = useState(0)
  const [result, setResult] = useState<JdAnalysisOutput | null>(null)
  const [selectedMissingWord, setSelectedMissingWord] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(0)
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem<JdAnalysisOutput>[]>([])
  const [showHistorySheet, setShowHistorySheet] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [, startSwitchResume] = useTransition()

  // Load history from IndexedDB on mount
  useEffect(() => {
    if (!currentResume?.id) return
    void listAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, currentResume.id).then((items) => {
      setHistoryList(items)
    })
  }, [currentResume?.id])

  // Cycle waiting messages
  useEffect(() => {
    if (!isAnalyzing) return
    const timer = setInterval(() => {
      setWaitingStep((prev) => (prev + 1) % WAITING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [isAnalyzing])

  // Switch resume
  const handleSelectResume = async (resumeId: string): Promise<void> => {
    if (resumeId === selectedResumeId) return
    setSelectedResumeId(resumeId)
    startSwitchResume(async () => {
      try {
        const fetched = await fetchInterviewPrepResume(resumeId)
        setCurrentResume({
          id: resumeId,
          title: fetched.title,
          content: fetched.resume,
        })
        const items = await listAnalysisHistory<JdAnalysisOutput>(HISTORY_KIND, resumeId)
        setHistoryList(items)
        toast.success(`已切换至简历「${fetched.title}」`)
      } catch {
        toast.error('切换简历失败，请稍后重试')
      }
    })
  }

  // Paste from clipboard
  const handlePasteClipboard = async (): Promise<void> => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.info('浏览器不支持自动读取剪贴板，请长按文本框粘贴')
        return
      }
      const text = await navigator.clipboard.readText()
      if (!text || !text.trim()) {
        toast.info('剪贴板中没有文字内容')
        return
      }
      setJobDescription((prev) => (prev ? `${prev}\n\n${text.trim()}` : text.trim()).slice(0, MAX_JD_ANALYSIS_JD_LENGTH))
      toast.success('已填入剪贴板内容')
    } catch {
      toast.info('未获取到剪贴板权限，请长按输入框直接粘贴')
    }
  }

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

    setIsAnalyzing(true)
    setWaitingStep(0)
    track('ai_assist_start', {
      feature: 'jd-match',
      resumeId: currentResume.id,
      source,
    })

    try {
      const response = await fetch('/next-api/ai/jd-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: currentResume.content,
          jobDescription: trimmedJd.slice(0, MAX_JD_ANALYSIS_JD_LENGTH),
        }),
      })

      const raw = await response.text()
      let data: JdAnalysisOutput & { error?: string }
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error('服务返回结果异常，请稍后重试')
      }

      if (!response.ok) {
        throw new Error(data.error || '分析失败，请稍后重试')
      }

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
      setHistoryList(updated)

      track('ai_assist_success', {
        feature: 'jd-match',
        resumeId: currentResume.id,
        overallScore: data.overallScore,
        atsScore: data.atsScore,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '分析失败，请重试'
      toast.error(msg)
      track('ai_assist_failed', { feature: 'jd-match', error: msg })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Restore history
  const handleRestoreHistory = (item: AnalysisHistoryItem<JdAnalysisOutput>): void => {
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
        subtitle={currentResume?.title || '测匹配度 & 补关键词'}
        returnTo={returnTo}
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

      <main className="mx-auto flex w-full max-w-lg flex-col px-3 py-3 space-y-3">
        {/* Resume Selector */}
        {resumeOptions.length > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText size={16} className="text-violet-600 shrink-0" />
              <span className="text-xs text-slate-500 shrink-0">当前简历:</span>
              <span className="truncate text-xs font-semibold text-slate-800">
                {currentResume?.title || '未命名简历'}
              </span>
            </div>
            <div className="relative shrink-0">
              <select
                aria-label="切换简历"
                value={selectedResumeId}
                onChange={(e) => void handleSelectResume(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              >
                {resumeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-violet-600"
              >
                <span>切换</span>
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        ) : null}

        {/* JD Input Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen size={16} className="text-violet-600" />
              <span className="text-sm font-semibold text-slate-900">目标岗位 JD</span>
              <span className="text-xs text-rose-500 font-medium">*必填</span>
            </div>
            <button
              type="button"
              onClick={() => void handlePasteClipboard()}
              className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 active:bg-violet-100"
            >
              <Clipboard size={12} />
              <span>读取剪贴板</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_ANALYSIS_JD_LENGTH))}
              placeholder="在此粘贴 BOSS直聘 / 猎聘 / 智联 上的岗位职责与任职要求..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">
              {jobDescription.length}/{MAX_JD_ANALYSIS_JD_LENGTH}
            </span>
          </div>

          <button
            type="button"
            disabled={isAnalyzing || !currentResume || !jobDescription.trim()}
            onClick={() => void handleAnalyze()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
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
        </div>

        {/* Loading waiting state */}
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-100 bg-violet-50/50 p-6 text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mb-3" />
            <p className="text-sm font-semibold text-violet-900 transition-all">
              {WAITING_MESSAGES[waitingStep]}
            </p>
            <p className="mt-1 text-xs text-violet-600/80">正在逐行比对技能词，约需 5~8 秒</p>
          </div>
        ) : null}

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
                  <span className="font-semibold text-slate-900">📌 诊断综述：</span>
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
                  <p className="text-xs text-emerald-600">🎉 恭喜！未发现核心硬技能词缺失。</p>
                )}

                {/* Selected Missing Word Prompt Card */}
                {selectedMissingWord ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">
                        💡 如何补充「{selectedMissingWord}」？
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
                                <span className="font-bold text-emerald-700">✨ 建议改法：</span>
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
                                onClick={() => router.push(`/m/edit?id=${encodeURIComponent(currentResume.id)}`)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline pt-1"
                              >
                                <span>前往简历编辑主页应用修改</span>
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
