'use client'

import { useCallback, useEffect, useState, useTransition, type ReactElement } from 'react'
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
  MessageSquare,
  Clock,
  HelpCircle,
  AlertCircle,
  FileText,
  Loader2,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ResumeData } from '@/entities/resume/resume-data'
import {
  MAX_INTERVIEW_PREP_JD_LENGTH,
  type InterviewPrepGreeting,
  type InterviewPrepOutput,
  type InterviewPrepQuestion,
} from '@/lib/ai/interview-prep-schema'
import {
  createInterviewPrepHistoryId,
  deleteInterviewPrepHistory,
  listInterviewPrepHistory,
  resolveInterviewPrepAccountId,
  saveInterviewPrepHistory,
  type InterviewPrepHistoryItem,
} from '@/lib/ai/interview-prep-history'
import { fetchInterviewPrepResume } from '@/lib/ai/interview-prep-resume'
import { MobileToolHeader } from '../_components/mobile-tool-header'
import { track } from '@/lib/analytics'

const WAITING_MESSAGES = [
  'AI 正在阅读简历核心经历…',
  '正在对照岗位要求提炼匹配亮点…',
  '正在组织高情商打招呼语与面试题…',
] as const

const GREETING_META: Record<
  InterviewPrepGreeting['style'],
  { label: string; desc: string; badgeClass: string; borderClass: string }
> = {
  highlight: {
    label: '亮点突出',
    desc: '聚焦量化战绩与核心技能，适合竞争激烈的核心岗位',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-100 hover:border-amber-300',
  },
  polite: {
    label: '诚恳得体',
    desc: '态度谦逊诚恳，突出学习热情与稳定性',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    borderClass: 'border-sky-100 hover:border-sky-300',
  },
  concise: {
    label: '极简直接',
    desc: '短小精炼，直击关键点，适合 HR/猎头快速扫读',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-100 hover:border-emerald-300',
  },
}

const CATEGORY_META: Record<
  InterviewPrepQuestion['category'],
  { label: string; badgeClass: string }
> = {
  hr: { label: 'HR面', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  professional: { label: '专业能力', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  behavioral: { label: '行为情境', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  project: { label: '深度项目', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  weakness: { label: '缺口抗辩', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
}

interface ResumeOption {
  readonly id: string
  readonly title: string
}

interface MobileInterviewPrepClientProps {
  readonly initialResume: {
    readonly id: string
    readonly title: string
    readonly content: ResumeData
  } | null
  readonly resumeOptions: readonly ResumeOption[]
  readonly returnTo?: string
  readonly source?: string
}

type TabType = 'greetings' | 'intro' | 'questions'

export default function MobileInterviewPrepClient({
  initialResume,
  resumeOptions,
  returnTo,
  source = 'web',
}: MobileInterviewPrepClientProps): ReactElement {
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResume?.id || '')
  const [currentResume, setCurrentResume] = useState<{
    id: string
    title: string
    content: ResumeData
  } | null>(initialResume)

  const [jobDescription, setJobDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [waitingStep, setWaitingStep] = useState(0)
  const [result, setResult] = useState<InterviewPrepOutput | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('greetings')
  const [selfIntroVersion, setSelfIntroVersion] = useState<'30s' | '2min'>('30s')
  const [teleprompterMode, setTeleprompterMode] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0)
  const [historyList, setHistoryList] = useState<InterviewPrepHistoryItem[]>([])
  const [showHistorySheet, setShowHistorySheet] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [, startSwitchResume] = useTransition()

  // Load history from IndexedDB on mount
  useEffect(() => {
    const accountId = resolveInterviewPrepAccountId()
    if (accountId) {
      void listInterviewPrepHistory(accountId).then((items) => {
        setHistoryList(items)
      })
    }
  }, [])

  // Cycle waiting messages
  useEffect(() => {
    if (!isGenerating) return
    const timer = setInterval(() => {
      setWaitingStep((prev) => (prev + 1) % WAITING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [isGenerating])

  // Switch resume selector
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
        toast.success(`已切换至简历「${fetched.title}」`)
      } catch (err) {
        toast.error('切换简历失败，请稍后重试')
      }
    })
  }

  // Clipboard read action
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
      setJobDescription((prev) => (prev ? `${prev}\n\n${text.trim()}` : text.trim()).slice(0, MAX_INTERVIEW_PREP_JD_LENGTH))
      toast.success('已填入剪贴板内容')
    } catch {
      toast.info('未获取到剪贴板权限，请长按输入框直接粘贴')
    }
  }

  // Copy helper with feedback
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

  // Trigger generation
  const handleGenerate = async (): Promise<void> => {
    if (!currentResume?.content?.sections) {
      toast.error('请先选择一份包含内容的简历')
      return
    }

    setIsGenerating(true)
    setWaitingStep(0)
    track('ai_assist_start', {
      feature: 'interview-prep',
      resumeId: currentResume.id,
      hasJd: Boolean(jobDescription.trim()),
      source,
    })

    try {
      const response = await fetch('/next-api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: currentResume.content,
          jobDescription: jobDescription.trim().slice(0, MAX_INTERVIEW_PREP_JD_LENGTH),
        }),
      })

      const raw = await response.text()
      let data: InterviewPrepOutput & { error?: string }
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error('服务返回结果异常，请稍后重试')
      }

      if (!response.ok) {
        throw new Error(data.error || '生成失败，请稍后重试')
      }

      setResult(data)
      setActiveTab('greetings')
      toast.success('面试准备已生成！')

      // Save to IndexedDB history
      const accountId = resolveInterviewPrepAccountId()
      if (accountId) {
        const historyItem: InterviewPrepHistoryItem = {
          id: createInterviewPrepHistoryId(),
          createdAt: Date.now(),
          result: data,
          jobDescription: jobDescription.trim(),
          resumeId: currentResume.id,
          resumeTitle: currentResume.title,
        }
        const updated = await saveInterviewPrepHistory(accountId, historyItem)
        setHistoryList(updated)
      }

      track('ai_assist_success', {
        feature: 'interview-prep',
        resumeId: currentResume.id,
        greetingsCount: data.greetings?.length || 0,
        questionsCount: data.questions?.length || 0,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成失败，请重试'
      toast.error(msg)
      track('ai_assist_failed', { feature: 'interview-prep', error: msg })
    } finally {
      setIsGenerating(false)
    }
  }

  // History restore / delete
  const handleRestoreHistory = (item: InterviewPrepHistoryItem): void => {
    setResult(item.result)
    setJobDescription(item.jobDescription || '')
    setShowHistorySheet(false)
    setActiveTab('greetings')
    toast.success('已加载历史生成记录')
  }

  const handleDeleteHistory = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const accountId = resolveInterviewPrepAccountId()
    if (!accountId) return
    const updated = await deleteInterviewPrepHistory(accountId, id)
    setHistoryList(updated)
    toast.success('已删除该条历史记录')
  }

  return (
    <div className="flex flex-col">
      <MobileToolHeader
        title="面试准备与打招呼"
        subtitle={currentResume?.title || '快速针对岗位备战'}
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
        {/* Resume Selector Card */}
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
              <span className="text-xs text-slate-400 font-normal">（选填）</span>
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
              onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH))}
              placeholder="粘贴招聘软件上的岗位职责与任职要求，例如 BOSS 直聘岗位详情；若留空则基于简历通用准备..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">
              {jobDescription.length}/{MAX_INTERVIEW_PREP_JD_LENGTH}
            </span>
          </div>

          <button
            type="button"
            disabled={isGenerating || !currentResume}
            onClick={() => void handleGenerate()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{result ? '重新生成面试准备' : '生成打招呼语 & 面试题'}</span>
              </>
            )}
          </button>
        </div>

        {/* Loading waiting state */}
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-100 bg-violet-50/50 p-6 text-center">
            <Loader2 size={32} className="animate-spin text-violet-600 mb-3" />
            <p className="text-sm font-semibold text-violet-900 transition-all">
              {WAITING_MESSAGES[waitingStep]}
            </p>
            <p className="mt-1 text-xs text-violet-600/80">大约需要 5~10 秒，正在全速运算</p>
          </div>
        ) : null}

        {/* Results Presentation */}
        {result && !isGenerating ? (
          <div className="space-y-3">
            {/* Segmented Control Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 text-center font-medium text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('greetings')}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition ${
                  activeTab === 'greetings'
                    ? 'bg-white text-violet-700 font-semibold shadow-xs'
                    : 'text-slate-600 active:text-slate-900'
                }`}
              >
                <MessageSquare size={14} />
                <span>打招呼 ({result.greetings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intro')}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition ${
                  activeTab === 'intro'
                    ? 'bg-white text-violet-700 font-semibold shadow-xs'
                    : 'text-slate-600 active:text-slate-900'
                }`}
              >
                <Clock size={14} />
                <span>自我介绍</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`flex items-center justify-center gap-1 rounded-lg py-2 transition ${
                  activeTab === 'questions'
                    ? 'bg-white text-violet-700 font-semibold shadow-xs'
                    : 'text-slate-600 active:text-slate-900'
                }`}
              >
                <HelpCircle size={14} />
                <span>面试题 ({result.questions.length})</span>
              </button>
            </div>

            {/* TAB 1: GREETINGS */}
            {activeTab === 'greetings' ? (
              <div className="space-y-3">
                {result.greetings.map((g, idx) => {
                  const meta = GREETING_META[g.style] || GREETING_META.highlight
                  const copyKey = `greeting_${idx}`
                  const isCopied = copiedKey === copyKey
                  return (
                    <div
                      key={g.style}
                      className={`rounded-2xl border bg-white p-4 shadow-xs transition ${meta.borderClass}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400">{g.text.length} 字</span>
                      </div>
                      <p className="text-xs leading-5 text-slate-500 mb-2.5">{meta.desc}</p>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-800 selection:bg-violet-100">
                        {g.text}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopy(g.text, copyKey, '开场白已复制，可直接粘贴发给 HR！')}
                        className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl font-semibold text-xs transition active:scale-[0.98] ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-violet-600 text-white shadow-xs'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} />
                            <span>已复制到剪贴板</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>一键复制开场白</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {/* TAB 2: SELF INTRO */}
            {activeTab === 'intro' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelfIntroVersion('30s')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        selfIntroVersion === '30s'
                          ? 'bg-violet-100 text-violet-800'
                          : 'text-slate-600'
                      }`}
                    >
                      30秒电梯版
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelfIntroVersion('2min')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        selfIntroVersion === '2min'
                          ? 'bg-violet-100 text-violet-800'
                          : 'text-slate-600'
                      }`}
                    >
                      2分钟完整版
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTeleprompterMode((v) => !v)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                      teleprompterMode
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Volume2 size={13} />
                    <span>提词背诵模式</span>
                  </button>
                </div>

                {(() => {
                  const introText =
                    selfIntroVersion === '30s'
                      ? result.selfIntro30s
                      : result.selfIntro2min
                  const copyKey = `intro_${selfIntroVersion}`
                  const isCopied = copiedKey === copyKey

                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {selfIntroVersion === '30s' ? '⏱️ 30 秒快速破冰' : '📋 2 分钟深度介绍'}
                        </span>
                        <span className="text-[11px] text-slate-400">{introText.length} 字</span>
                      </div>

                      <div
                        className={`rounded-xl transition-all leading-relaxed ${
                          teleprompterMode
                            ? 'bg-amber-50/60 p-4 text-base font-medium text-slate-900 leading-loose'
                            : 'bg-slate-50 p-3 text-sm text-slate-800'
                        }`}
                      >
                        {introText}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleCopy(introText, copyKey, '自我介绍已复制')}
                        className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl font-semibold text-xs transition active:scale-[0.98] ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-violet-600 text-white shadow-xs'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} />
                            <span>已复制自我介绍</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>一键复制此版本</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })()}
              </div>
            ) : null}

            {/* TAB 3: QUESTIONS */}
            {activeTab === 'questions' ? (
              <div className="space-y-2.5">
                {result.questions.map((q, idx) => {
                  const isOpen = expandedQuestion === idx
                  const cat = CATEGORY_META[q.category] || CATEGORY_META.hr
                  const copyKey = `star_${idx}`
                  const isCopied = copiedKey === copyKey

                  return (
                    <div
                      key={`${q.question}-${idx}`}
                      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedQuestion(isOpen ? null : idx)}
                        className="flex w-full items-start gap-2.5 p-3.5 text-left active:bg-slate-50"
                      >
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cat.badgeClass}`}
                        >
                          {cat.label}
                        </span>
                        <span className="flex-1 text-xs font-bold leading-5 text-slate-900">
                          {idx + 1}. {q.question}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isOpen ? (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 space-y-3 text-xs leading-relaxed">
                          {q.why ? (
                            <div>
                              <span className="font-semibold text-violet-700">🎯 考察意图：</span>
                              <span className="text-slate-600 ml-1">{q.why}</span>
                            </div>
                          ) : null}

                          {q.experienceHint ? (
                            <div>
                              <span className="font-semibold text-indigo-700">📌 结合经历：</span>
                              <span className="text-slate-600 ml-1">{q.experienceHint}</span>
                            </div>
                          ) : null}

                          {q.starAnswer ? (
                            <div className="rounded-xl border border-violet-100 bg-white p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800">💡 推荐回答思路 (STAR)：</span>
                                <button
                                  type="button"
                                  onClick={() => void handleCopy(q.starAnswer, copyKey, '回答思路已复制')}
                                  className="flex items-center gap-1 text-[11px] font-medium text-violet-600 active:text-violet-800"
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                  <span>{isCopied ? '已复制' : '复制思路'}</span>
                                </button>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{q.starAnswer}</p>
                            </div>
                          ) : null}

                          {q.followUps && q.followUps.length > 0 ? (
                            <div className="rounded-lg bg-amber-50/70 p-2.5 border border-amber-100">
                              <span className="font-semibold text-amber-800">❓ 常见追问：</span>
                              <ul className="mt-1 space-y-1 list-disc list-inside text-amber-900/80">
                                {q.followUps.map((fu, fIdx) => (
                                  <li key={fIdx}>{fu}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
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
              <span className="text-sm font-bold text-slate-900">历史生成记录</span>
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
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {item.resumeTitle}
                    </span>
                    <span className="truncate text-[11px] text-slate-400 mt-0.5">
                      {item.jobDescription
                        ? item.jobDescription.slice(0, 35) + '...'
                        : '通用岗位准备'}
                    </span>
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
