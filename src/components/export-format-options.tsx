'use client'

import { type ReactElement } from 'react'
import { toast } from 'sonner'
import { FileText, FileDown, Image as ImageIcon, Code } from 'lucide-react'

export const WORD_EXPORT_UNSUPPORTED_MESSAGE =
  '当前模板不支持 Word 导出。请返回模板列表，筛选「支持 Word」并更换模板后再导出。'

export type ExportFormat = 'pdf' | 'docx' | 'image' | 'markdown'

export const EXPORT_FORMATS = [
  {
    id: 'pdf',
    label: 'PDF',
    badge: '推荐投递',
    usage: '推荐投递',
    description: '保留当前排版，适合投递和打印',
    icon: FileDown,
  },
  {
    id: 'docx',
    label: 'Word',
    badge: '可编辑',
    usage: '继续编辑',
    description: '用 Word / WPS 继续修改',
    icon: FileText,
  },
  {
    id: 'image',
    label: '图片',
    badge: 'PNG',
    usage: '保存分享',
    description: '适合聊天发送、保存相册和分享',
    icon: ImageIcon,
  },
  {
    id: 'markdown',
    label: 'Markdown',
    badge: '文本版',
    usage: '文本备份',
    description: '复制、备份或交给 AI 处理，不保留模板排版',
    icon: Code,
  },
] as const

export function ExportFormatOptions({
  value,
  onChange,
  disabled,
  wordSupported,
  wordClientSupported = true,
  markdownSupported = true,
  compact = false,
}: {
  readonly value: ExportFormat
  readonly onChange: (format: ExportFormat) => void
  readonly disabled?: boolean
  readonly wordSupported: boolean
  readonly wordClientSupported?: boolean
  readonly markdownSupported?: boolean
  readonly compact?: boolean
}): ReactElement {
  return (
    <div className="shrink-0 space-y-2">
      <div
        className={`grid shrink-0 gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2'}`}
        role="group"
        aria-label="导出格式"
      >
        {EXPORT_FORMATS.map(
          ({ id, label, badge, usage, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={value === id}
              aria-disabled={disabled || (id === 'docx' && !wordSupported)}
              disabled={disabled}
              onClick={() => {
                if (id === 'docx' && !wordSupported) {
                  toast.info(WORD_EXPORT_UNSUPPORTED_MESSAGE, {
                    id: 'word-export-unsupported',
                    position: 'top-center',
                    duration: 5000,
                  })
                  return
                }
                onChange(id)
              }}
              className={`${compact ? 'min-h-18 min-w-0 px-1 py-2 text-center' : 'min-h-24 p-3 text-left'} rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-60 ${id === 'docx' && !wordSupported ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed' : value === id ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-slate-200 bg-white hover:border-violet-300'}`}
            >
              <span
                className={`flex items-center font-semibold text-slate-900 ${compact ? 'flex-col gap-0.5 text-xs' : 'flex-wrap gap-1.5 text-sm'}`}
              >
                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 ${compact && value === id ? 'text-violet-600' : ''}`}
                />
                {label}
                <span className="text-[10px] font-normal text-slate-500">
                  {compact && id === 'docx' && !wordSupported
                    ? '需更换模板'
                    : compact
                      ? usage
                      : badge}
                </span>
              </span>
              {!compact && (
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                  {description}
                </span>
              )}
              {!compact && id === 'docx' && (
                <span
                  className={`mt-1 block text-xs ${wordSupported ? 'text-violet-700' : 'text-slate-500'}`}
                >
                  {!wordClientSupported
                    ? '需更新小程序'
                    : wordSupported
                      ? '当前模板可导出'
                      : '当前模板不支持'}
                </span>
              )}
              {!compact && id === 'markdown' && (
                <span className="mt-1 block text-xs text-slate-500">
                  {markdownSupported ? '免费导出' : '需更新小程序'}
                </span>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
