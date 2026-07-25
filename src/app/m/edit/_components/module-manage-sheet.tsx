'use client'

import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
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
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Images,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Section } from '@/entities/resume/section'
import { createEmptyPortfolio } from '@/entities/resume/portfolio'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const log = createLogger('m/edit/module-manage-sheet')

interface ModuleManageSheetProps {
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Bottom sheet for module management: drag-reorder and delete sections.
 */
export function ModuleManageSheet({ open, onClose }: ModuleManageSheetProps): ReactElement {
  const router = useRouter()
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)
  const reorder = useDraftStore((s) => s.reorderSections)
  const removeSection = useDraftStore((s) => s.removeSection)

  const sections = useMemo(() => draft?.sections ?? [], [draft?.sections])
  const showAvatar: boolean = draft?.baseInfo?.showAvatar !== false
  const showJobIntention: boolean = draft?.jobIntentionVisible !== false
  const showHeaderJobIntention: boolean = showJobIntention && draft?.headerJobIntentionVisible !== false
  const hasPortfolio: boolean = draft?.portfolio !== undefined
  const showPortfolio: boolean = draft?.portfolio?.enabled === true
  const portfolioImageCount: number = draft?.portfolio?.images.length ?? 0

  const [pendingRemove, setPendingRemove] = useState<Section | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
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

  const handleConfirmRemove = useCallback((): void => {
    if (!pendingRemove) return
    log.info('remove section', { id: pendingRemove.id, title: pendingRemove.title })
    removeSection(pendingRemove.id)
    toast.success(`已移除「${pendingRemove.title}」`)
    setPendingRemove(null)
  }, [pendingRemove, removeSection])

  const handleToggleAvatar = useCallback((): void => {
    const nextVisible = !showAvatar
    updateDraft('baseInfo.showAvatar', (resume) => {
      const baseInfo = resume.baseInfo ?? {}
      resume.baseInfo = { ...baseInfo, showAvatar: nextVisible }
    })
    toast.success(nextVisible ? '已显示证件照' : '已隐藏证件照')
  }, [showAvatar, updateDraft])

  const handleToggleJobIntention = useCallback((): void => {
    const nextVisible = !showJobIntention
    updateDraft('jobIntentionVisible', (resume) => {
      resume.jobIntentionVisible = nextVisible
    })
    toast.success(nextVisible ? '已显示求职意向' : '已隐藏求职意向')
  }, [showJobIntention, updateDraft])

  const handleToggleHeaderJobIntention = useCallback((): void => {
    if (!showJobIntention) return
    const nextVisible = !showHeaderJobIntention
    updateDraft('headerJobIntentionVisible', (resume) => {
      resume.headerJobIntentionVisible = nextVisible
    })
    toast.success(nextVisible ? '已显示头部求职意向' : '已隐藏头部求职意向')
  }, [showHeaderJobIntention, showJobIntention, updateDraft])

  const handleAddPortfolio = useCallback((): void => {
    updateDraft('portfolio', (resume) => {
      resume.portfolio = {
        ...(resume.portfolio ?? createEmptyPortfolio()),
        enabled: true,
      }
    })
    toast.success('已添加图片作品集')
    onClose()
    router.push('/m/edit/portfolio')
  }, [onClose, router, updateDraft])

  const handleTogglePortfolio = useCallback((): void => {
    if (!draft?.portfolio) return
    const nextVisible = !showPortfolio
    updateDraft('portfolio.enabled', (resume) => {
      if (resume.portfolio) resume.portfolio.enabled = nextVisible
    })
    toast.success(nextVisible ? '已显示图片作品集' : '已隐藏图片作品集，已上传图片仍会保留')
  }, [draft?.portfolio, showPortfolio, updateDraft])

  const handleEditPortfolio = useCallback((): void => {
    onClose()
    router.push('/m/edit/portfolio')
  }, [onClose, router])

  const items = sections.map((s) => s.id)

  const pendingLabel =
    pendingRemove
      ? (findModuleBySectionTitle(pendingRemove.title)?.label ?? pendingRemove.title)
      : ''

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="模块管理"
        height="75dvh"
        contentClassName="pb-safe"
      >
        <p className="mb-3 text-[12px] text-slate-400">
          控制基础展示项；长按拖动调整模块顺序，点击红色按钮移除模块。
        </p>

        <div className="mb-3 flex flex-col gap-2">
          <VisibilityControlRow
            icon={<ImageIcon size={17} />}
            label="证件照"
            description="控制简历顶部头像是否显示"
            visible={showAvatar}
            onToggle={handleToggleAvatar}
          />
          <VisibilityControlRow
            icon={<Target size={17} />}
            label="求职意向"
            description="控制求职意向模块是否显示"
            visible={showJobIntention}
            onToggle={handleToggleJobIntention}
          />
          <VisibilityControlRow
            icon={<Target size={17} />}
            label="头部求职意向"
            description="只控制简历头部的岗位文字"
            visible={showHeaderJobIntention}
            disabled={!showJobIntention}
            onToggle={handleToggleHeaderJobIntention}
          />
        </div>

        {sections.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-400">
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
                    onRequestRemove={setPendingRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-5">
          <div className="mb-2 text-[12px] font-semibold text-slate-500">附加内容</div>
          {hasPortfolio ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                showPortfolio ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400',
              )}>
                <Images size={17} />
              </div>
              <button type="button" onClick={handleEditPortfolio} className="min-w-0 flex-1 text-left">
                <span className={cn(
                  'block truncate text-[14px] font-semibold',
                  showPortfolio ? 'text-slate-900' : 'text-slate-400',
                )}>
                  图片作品集
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  {portfolioImageCount > 0 ? `${portfolioImageCount} 张图片` : '尚未上传图片'} · 固定附在正文后
                </span>
              </button>
              <button
                type="button"
                data-toggle-portfolio
                onClick={handleTogglePortfolio}
                aria-label={`${showPortfolio ? '隐藏' : '显示'}图片作品集`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 active:bg-slate-200"
              >
                {showPortfolio ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                type="button"
                data-edit-portfolio
                onClick={handleEditPortfolio}
                aria-label="编辑图片作品集"
                className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-add-portfolio
              onClick={handleAddPortfolio}
              className="flex w-full items-center gap-3 rounded-[14px] border border-dashed border-violet-200 bg-violet-50/60 px-3 py-3 text-left active:bg-violet-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                <Images size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-slate-900">图片作品集</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  上传作品图片，随 PDF 一起导出
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-violet-600">
                <Plus size={14} />
                添加
              </span>
            </button>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(v): void => { if (!v) setPendingRemove(null) }}
        title={`删除「${pendingLabel}」`}
        description={`删除后该模块的所有内容将丢失，且无法恢复。确定要删除吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
        onConfirm={handleConfirmRemove}
      />
    </>
  )
}

function VisibilityControlRow(props: {
  readonly icon: ReactNode
  readonly label: string
  readonly description: string
  readonly visible: boolean
  readonly disabled?: boolean
  readonly onToggle: () => void
}): ReactElement {
  const { icon, label, description, visible, disabled = false, onToggle } = props
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-[14px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]',
      disabled ? 'opacity-60' : '',
    )}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
        visible ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400',
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[14px] font-semibold', visible ? 'text-slate-900' : 'text-slate-400')}>
          {label}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-400">{description}</div>
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
        onClick={onToggle}
        disabled={disabled}
        aria-label={`${visible ? '隐藏' : '显示'}${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  )
}

interface ManageRowProps {
  readonly section: Section
  readonly onRequestRemove: (section: Section) => void
}

function SortableManageRow({ section, onRequestRemove }: ManageRowProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  }

  const moduleConfig = findModuleBySectionTitle(section.title)
  const label = moduleConfig?.label ?? section.title
  const isRequired = moduleConfig?.required ?? false

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative flex touch-none cursor-grab items-center gap-3 rounded-[14px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-shadow active:cursor-grabbing',
        isDragging && 'border-violet-200 shadow-[0_12px_28px_rgba(124,58,237,0.18)] ring-2 ring-violet-200',
      )}
    >
      {/* Drag handle */}
      <div
        className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-300"
      >
        <GripVertical size={17} />
      </div>

      {/* Label + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-slate-900">{label}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {section.blocks.length > 0 ? `${section.blocks.length} 条内容` : '未填写'}
        </div>
      </div>

      {/* Delete button — only for non-required modules */}
      {isRequired ? (
        <div className="h-8 w-8 shrink-0" />
      ) : (
        <button
          type="button"
          onPointerDown={(e): void => { e.stopPropagation() }}
          onMouseDown={(e): void => { e.stopPropagation() }}
          onTouchStart={(e): void => { e.stopPropagation() }}
          onClick={(e): void => {
            e.stopPropagation()
            onRequestRemove(section)
          }}
          aria-label={`删除${label}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-50 active:bg-red-100"
        >
          <Trash2 size={15} strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
