'use client'

import { useEffect, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Languages,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Copy,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ResumeData } from '@/entities/resume/resume-data'
import {
  applyTranslatedHeaderToClone,
  applyTranslatedSectionToClone,
  cloneResumeData,
} from '@/lib/ai/apply-translated-section'
import { fetchInterviewPrepResume } from '@/lib/ai/interview-prep-resume'
import { MobileToolHeader } from '../_components/mobile-tool-header'
import { track } from '@/lib/analytics'

const TARGET_LANGUAGES = [
  { code: 'en', name: '英语 (English)', suffix: 'English' },
  { code: 'ja', name: '日语 (日本語)', suffix: 'Japanese' },
  { code: 'ko', name: '韩语 (한국어)', suffix: 'Korean' },
  { code: 'fr', name: '法语 (Français)', suffix: 'French' },
  { code: 'de', name: '德语 (Deutsch)', suffix: 'German' },
  { code: 'es', name: '西班牙语 (Español)', suffix: 'Spanish' },
] as const

interface ResumeOption {
  readonly id: string
  readonly title: string
}

interface MobileTranslateClientProps {
  readonly initialResume: {
    readonly id: string
    readonly title: string
    readonly content: ResumeData
    readonly template: string
  } | null
  readonly resumeOptions: readonly ResumeOption[]
  readonly returnTo?: string
  readonly source?: string
}

async function readNDJSON(
  response: Response,
  onLine: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      onLine(JSON.parse(line) as Record<string, unknown>)
    }
  }
  if (buffer.trim()) onLine(JSON.parse(buffer) as Record<string, unknown>)
}

export default function MobileTranslateClient({
  initialResume,
  resumeOptions,
  returnTo,
  source = 'web',
}: MobileTranslateClientProps): ReactElement {
  const router = useRouter()
  const [selectedResumeId, setSelectedResumeId] = useState<string>(initialResume?.id || '')
  const [currentResume, setCurrentResume] = useState<{
    id: string
    title: string
    content: ResumeData
    template: string
  } | null>(initialResume)

  const [targetLang, setTargetLang] = useState<string>('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [translatedDraft, setTranslatedDraft] = useState<ResumeData | null>(null)
  const [createdResumeId, setCreatedResumeId] = useState<string | null>(null)
  const [isSavingCopy, setIsSavingCopy] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [, startSwitchResume] = useTransition()

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
          template: currentResume?.template || 'simple',
        })
        setTranslatedDraft(null)
        setCreatedResumeId(null)
        toast.success(`已切换至简历「${fetched.title}」`)
      } catch {
        toast.error('切换简历失败，请稍后重试')
      }
    })
  }

  // Start translation
  const handleStartTranslate = async (): Promise<void> => {
    if (!currentResume?.content) {
      toast.error('请选择包含有效内容的简历')
      return
    }

    setIsTranslating(true)
    setProgress({ current: 0, total: 1 })
    setTranslatedDraft(null)
    setCreatedResumeId(null)

    track('ai_assist_start', {
      feature: 'translate',
      resumeId: currentResume.id,
      targetLanguage: targetLang,
      source,
    })

    try {
      let accumulated = cloneResumeData(currentResume.content)
      const res = await fetch('/next-api/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify({
          resumeData: currentResume.content,
          targetLanguage: targetLang,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        let errMessage = '翻译失败，请稍后重试'
        try {
          const parsed = JSON.parse(text)
          if (parsed.error) errMessage = parsed.error
        } catch {
          // fallback
        }
        throw new Error(errMessage)
      }

      await readNDJSON(res, (line) => {
        if (line.type === 'progress') {
          setProgress({
            current: Number(line.current ?? 0),
            total: Number(line.total ?? 1),
          })
        } else if (line.type === 'header' && line.header) {
          accumulated = applyTranslatedHeaderToClone(
            accumulated,
            line.header as Record<string, unknown>,
          )
        } else if (line.type === 'section' && line.section) {
          accumulated = applyTranslatedSectionToClone(
            accumulated,
            line.section as { sectionId: string; title?: string; displayTitle?: string; blocks?: unknown[] },
          )
        }
      })

      setTranslatedDraft(accumulated)
      toast.success('翻译完成！请检查双语核对预览')
      track('ai_assist_success', {
        feature: 'translate',
        resumeId: currentResume.id,
        targetLanguage: targetLang,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '翻译服务异常，请稍后重试'
      toast.error(msg)
      track('ai_assist_failed', { feature: 'translate', error: msg })
    } finally {
      setIsTranslating(false)
    }
  }

  // Save as independent copy
  const handleSaveAsCopy = async (): Promise<void> => {
    if (!translatedDraft || !currentResume) return
    setIsSavingCopy(true)

    const langObj = TARGET_LANGUAGES.find((l) => l.code === targetLang)
    const suffix = langObj?.suffix || targetLang.toUpperCase()
    const newTitle = `${currentResume.title}-${suffix}`

    try {
      const res = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: translatedDraft,
          template: currentResume.template || 'simple',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '创建独立副本失败')
      }

      setCreatedResumeId(data.id)
      toast.success(`已安全创建新简历「${newTitle}」！`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败，请重试'
      toast.error(msg)
    } finally {
      setIsSavingCopy(false)
    }
  }

  const selectedLangMeta = TARGET_LANGUAGES.find((l) => l.code === targetLang)

  return (
    <div className="flex flex-col">
      <MobileToolHeader
        title="简历双语翻译"
        returnTo={returnTo}
        currentResumeTitle={currentResume?.title || '未命名简历'}
        selectedResumeId={selectedResumeId}
        resumeOptions={resumeOptions}
        onSelectResume={(id) => void handleSelectResume(id)}
      />

      <main className="mx-auto flex w-full max-w-lg flex-col px-3 py-2.5 space-y-3">
        {/* Translation Config Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Languages size={18} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">选择目标外语</span>
              <p className="text-[11px] text-slate-400">
                自动生成独立外语新简历，100% 保护原中文简历不被覆盖
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {TARGET_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setTargetLang(lang.code)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition active:scale-95 ${
                  targetLang === lang.code
                    ? 'border-violet-500 bg-violet-50 text-violet-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{lang.name}</span>
                {targetLang === lang.code ? (
                  <CheckCircle2 size={14} className="text-violet-600" />
                ) : null}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isTranslating || !currentResume}
            onClick={() => void handleStartTranslate()}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            {isTranslating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>
                  正在翻译 ({progress.current}/{progress.total || '…'})...
                </span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{translatedDraft ? '重新翻译' : `一键翻译为 ${selectedLangMeta?.name || '英文'}`}</span>
              </>
            )}
          </button>
        </div>

        {/* Empty State Guarantee Preview */}
        {!translatedDraft && !isTranslating ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">外企级专业简历翻译特性</span>
              <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">
                安全独立副本
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">地道职场强动词（Action Verbs）转换</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    告别生硬机翻，自动使用 Spearheaded、Architected、Optimized 等外企 HR 偏好的专业表达。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <FileText size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800">双语对照核对 & 独立新简历保存</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    翻译完成后支持逐模块中英对照审阅，确认无误后自动创建「{currentResume?.title || '我的简历'}-{selectedLangMeta?.suffix || 'English'}」独立副本。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Translation Progress Bar */}
        {isTranslating ? (
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-900">
              <span>AI 逐段多并发翻译中...</span>
              <span>
                {progress.total > 0
                  ? `${Math.round((progress.current / progress.total) * 100)}%`
                  : '初始化...'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-violet-200/60 overflow-hidden">
              <div
                className="h-full bg-violet-600 transition-all duration-300 rounded-full"
                style={{
                  width: `${
                    progress.total > 0
                      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
                      : 10
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-violet-700/80">保留原有排版结构与技术专有名词格式</p>
          </div>
        ) : null}

        {/* Translation Verification Accordion */}
        {translatedDraft && !isTranslating ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">双语对照核对</span>
                <span className="text-xs text-emerald-600 font-medium">翻译已就绪</span>
              </div>

              {/* Base Info comparison */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800">基本信息 & 意向</span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block mb-0.5">中文原版:</span>
                    <p className="font-medium text-slate-800">{currentResume?.content?.name}</p>
                    <p>{currentResume?.content?.jobIntention?.position || '无意向岗位'}</p>
                  </div>
                  <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 block mb-0.5">外语译版:</span>
                    <p className="font-medium text-emerald-900">{translatedDraft.name}</p>
                    <p className="text-emerald-800">{translatedDraft.jobIntention?.position || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Sections comparison */}
              <div className="space-y-2">
                {translatedDraft.sections?.map((sec, idx) => {
                  const origSec = currentResume?.content?.sections?.[idx]
                  const isOpen = expandedSection === sec.id
                  return (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedSection(isOpen ? null : sec.id)}
                        className="flex w-full items-center justify-between p-3 text-left active:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {origSec?.title || '模块'} → {sec.title}
                          </span>
                        </div>
                        <ChevronDown
                          size={15}
                          className={`text-slate-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isOpen ? (
                        <div className="border-t border-slate-100 p-3 bg-slate-50/50 space-y-2 text-xs">
                          {sec.blocks?.slice(0, 3).map((block, bIdx) => (
                            <div
                              key={bIdx}
                              className="rounded-lg bg-white p-2.5 border border-slate-200 space-y-1"
                            >
                              <p className="font-semibold text-slate-800">
                                {'title' in block && typeof block.title === 'string'
                                  ? block.title
                                  : `条目 #${bIdx + 1}`}
                              </p>
                              {'subtitle' in block && typeof block.subtitle === 'string' ? (
                                <p className="text-slate-500">{block.subtitle}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Creation CTA */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-slate-900">
                  {createdResumeId ? '独立英文简历已成功创建！' : '准备就绪，保存为独立简历'}
                </span>
              </div>

              {!createdResumeId ? (
                <button
                  type="button"
                  disabled={isSavingCopy}
                  onClick={() => void handleSaveAsCopy()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                >
                  {isSavingCopy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>正在创建独立简历副本...</span>
                    </>
                  ) : (
                    <>
                      <span>保存为独立新简历并预览</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/m/preview?id=${encodeURIComponent(createdResumeId)}`)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 font-semibold text-sm text-white shadow-sm transition active:scale-[0.99]"
                >
                  <span>立即去预览新英文简历</span>
                  <ExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
