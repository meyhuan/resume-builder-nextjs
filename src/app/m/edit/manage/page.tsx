'use client'

import { useCallback, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GripVertical,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Section } from '@/entities/resume/section'
import type { ResumeData } from '@/entities/resume/resume-data'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const log = createLogger('m/edit/manage')

/**
 * Full-screen module management page.
 * Lets users drag-reorder, hide/show, and remove optional sections.
 */
export default function ManagePage(): ReactElement {
  const router = useRouter()
  const draft = useDraftStore((s) => s.draft)
  const hiddenSectionIds = useDraftStore((s) => s.hiddenSectionIds)
  const reorder = useDraftStore((s) => s.reorderSections)
  const toggleHidden = useDraftStore((s) => s.toggleSectionHidden)
  const removeSection = useDraftStore((s) => s.removeSection)
  const updateDraft = useDraftStore((s) => s.updateDraft)
  const saveAll = useDraftStore((s) => s.saveAll)
  const isSaving = useDraftStore((s) => s.isSaving)

  const sections = draft?.sections ?? []
  const showPhotoAvatar: boolean = draft?.baseInfo?.showAvatar !== false
  const isJobIntentionVisible: boolean = draft?.jobIntentionVisible !== false

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const fromIdx = sections.findIndex((s) => s.id === active.id)
      const toIdx = sections.findIndex((s) => s.id === over.id)
      if (fromIdx < 0 || toIdx < 0) return
      log.info('reorder', { fromIdx, toIdx })
      reorder(fromIdx, toIdx)
    },
    [sections, reorder],
  )

  const handleRemove = useCallback(
    (section: Section): void => {
      log.info('remove section', { id: section.id, title: section.title })
      removeSection(section.id)
      toast.success(`已移除「${section.title}」`)
    },
    [removeSection],
  )

  const handleToggleAvatar = useCallback(
    (visible: boolean): void => {
      updateDraft('baseInfo.showAvatar', (next) => {
        const baseInfo = (next.baseInfo ?? {}) as NonNullable<ResumeData['baseInfo']>
        ;(next as { baseInfo?: unknown }).baseInfo = { ...baseInfo, showAvatar: visible }
      })
    },
    [updateDraft],
  )

  const handleToggleJobIntention = useCallback(
    (visible: boolean): void => {
      updateDraft('jobIntentionVisible', (next) => {
        ;(next as { jobIntentionVisible?: boolean }).jobIntentionVisible = visible
      })
    },
    [updateDraft],
  )

  const handleDone = useCallback(async (): Promise<void> => {
    log.info('save and back')
    const result = await saveAll()
    if (!result.ok) {
      log.warn('save failed', { error: result.error })
      toast.error(result.error ?? '保存失败，请重试')
      return
    }
    router.back()
  }, [saveAll, router])

  const items = sections.map((s) => s.id)

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={(): void => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-transform hover:bg-slate-100 active:scale-95"
          aria-label="返回"
        >
          <ArrowLeft size={21} />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-slate-950">
          模块管理
        </div>
        <button
          type="button"
          onClick={handleDone}
          disabled={isSaving}
          className="rounded-xl px-3 py-1.5 text-[14px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          {isSaving ? '保存中…' : '完成'}
        </button>
      </div>

      <div className="px-[18px] pt-4 pb-10">
        <p className="mb-3 px-1 text-[12px] text-slate-400">
          长按拖动调整展示顺序；隐藏后不会出现在简历预览中。
        </p>

        <div className="mb-4 flex flex-col gap-2">
          <PinnedVisibilityRow
            label="个人信息头像"
            description="隐藏后保留已上传照片"
            visible={showPhotoAvatar}
            onToggle={handleToggleAvatar}
          />
          <PinnedVisibilityRow
            label="求职意向"
            description="同时隐藏求职意向模块和个人信息岗位"
            visible={isJobIntentionVisible}
            onToggle={handleToggleJobIntention}
          />
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-[#edf0f5] bg-white px-5 py-10 text-center text-[13px] text-slate-400 shadow-sm">
            暂无模块，请先在编辑页添加内容
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {sections.map((section) => (
                  <SortableManageRow
                    key={section.id}
                    section={section}
                    isHidden={hiddenSectionIds.includes(section.id)}
                    onToggleHidden={toggleHidden}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

interface PinnedVisibilityRowProps {
  readonly label: string
  readonly description: string
  readonly visible: boolean
  readonly onToggle: (visible: boolean) => void
}

function PinnedVisibilityRow({ label, description, visible, onToggle }: PinnedVisibilityRowProps): ReactElement {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[16px] border border-[#edf0f5] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]',
        !visible && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[14px] font-semibold', visible ? 'text-slate-900' : 'text-slate-400')}>
          {label}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">{description}</div>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
          visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400',
        )}
      >
        {visible ? '显示' : '隐藏'}
      </span>
      <button
        type="button"
        onClick={(): void => onToggle(!visible)}
        aria-label={`${visible ? '隐藏' : '显示'}${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 active:bg-slate-200"
      >
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  )
}

interface ManageRowProps {
  readonly section: Section
  readonly isHidden: boolean
  readonly onToggleHidden: (id: string) => void
  readonly onRemove: (section: Section) => void
}

function SortableManageRow(
  { section, isHidden, onToggleHidden, onRemove }: ManageRowProps,
): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const moduleConfig = findModuleBySectionTitle(section.title)
  const label = moduleConfig?.label ?? section.title
  const isRequired = moduleConfig?.required ?? false

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-[16px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-shadow',
          isDragging && 'ring-2 ring-violet-300 shadow-lg',
          isHidden && 'opacity-60',
        )}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex h-8 w-7 shrink-0 touch-none cursor-grab items-center justify-center text-slate-300 active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </div>

        {/* Label + subtitle */}
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-[14px] font-semibold', isHidden ? 'text-slate-400' : 'text-slate-900')}>
            {label}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {section.blocks.length > 0 ? `${section.blocks.length} 条内容` : '未填写'}
          </div>
        </div>

        {/* Visibility badge */}
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isHidden ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          {isHidden ? '隐藏' : '显示'}
        </span>

        {/* Toggle hide or Remove */}
        {isRequired ? (
          <div className="h-8 w-8 shrink-0" />
        ) : isHidden ? (
          <button
            type="button"
            onClick={(): void => onRemove(section)}
            aria-label={`移除${label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-50 active:bg-red-100"
          >
            <Minus size={16} strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(): void => onToggleHidden(section.id)}
            aria-label={`隐藏${label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 active:bg-slate-200"
          >
            <Eye size={16} />
          </button>
        )}
      </div>

      {/* Restore button shown below hidden rows */}
      {isHidden && (
        <button
          type="button"
          onClick={(): void => onToggleHidden(section.id)}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[12px] font-medium text-violet-600 hover:bg-violet-50 active:bg-violet-100"
        >
          <EyeOff size={13} />
          点击恢复显示
        </button>
      )}
    </div>
  )
}
