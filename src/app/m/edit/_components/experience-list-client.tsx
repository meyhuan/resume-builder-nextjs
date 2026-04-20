'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { ModuleEditShell } from './module-edit-shell'
import { useSectionList } from '@/features/edit/draft/use-section-list'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

export interface ExperienceListClientProps {
  readonly title: string
  readonly sectionTitle: string
  readonly baseRoute: string
  readonly subtitle?: string
  readonly emptyHint?: string
}

/**
 * Generic list page for experience-like modules (work, edu, project, intern, school).
 */
export function ExperienceListClient(props: ExperienceListClientProps): ReactElement {
  const { title, sectionTitle, baseRoute, subtitle, emptyHint } = props
  const router = useRouter()
  const { blocks, addBlock, removeBlock, moveBlockUp, moveBlockDown } = useSectionList(sectionTitle)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleAdd = (): void => {
    const id: string = addBlock()
    // Navigate to the newly appended item.
    const newIdx: number = blocks.length
    router.push(`${baseRoute}/${newIdx}?newId=${encodeURIComponent(id)}`)
  }

  const handleConfirmRemove = (): void => {
    if (confirmRemoveId) {
      removeBlock(confirmRemoveId)
      toast.success('已删除')
    }
    setConfirmRemoveId(null)
  }

  return (
    <ModuleEditShell title={title} subtitle={subtitle}>
      {blocks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <div className="text-sm text-slate-500 mb-5">{emptyHint ?? '还没有任何内容，点击下方添加'}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((b, idx) => (
            <ExperienceRow
              key={b.id}
              block={b}
              index={idx}
              total={blocks.length}
              onOpen={(): void => router.push(`${baseRoute}/${idx}`)}
              onRemove={(): void => setConfirmRemoveId(b.id)}
              onMoveUp={(): void => moveBlockUp(b.id)}
              onMoveDown={(): void => moveBlockDown(b.id)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 py-4 flex items-center justify-center gap-2 text-violet-600 font-medium active:scale-[0.98] transition-transform"
      >
        <Plus size={16} />
        <span>添加一条{title}</span>
      </button>

      {confirmRemoveId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={(): void => setConfirmRemoveId(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-slate-900">删除这一条？</h3>
            <p className="mt-1.5 text-sm text-slate-500">删除后无法恢复，确定要删除吗？</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={(): void => setConfirmRemoveId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium active:scale-95 transition-transform"
              >
                删除
              </button>
            </div>
          </div>
        </>
      )}
    </ModuleEditShell>
  )
}

interface ExperienceRowProps {
  readonly block: ResumeBlock
  readonly index: number
  readonly total: number
  readonly onOpen: () => void
  readonly onRemove: () => void
  readonly onMoveUp: () => void
  readonly onMoveDown: () => void
}

function summarizeBlock(block: ResumeBlock): { title: string; meta: string } {
  switch (block.type) {
    case 'experience':
      return { title: block.company || '未填写', meta: `${block.position || ''} · ${block.startDate || ''}${block.endDate ? ` - ${block.endDate}` : ''}`.trim() }
    case 'education':
      return { title: block.school || '未填写', meta: `${block.major || ''} · ${block.degree || ''}`.trim() }
    case 'project':
      return { title: block.name || '未填写', meta: `${block.role || ''} · ${block.startDate || ''}${block.endDate ? ` - ${block.endDate}` : ''}`.trim() }
    case 'campus':
      return { title: block.organization || '未填写', meta: `${block.position || ''}`.trim() }
    default:
      return { title: '内容', meta: '' }
  }
}

function ExperienceRow(props: ExperienceRowProps): ReactElement {
  const { block, index, total, onOpen, onRemove, onMoveUp, onMoveDown } = props
  const summary = summarizeBlock(block)
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors"
      >
        <GripVertical size={14} className="text-slate-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{summary.title}</div>
          {summary.meta && <div className="mt-0.5 text-xs text-slate-500 truncate">{summary.meta}</div>}
        </div>
      </button>
      <div className="flex items-center border-t border-slate-100">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="flex-1 py-2 text-xs text-slate-500 disabled:text-slate-300 flex items-center justify-center gap-1 active:bg-slate-50"
        >
          <ChevronUp size={12} /> 上移
        </button>
        <div className="w-px h-4 bg-slate-100" />
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="flex-1 py-2 text-xs text-slate-500 disabled:text-slate-300 flex items-center justify-center gap-1 active:bg-slate-50"
        >
          <ChevronDown size={12} /> 下移
        </button>
        <div className="w-px h-4 bg-slate-100" />
        <button
          type="button"
          onClick={onRemove}
          className="flex-1 py-2 text-xs text-rose-500 flex items-center justify-center gap-1 active:bg-rose-50"
        >
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </div>
  )
}
