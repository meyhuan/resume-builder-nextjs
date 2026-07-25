/**
 * SectionManager — 模块管理面板
 *
 * Top: current resume sections (个人信息 pinned with photo toggle,
 *      求职意向 + other sections with remove ⊖ buttons).
 * Bottom: "添加模块" — 2-column grid of predefined section types
 *         that are NOT already present in the resume.
 */
import { useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, Images, MinusCircle, PlusSquare, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/state/store'
import type { Section } from '@/entities/resume/section'
import { getSectionTypeRegistry } from '@/entities/blocks/block-factory'
import { createEmptyPortfolio } from '@/entities/resume/portfolio'

/** Derive addable section labels from the central registry. */
const PREDEFINED_LABELS: readonly string[] = getSectionTypeRegistry().map((e) => e.label)
const CUSTOM_SECTION_LABEL = '自定义模块'

function normalizeSectionTitle(title: string): string {
  return title.replace(/\s/g, '')
}

function getUniqueCustomSectionTitle(existingTitles: ReadonlySet<string>): string {
  const usedTitles: Set<string> = new Set(
    Array.from(existingTitles, (title) => normalizeSectionTitle(title))
  )
  const baseTitle: string = CUSTOM_SECTION_LABEL
  if (!usedTitles.has(normalizeSectionTitle(baseTitle))) return baseTitle

  let suffix = 2
  while (usedTitles.has(normalizeSectionTitle(`${baseTitle} ${suffix}`))) {
    suffix += 1
  }
  return `${baseTitle} ${suffix}`
}

/** Props accepted by the top-level panel. */
export interface SectionManagerProps {
  readonly onClose: () => void
  readonly onOpenPortfolio: () => void
}

/**
 * 模块管理 panel rendered inside the right sidebar.
 */
export default function SectionManager(props: SectionManagerProps): ReactElement {
  const { onClose } = props
  const resume = useAppStore((s) => s.resume)
  const moveSection = useAppStore((s) => s.moveSection)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const addSection = useAppStore((s) => s.addSection)
  const setAvatarVisibility = useAppStore((s) => s.setAvatarVisibility)
  const setJobIntentionVisibility = useAppStore((s) => s.setJobIntentionVisibility)
  const setHeaderJobIntentionVisibility = useAppStore((s) => s.setHeaderJobIntentionVisibility)
  const setResume = useAppStore((s) => s.setResume)
  const showPhotoAvatar: boolean = resume.baseInfo?.showAvatar !== false
  const isJobIntentionVisible: boolean = resume.jobIntentionVisible !== false
  const isHeaderJobIntentionVisible: boolean = isJobIntentionVisible && resume.headerJobIntentionVisible !== false
  const hasPortfolio: boolean = resume.portfolio !== undefined
  const isPortfolioVisible: boolean = resume.portfolio?.enabled === true
  const portfolioImageCount: number = resume.portfolio?.images.length ?? 0
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    moveSection(String(active.id), String(over.id))
  }

  const sectionIds: string[] = resume.sections.map((s) => s.id)
  const existingTitles: Set<string> = useMemo(
    () => new Set(resume.sections.map((s) => s.title)),
    [resume.sections]
  )
  const availableLabels: string[] = useMemo(
    () => PREDEFINED_LABELS.filter((label) => (
      label === CUSTOM_SECTION_LABEL || !existingTitles.has(label)
    )),
    [existingTitles]
  )

  function handleAddSection(label: string): void {
    addSection(
      label === CUSTOM_SECTION_LABEL
        ? getUniqueCustomSectionTitle(existingTitles)
        : label
    )
  }

  function handleAddPortfolio(): void {
    setResume((draft) => {
      draft.portfolio = {
        ...(draft.portfolio ?? createEmptyPortfolio()),
        enabled: true,
      }
    })
    toast.success('已添加图片作品集')
    props.onOpenPortfolio()
  }

  function handleTogglePortfolio(): void {
    if (!resume.portfolio) return
    const nextVisible = !isPortfolioVisible
    setResume((draft) => {
      if (draft.portfolio) draft.portfolio.enabled = nextVisible
    })
    toast.success(nextVisible ? '已显示图片作品集' : '已隐藏图片作品集，已上传图片仍会保留')
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-slate-800">模块管理</h2>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {/* Pinned: 个人信息 */}
        <SectionRow label="个人信息">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-[#8B5CF6] w-3.5 h-3.5 rounded-sm border-slate-300"
              checked={showPhotoAvatar}
              onChange={(e) => setAvatarVisibility(e.target.checked)}
            />
            照片
          </label>
        </SectionRow>

        {/* Pinned: 求职意向 */}
        <SectionRow label="求职意向 / 岗位">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-[#8B5CF6] w-3.5 h-3.5 rounded-sm border-slate-300"
                checked={isJobIntentionVisible}
                onChange={(e) => setJobIntentionVisibility(e.target.checked)}
              />
              模块
            </label>
            <label className={`flex items-center gap-1.5 text-xs font-medium select-none ${isJobIntentionVisible ? 'cursor-pointer text-slate-500' : 'cursor-not-allowed text-slate-300'}`}>
              <input
                type="checkbox"
                className="accent-[#8B5CF6] w-3.5 h-3.5 rounded-sm border-slate-300 disabled:opacity-50"
                checked={isHeaderJobIntentionVisible}
                disabled={!isJobIntentionVisible}
                onChange={(e) => setHeaderJobIntentionVisibility(e.target.checked)}
              />
              头部
            </label>
          </div>
        </SectionRow>

        {/* Draggable sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {resume.sections.map((section: Section) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                onDelete={() => deleteSection(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add module grid */}
        {availableLabels.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">添加模块</p>
            <div className="grid grid-cols-2 gap-2">
              {availableLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white bg-white/60 backdrop-blur-md shadow-sm text-sm font-medium text-slate-600 hover:border-[#8B5CF6]/30 hover:bg-white/90 hover:text-[#8B5CF6] transition-all"
                  onClick={() => handleAddSection(label)}
                >
                  <PlusSquare size={16} className="text-[#8B5CF6] shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-slate-700">附加内容</p>
          {hasPortfolio ? (
            <div className="rounded-xl border border-white bg-white/60 px-3 py-3 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isPortfolioVisible ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Images size={18} />
                </span>
                <button
                  type="button"
                  data-edit-portfolio
                  className="min-w-0 flex-1 text-left"
                  onClick={props.onOpenPortfolio}
                >
                  <span className="block text-sm font-medium text-slate-700">图片作品集</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {portfolioImageCount > 0 ? `${portfolioImageCount} 张图片` : '尚未上传图片'} · 固定附在正文后
                  </span>
                </button>
                <button
                  type="button"
                  data-toggle-portfolio
                  aria-label={`${isPortfolioVisible ? '隐藏' : '显示'}图片作品集`}
                  title={isPortfolioVisible ? '隐藏作品集' : '显示作品集'}
                  onClick={handleTogglePortfolio}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600"
                >
                  {isPortfolioVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-add-portfolio
              onClick={handleAddPortfolio}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-3 py-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                <Images size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-700">图片作品集</span>
                <span className="mt-0.5 block text-xs text-slate-400">上传作品图片，随 PDF 一起导出</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-violet-600">
                <PlusSquare size={15} />
                添加
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** A static (non-draggable) section row. */
function SectionRow(props: {
  readonly label: string
  readonly children?: ReactNode
}): ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3 mb-2 rounded-xl border border-white bg-white/60 backdrop-blur-md shadow-sm">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      {props.children}
    </div>
  )
}


/** A draggable section row using @dnd-kit/sortable. */
function SortableSectionRow(props: {
  readonly section: Section
  readonly onDelete: () => void
}): ReactElement {
  const { section, onDelete } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-4 py-3 mb-2 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging 
          ? 'border-[#8B5CF6] bg-white shadow-md scale-[1.02]' 
          : 'border-white bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="text-sm font-medium text-slate-700">{section.title}</span>
      <button
        type="button"
        className="text-slate-300 hover:text-rose-500 transition-colors"
        title="移除"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <MinusCircle size={18} />
      </button>
    </div>
  )
}
