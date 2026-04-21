'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus, GripVertical, MoreHorizontal } from 'lucide-react'
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
  /** Callback to add a new block and return its index. If omitted, falls back to list page. */
  readonly onAddItem?: () => number
}

/**
 * Home-page preview for a single resume section. For list-based modules it
 * expands to show each item as a clickable row; for text-based modules it
 * shows a truncated preview.
 */
export function SectionPreview({ section, module, dragging, dragHandleProps, onAddItem }: SectionPreviewProps): ReactElement {
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
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="w-full text-left px-4 pb-4 pt-1 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4 active:bg-slate-50 transition-colors"
        >
          {plain}
        </button>
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
          className="text-violet-600 p-1 rounded hover:bg-violet-50"
          title="管理模块"
        >
          <MoreHorizontal size={16} />
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
              onClick={(): void => {
                if (onAddItem) {
                  const newIdx: number = onAddItem()
                  router.push(`${baseRoute}/${newIdx}`)
                } else {
                  router.push(baseRoute)
                }
              }}
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
          {block.contentHtml && <div className="mt-1 text-xs text-slate-400 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
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
          {block.contentHtml && <div className="mt-1 text-xs text-slate-400 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
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
          {block.contentHtml && <div className="mt-1 text-xs text-slate-400 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
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
