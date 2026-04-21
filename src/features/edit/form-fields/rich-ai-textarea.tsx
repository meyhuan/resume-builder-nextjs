'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { MobileRichTextarea } from './mobile-rich-textarea'
import { usePolishSection } from '@/lib/ai/use-polish-section'
import { htmlToPlainText } from './html-text'
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
}

const POLISH_LEVELS: readonly { id: PolishLevel; label: string }[] = [
  { id: 'basic', label: '基础纠错' },
  { id: 'professional', label: '专业表达' },
  { id: 'jd-match', label: 'JD 匹配' },
]

/**
 * Mobile-optimized rich text area with an AI polish toolbar that streams
 * rewrites from /next-api/ai/polish-section and lets the user preview and apply.
 */
export function RichAiTextarea(props: RichAiTextareaProps): ReactElement {
  const { label, html, onHtmlChange, placeholder, tip, minHeight = 140, moduleType, identity = 'professional' } = props
  const { isPolishing, streamedHtml, polish, abort, reset } = usePolishSection()
  const [previewing, setPreviewing] = useState<boolean>(false)
  const [activeLevel, setActiveLevel] = useState<PolishLevel>('professional')

  useEffect(() => {
    return (): void => abort()
  }, [abort])

  const handlePolish = async (level: PolishLevel): Promise<void> => {
    const plain: string = htmlToPlainText(html)
    if (plain.length < MIN_POLISH_CONTENT_LENGTH) {
      toast.error(`至少填写 ${MIN_POLISH_CONTENT_LENGTH} 个字才能润色`)
      return
    }
    setActiveLevel(level)
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

  // Manual remount counter — bumped only when AI polish applies a new HTML.
  // Previously we used `html` content as the key, which caused the Lexical
  // editor to unmount on every keystroke and lose focus (#2 bug fix).
  const [editorEpoch, setEditorEpoch] = useState<number>(0)

  const applyPolish = (): void => {
    if (streamedHtml) {
      onHtmlChange(streamedHtml)
      setEditorEpoch((n) => n + 1)
      toast.success('已应用润色结果 ✨')
    }
    setPreviewing(false)
    reset()
  }

  const cancelPolish = (): void => {
    abort()
    setPreviewing(false)
    reset()
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
                hasEnoughContent,
              )}
            >
              <Sparkles size={14} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1">
                AI 智能润色
                <span className="text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  NEW
                </span>
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {hasEnoughContent
                  ? '选择一个模式，AI 一键优化表达'
                  : `再写 ${MIN_POLISH_CONTENT_LENGTH - plainLength} 字即可启用 AI 润色`}
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-1.5">
          {POLISH_LEVELS.map((lv) => (
            <button
              key={lv.id}
              type="button"
              onClick={(): void => void handlePolish(lv.id)}
              disabled={isPolishing || !hasEnoughContent}
              className={cn(
                'h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-95',
                'flex items-center justify-center gap-1',
                hasEnoughContent
                  ? 'bg-white text-violet-700 border border-violet-300 hover:bg-violet-600 hover:text-white hover:border-violet-600 shadow-sm'
                  : 'bg-white/50 text-slate-400 border border-slate-200 cursor-not-allowed',
                'disabled:active:scale-100',
              )}
              aria-label={`AI 润色：${lv.label}`}
            >
              <Sparkles size={11} className={hasEnoughContent ? 'text-violet-500' : 'text-slate-300'} />
              {lv.label}
            </button>
          ))}
        </div>
      </div>

      {previewing && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={cancelPolish}
            aria-hidden="true"
          />
          <div className="fixed inset-x-4 top-20 bottom-24 z-50 rounded-2xl bg-white shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-600" />
                <span className="text-sm font-semibold text-slate-900">
                  {POLISH_LEVELS.find((l) => l.id === activeLevel)?.label}
                </span>
                {isPolishing && <Loader2 size={14} className="animate-spin text-violet-500" />}
              </div>
              <button
                type="button"
                onClick={cancelPolish}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="取消"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="text-[11px] text-slate-400 mb-1.5">原文</div>
              <div
                className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <div className="text-[11px] text-violet-600 mb-1.5">✨ AI 建议</div>
              <div className="text-sm text-slate-900 bg-violet-50/50 rounded-lg p-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                {isPolishing && !streamedHtml ? (
                  <span className="text-slate-400">正在思考…</span>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: streamedHtml }} />
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={cancelPolish}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                type="button"
                onClick={applyPolish}
                disabled={isPolishing || !streamedHtml}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Check size={14} /> 应用
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
