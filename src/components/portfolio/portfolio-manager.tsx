'use client'

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react'
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
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEmptyPortfolio,
  MAX_PORTFOLIO_IMAGES,
  type PortfolioImage,
  type ResumePortfolio,
} from '@/entities/resume/portfolio'

interface PortfolioManagerProps {
  readonly resumeId: string | null
  readonly portfolio?: ResumePortfolio
  readonly onChange: (portfolio: ResumePortfolio) => void
  readonly compact?: boolean
  readonly onRequireResumeId?: () => Promise<string | null>
}

interface UploadResponse {
  readonly id: string
  readonly url: string
  readonly objectKey: string
  readonly width: number
  readonly height: number
  readonly error?: string
}

export default function PortfolioManager(props: PortfolioManagerProps): ReactElement {
  const portfolio = props.portfolio ?? createEmptyPortfolio()
  const [uploadingCount, setUploadingCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const updateImages = (images: readonly PortfolioImage[]): void => {
    props.onChange({
      ...portfolio,
      enabled: true,
      images: images.map((image, index) => ({ ...image, sortOrder: index })),
    })
  }

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const targetResumeId = props.resumeId ?? await props.onRequireResumeId?.() ?? null
    if (!targetResumeId) {
      toast.error('请先保存简历，再上传作品图片')
      return
    }
    const remaining = MAX_PORTFOLIO_IMAGES - portfolio.images.length
    const selected = files.slice(0, remaining)
    if (selected.length === 0) return
    if (files.length > remaining) {
      toast.info(`最多还能上传 ${remaining} 张图片`)
    }

    setUploadingCount(selected.length)
    const results: Array<PortfolioImage | null> = Array.from({ length: selected.length }, () => null)
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (cursor < selected.length) {
        const index = cursor
        cursor += 1
        const file = selected[index]
        try {
          const form = new FormData()
          form.append('file', file)
          const response = await fetch(`/next-api/resumes/${targetResumeId}/portfolio-images`, {
            method: 'POST',
            body: form,
          })
          const result = await response.json() as UploadResponse
          if (!response.ok) throw new Error(result.error || '上传失败')
          results[index] = {
            id: result.id,
            url: result.url,
            objectKey: result.objectKey,
            width: result.width,
            height: result.height,
            sortOrder: portfolio.images.length + index,
          }
        } catch (error: unknown) {
          toast.error(`${file.name}：${error instanceof Error ? error.message : '上传失败'}`)
        } finally {
          setUploadingCount((count) => Math.max(0, count - 1))
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, selected.length) }, () => worker()))
    const uploaded = results.filter((image): image is PortfolioImage => image !== null)
    if (uploaded.length > 0) {
      updateImages([...portfolio.images, ...uploaded])
      toast.success(`已上传 ${uploaded.length} 张作品图片`)
    }
  }

  const reorderImages = (activeId: string | number, overId: string | number): void => {
    if (activeId === overId) return
    const from = portfolio.images.findIndex((image) => image.id === activeId)
    const to = portfolio.images.findIndex((image) => image.id === overId)
    if (from < 0 || to < 0) return
    updateImages(arrayMove([...portfolio.images], from, to))
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    if (event.over) {
      reorderImages(event.active.id, event.over.id)
    }
  }

  const handleDelete = (image: PortfolioImage): void => {
    updateImages(portfolio.images.filter((item) => item.id !== image.id))
  }

  return (
    <div data-portfolio-manager="true" className={props.compact ? 'space-y-4' : 'space-y-5 px-4 pb-5'}>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600" htmlFor="portfolio-title">作品集标题</label>
        <input
          id="portfolio-title"
          data-portfolio-title="true"
          value={portfolio.title}
          maxLength={30}
          onChange={(event): void => props.onChange({ ...portfolio, title: event.target.value, enabled: true })}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="作品集"
        />
      </div>

      <button
        type="button"
        onClick={(): void => inputRef.current?.click()}
        disabled={uploadingCount > 0 || portfolio.images.length >= MAX_PORTFOLIO_IMAGES}
        className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 px-4 text-sm font-semibold text-violet-600 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploadingCount > 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
        <span>{uploadingCount > 0 ? `正在上传 ${uploadingCount} 张…` : '批量上传作品图片'}</span>
        <span className="text-[11px] font-normal text-slate-400">JPG、PNG、WebP，单张不超过 10MB</span>
      </button>
      <input
        ref={inputRef}
        data-portfolio-upload-input="true"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event): void => { void handleFiles(event) }}
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>拖动图片调整 PDF 中的顺序</span>
        <span>{portfolio.images.length}/{MAX_PORTFOLIO_IMAGES}</span>
      </div>

      {portfolio.images.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          上传后，作品会从简历下一页开始自动排版。
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={portfolio.images.map((image) => image.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {portfolio.images.map((image, index) => (
                <SortablePortfolioImage
                  key={image.id}
                  image={image}
                  index={index}
                  canMovePrevious={index > 0}
                  canMoveNext={index < portfolio.images.length - 1}
                  onMovePrevious={() => updateImages(arrayMove([...portfolio.images], index, index - 1))}
                  onMoveNext={() => updateImages(arrayMove([...portfolio.images], index, index + 1))}
                  onCaptionChange={(caption): void => {
                    updateImages(portfolio.images.map((item) => (
                      item.id === image.id ? { ...item, caption } : item
                    )))
                  }}
                  onDelete={(): void => handleDelete(image)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortablePortfolioImage(props: {
  readonly image: PortfolioImage
  readonly index: number
  readonly canMovePrevious: boolean
  readonly canMoveNext: boolean
  readonly onMovePrevious: () => void
  readonly onMoveNext: () => void
  readonly onCaptionChange: (caption: string) => void
  readonly onDelete: () => void
}): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.image.id,
  })
  return (
    <div
      ref={setNodeRef}
      data-portfolio-image-id={props.image.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isDragging ? 'border-violet-400 opacity-70' : 'border-slate-200'}`}
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <img src={props.image.url} alt={props.image.caption || `作品 ${props.index + 1}`} className="h-full w-full object-contain" />
        <div className="absolute left-2 top-2 flex gap-1">
          <button
            type="button"
            aria-label="拖动排序"
            data-portfolio-drag-handle="true"
            className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-slate-900/70 text-white"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <button
            type="button"
            aria-label="向前移动"
            disabled={!props.canMovePrevious}
            onClick={props.onMovePrevious}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="向后移动"
            disabled={!props.canMoveNext}
            onClick={props.onMoveNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          type="button"
          aria-label="删除图片"
          onClick={props.onDelete}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-rose-500 shadow"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <input
        value={props.image.caption ?? ''}
        data-portfolio-caption="true"
        maxLength={80}
        onChange={(event): void => props.onCaptionChange(event.target.value)}
        className="h-10 w-full border-0 border-t border-slate-100 px-2.5 text-xs outline-none"
        placeholder="图片说明（选填）"
      />
    </div>
  )
}
