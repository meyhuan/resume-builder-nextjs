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

  const applyPolish = (): void => {
    if (streamedHtml) {
      onHtmlChange(streamedHtml)
      toast.success('已应用润色结果 ✨')
      // Force remount by bumping key via a key prop from parent is handled upstream.
    }
    setPreviewing(false)
    reset()
  }

  const cancelPolish = (): void => {
    abort()
    setPreviewing(false)
    reset()
  }

  const extraToolbar: ReactElement = (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[11px] text-violet-500 shrink-0 px-0.5 flex items-center gap-0.5">
        <Sparkles size={11} />
        AI
      </span>
      {POLISH_LEVELS.map((lv) => (
        <button
          key={lv.id}
          type="button"
          onClick={(): void => void handlePolish(lv.id)}
          disabled={isPolishing}
          className={cn(
            'shrink-0 px-2 py-1 text-[11px] rounded-md border transition-all active:scale-95',
            'text-violet-700 border-violet-200 hover:bg-violet-50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {lv.label}
        </button>
      ))}
    </div>
  )

  // Keying the editor by html length + first 20 chars forces a re-mount when
  // polish is applied so the Lexical initial state picks up the new HTML.
  const editorKey: string = `${html.length}-${html.slice(0, 20)}`

  return (
    <div>
      <MobileRichTextarea
        key={editorKey}
        label={label}
        html={html}
        onHtmlChange={onHtmlChange}
        placeholder={placeholder}
        tip={tip}
        minHeight={minHeight}
        extraToolbar={extraToolbar}
      />

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
