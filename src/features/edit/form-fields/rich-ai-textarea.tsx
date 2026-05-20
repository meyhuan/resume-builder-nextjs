'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Check, X, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { MobileRichTextarea } from './mobile-rich-textarea'
import { usePolishSection } from '@/lib/ai/use-polish-section'
import { useGenerateSection } from '@/lib/ai/use-generate-section'
import { useJobIntentionField } from '@/features/edit/draft/use-draft-field'
import { htmlToPlainText } from './html-text'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'
import type { SectionIdentity, SectionModuleType, PolishLevel } from '@/lib/ai/section-types'
import { MIN_POLISH_CONTENT_LENGTH } from '@/lib/ai/section-types'
import { cn } from '@/lib/utils'

export interface RichAiTextareaProps {
  readonly label: string
  readonly html: string
  readonly onHtmlChange: (next: string) => void
  readonly placeholder?: string
  readonly tip?: string
  readonly minHeight?: number
  readonly moduleType: SectionModuleType
  readonly identity?: SectionIdentity
  /**
   * Optional structured context from the parent block (e.g. company name,
   * role, dates) to seed AI generation when the content is empty.
   */
  readonly generatePrefill?: Record<string, string>
}

const POLISH_LEVELS: readonly { id: PolishLevel; label: string }[] = [
  { id: 'basic', label: '基础纠错' },
  { id: 'professional', label: '专业表达' },
  // { id: 'jd-match', label: 'JD 匹配' },
]

/**
 * Mobile-optimized rich text area with an AI polish toolbar that streams
 * rewrites from /next-api/ai/polish-section and lets the user preview and apply.
 */
export function RichAiTextarea(props: RichAiTextareaProps): ReactElement {
  const {
    label,
    html,
    onHtmlChange,
    placeholder,
    tip,
    minHeight = 140,
    moduleType,
    identity = 'professional',
    generatePrefill,
  } = props
  const router = useRouter()
  const { isPolishing, streamedHtml: polishedHtml, polish, abort: abortPolish, reset: resetPolish } = usePolishSection()
  const {
    isGenerating,
    streamedHtml: generatedHtml,
    generate,
    abort: abortGenerate,
    reset: resetGenerate,
  } = useGenerateSection()
  const [previewing, setPreviewing] = useState<boolean>(false)
  const [previewMode, setPreviewMode] = useState<'polish' | 'generate'>('polish')
  const [activeLevel, setActiveLevel] = useState<PolishLevel>('professional')

  const positionF = useJobIntentionField('position')
  const industryF = useJobIntentionField('industry')
  const jobPosition: string = (positionF.value ?? '').trim()
  const jobIndustry: string = (industryF.value ?? '').trim()

  useEffect(() => {
    return (): void => {
      abortPolish()
      abortGenerate()
    }
  }, [abortPolish, abortGenerate])

  const handlePolish = async (level: PolishLevel): Promise<void> => {
    const plain: string = htmlToPlainText(html)
    if (plain.length < MIN_POLISH_CONTENT_LENGTH) {
      toast.error(`至少填写 ${MIN_POLISH_CONTENT_LENGTH} 个字才能润色`)
      return
    }
    setActiveLevel(level)
    setPreviewMode('polish')
    setPreviewing(true)
    const result: string | null = await polish({
      content: html,
      identity,
      moduleType,
      polishLevel: level,
    })
    if (!result) {
      setPreviewing(false)
    }
  }

  const handleGenerate = async (): Promise<void> => {
    if (!jobPosition) {
      toast.error('请先填写「求职意向 → 目标岗位」，AI 才能根据岗位生成内容', {
        duration: 5000,
        action: {
          label: '去填写',
          onClick: (): void => router.push('/m/edit/intention'),
        },
      })
      return
    }
    const answers: Record<string, string> = {
      目标岗位: jobPosition,
    }
    if (jobIndustry) answers['目标行业'] = jobIndustry
    if (generatePrefill) {
      for (const [k, v] of Object.entries(generatePrefill)) {
        if (isMeaningfulText(v)) answers[k] = v.trim()
      }
    }
    setPreviewMode('generate')
    setPreviewing(true)
    const result: string | null = await generate({
      identity,
      moduleType,
      answers,
      jobDescription: jobPosition,
    })
    if (!result) setPreviewing(false)
  }

  // Manual remount counter — bumped only when AI polish applies a new HTML.
  // Previously we used `html` content as the key, which caused the Lexical
  // editor to unmount on every keystroke and lose focus (#2 bug fix).
  const [editorEpoch, setEditorEpoch] = useState<number>(0)

  const currentStreamedHtml: string = previewMode === 'generate' ? generatedHtml : polishedHtml
  const currentIsLoading: boolean = previewMode === 'generate' ? isGenerating : isPolishing

  const applyResult = (): void => {
    if (currentStreamedHtml) {
      onHtmlChange(currentStreamedHtml)
      setEditorEpoch((n) => n + 1)
      toast.success(previewMode === 'generate' ? '已插入生成内容 ✨' : '已应用润色结果 ✨')
    }
    setPreviewing(false)
    resetPolish()
    resetGenerate()
  }

  const cancelPreview = (): void => {
    abortPolish()
    abortGenerate()
    setPreviewing(false)
    resetPolish()
    resetGenerate()
  }

  // Re-mount only when AI polish applies a new HTML, so Lexical re-picks up
  // the initial state. Using `html` as part of the key would remount on every
  // keystroke and steal focus.
  const editorKey: string = `epoch-${editorEpoch}`

  const plainLength: number = htmlToPlainText(html).length
  const hasEnoughContent: boolean = plainLength >= MIN_POLISH_CONTENT_LENGTH

  return (
    <div className="flex flex-col gap-2">
      <MobileRichTextarea
        key={editorKey}
        label={label}
        html={html}
        onHtmlChange={onHtmlChange}
        placeholder={placeholder}
        tip={tip}
        minHeight={minHeight}
      />

      {/* Prominent AI polish bar — sits below the editor for natural flow
          after the user finishes typing. Disabled state nudges them to write. */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-3',
          'bg-gradient-to-br from-violet-50 via-fuchsia-50 to-indigo-50',
          'border border-violet-200/70',
          'transition-all',
          hasEnoughContent && 'shadow-md shadow-violet-200/50',
        )}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-violet-300/20 blur-2xl" />

        <div className="relative flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'relative h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm',
              )}
            >
              {hasEnoughContent ? <Sparkles size={14} /> : <Wand2 size={14} />}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1">
                {hasEnoughContent ? 'AI 智能润色' : 'AI 帮我写'}
                <span className="text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  NEW
                </span>
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {hasEnoughContent
                  ? '选择一个模式，AI 一键优化表达'
                  : jobPosition
                    ? `根据「${jobPosition}」岗位为你生成示例内容`
                    : '需要先填写求职意向，AI 才能针对岗位生成内容'}
              </div>
            </div>
          </div>
        </div>

        {hasEnoughContent ? (
          <div className="relative grid grid-cols-2 gap-1.5">
            {POLISH_LEVELS.map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={(): void => void handlePolish(lv.id)}
                disabled={isPolishing}
                className={cn(
                  'h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-95',
                  'flex items-center justify-center gap-1',
                  'bg-white text-violet-700 border border-violet-300 hover:bg-violet-600 hover:text-white hover:border-violet-600 shadow-sm',
                  'disabled:active:scale-100 disabled:opacity-60',
                )}
                aria-label={`AI 润色：${lv.label}`}
              >
                <Sparkles size={11} className="text-violet-500" />
                {lv.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={(): void => void handleGenerate()}
            disabled={isGenerating}
            className={cn(
              'relative w-full h-10 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]',
              'flex items-center justify-center gap-1.5',
              'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25',
              'disabled:opacity-70 disabled:active:scale-100',
            )}
            aria-label="AI 帮我生成内容"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isGenerating ? '生成中…' : 'AI 帮我生成'}
          </button>
        )}
      </div>

      {previewing && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={cancelPreview}
            aria-hidden="true"
          />
          <div className="fixed inset-x-4 top-20 bottom-24 z-50 rounded-2xl bg-white shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {previewMode === 'generate' ? (
                  <Wand2 size={16} className="text-violet-600" />
                ) : (
                  <Sparkles size={16} className="text-violet-600" />
                )}
                <span className="text-sm font-semibold text-slate-900">
                  {previewMode === 'generate'
                    ? 'AI 帮我写'
                    : POLISH_LEVELS.find((l) => l.id === activeLevel)?.label}
                </span>
                {currentIsLoading && <Loader2 size={14} className="animate-spin text-violet-500" />}
              </div>
              <button
                type="button"
                onClick={cancelPreview}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="取消"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {previewMode === 'polish' && (
                <>
                  <div className="text-[11px] text-slate-400 mb-1.5">原文</div>
                  <div
                    className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </>
              )}
              {previewMode === 'generate' && jobPosition && (
                <div className="text-[11px] text-slate-400 mb-1.5">
                  参考上下文：目标岗位「{jobPosition}」{jobIndustry && `｜行业「${jobIndustry}」`}
                </div>
              )}
              <div className="text-[11px] text-violet-600 mb-1.5">✨ AI 建议</div>
              <div className="text-sm text-slate-900 bg-violet-50/50 rounded-lg p-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                {currentIsLoading && !currentStreamedHtml ? (
                  <span className="text-slate-400">正在思考…</span>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: currentStreamedHtml }} />
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={cancelPreview}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                type="button"
                onClick={applyResult}
                disabled={currentIsLoading || !currentStreamedHtml}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Check size={14} /> {previewMode === 'generate' ? '插入' : '应用'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
