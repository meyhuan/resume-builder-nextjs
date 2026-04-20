'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, GripVertical } from 'lucide-react'
import type { Section } from '@/entities/resume/section'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ModuleConfig } from '@/entities/module/module-config'
import { cn } from '@/lib/utils'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'

export interface SectionPreviewProps {
  readonly section: Section
  readonly module: ModuleConfig | null
  /** Whether drag reorder handle is visible (manage mode). */
  readonly dragging?: boolean
  readonly dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

/**
 * Home-page preview for a single resume section. For list-based modules it
 * expands to show each item as a clickable row; for text-based modules it
 * shows a truncated preview.
 */
export function SectionPreview({ section, module, dragging, dragHandleProps }: SectionPreviewProps): ReactElement {
  const router = useRouter()
  const label: string = module?.label ?? section.title
  const emoji: string = module?.emoji ?? '✨'
  const baseRoute: string = module?.route ?? `/m/edit/custom/${section.id}`

  const renderItems = (): ReactElement | null => {
    if (section.blocks.length === 0) return null
    // List-based modules: show each block as a row.
    if (module?.isList) {
      return (
        <div className="flex flex-col divide-y divide-slate-100">
          {section.blocks.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={(): void => router.push(`${baseRoute}/${idx}`)}
              className="flex items-center gap-2 px-4 py-2.5 text-left active:bg-slate-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <BlockSummary block={b} />
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )
    }
    // Single text block preview.
    const textBlock = section.blocks.find((b) => b.type === 'text')
    if (textBlock && textBlock.type === 'text') {
      const plain: string = htmlToPlainText(textBlock.html)
      if (!plain) return null
      return (
        <div className="px-4 pb-3 pt-1 text-[13px] text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {plain}
        </div>
      )
    }
    return null
  }

  const isEmpty: boolean = section.blocks.length === 0 || (
    section.blocks.length === 1 &&
    section.blocks[0].type === 'text' &&
    !htmlToPlainText(section.blocks[0].html)
  )

  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-slate-200 overflow-hidden transition-shadow',
        dragging && 'ring-2 ring-violet-300 shadow-lg',
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        {dragHandleProps && (
          <div {...dragHandleProps} className="touch-none text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </div>
        )}
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-semibold text-slate-800 flex-1">{label}</span>
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="text-[11px] text-violet-600 px-2 py-1 rounded hover:bg-violet-50"
        >
          管理
        </button>
      </div>

      {isEmpty ? (
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="mx-4 mb-3 mt-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 active:bg-slate-50"
        >
          <Plus size={14} />
          添加{label}
        </button>
      ) : (
        <>
          {renderItems()}
          {module?.isList && (
            <button
              type="button"
              onClick={(): void => router.push(baseRoute)}
              className="w-full py-2 text-xs text-violet-600 border-t border-slate-100 flex items-center justify-center gap-1 hover:bg-violet-50/50"
            >
              <Plus size={12} />
              添加一条
            </button>
          )}
        </>
      )}
    </div>
  )
}

function BlockSummary({ block }: { readonly block: ResumeBlock }): ReactElement {
  switch (block.type) {
    case 'experience':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {block.company || '未填写公司'}
            {block.position && <span className="text-slate-500 font-normal"> · {block.position}</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 truncate">
            {formatDateRange(block.startDate, block.endDate)}
          </div>
        </>
      )
    case 'education':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {block.school || '未填写学校'}
            {block.major && <span className="text-slate-500 font-normal"> · {block.major}</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 truncate">
            {[block.degree, formatDateRange(block.startDate, block.endDate)].filter(Boolean).join(' · ')}
          </div>
        </>
      )
    case 'project':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {block.name || '未填写项目'}
            {block.role && <span className="text-slate-500 font-normal"> · {block.role}</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 truncate">
            {formatDateRange(block.startDate, block.endDate)}
          </div>
        </>
      )
    case 'campus':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {block.organization || '未填写组织'}
            {block.position && <span className="text-slate-500 font-normal"> · {block.position}</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 truncate">
            {formatDateRange(block.startDate, block.endDate)}
          </div>
        </>
      )
    default:
      return <div className="text-sm text-slate-600 truncate">内容</div>
  }
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return ''
  if (!end) return start ?? ''
  if (!start) return end
  return `${start} - ${end}`
}
