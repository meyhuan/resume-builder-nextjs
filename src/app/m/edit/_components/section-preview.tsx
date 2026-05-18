'use client'

import { type ComponentType, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  FolderKanban,
  GraduationCap,
  GripVertical,
  Pencil,
  Plus,
  School,
  Sparkles,
  Wrench,
  type LucideProps,
} from 'lucide-react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ModuleConfig, ModuleKey } from '@/entities/module/module-config'
import type { Section } from '@/entities/resume/section'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'
import { cn } from '@/lib/utils'

export interface SectionPreviewProps {
  readonly section: Section
  readonly module: ModuleConfig | null
  readonly dragging?: boolean
  readonly dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  readonly onAddItem?: () => number
}

export function SectionPreview(
  { section, module, dragging, dragHandleProps, onAddItem }: SectionPreviewProps,
): ReactElement {
  const router = useRouter()
  const label: string = module?.label ?? section.title
  const baseRoute: string = module?.route ?? `/m/edit/custom/${section.id}`
  const isEmpty: boolean = section.blocks.length === 0 || (
    section.blocks.length === 1 &&
    section.blocks[0].type === 'text' &&
    !htmlToPlainText(section.blocks[0].html)
  )
  const isDefault: boolean = !isEmpty && section.blocks.every(isDefaultBlock)
  const Icon = getModuleIcon(module?.key)

  const renderItems = (): ReactElement | null => {
    if (section.blocks.length === 0) return null
    if (module?.isList) {
      return (
        <div className="mt-3 flex flex-col gap-2">
          {section.blocks.slice(0, 2).map((b, idx) => (
            <button
              key={b.id}
              type="button"
              onClick={(): void => router.push(`${baseRoute}/${idx}`)}
              className="rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-colors active:bg-slate-100"
            >
              <BlockSummary block={b} />
            </button>
          ))}
          {section.blocks.length > 2 && (
            <button
              type="button"
              onClick={(): void => router.push(baseRoute)}
              className="text-left text-[12px] font-medium text-violet-700"
            >
              还有 {section.blocks.length - 2} 条内容，点击查看全部
            </button>
          )}
        </div>
      )
    }

    const textBlock = section.blocks.find((b) => b.type === 'text')
    if (textBlock && textBlock.type === 'text') {
      const plain: string = htmlToPlainText(textBlock.html)
      if (!plain) return null
      return (
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="mt-3 block w-full rounded-xl bg-slate-50 px-3 py-2.5 text-left text-[13px] leading-6 text-slate-600 line-clamp-3 active:bg-slate-100 transition-colors"
        >
          {plain}
        </button>
      )
    }
    return null
  }

  return (
    <article
      className={cn(
        'rounded-[18px] border border-[#edf0f5] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition-shadow',
        dragging && 'ring-2 ring-violet-300 shadow-lg',
      )}
    >
      <div className="grid grid-cols-[32px_1fr_auto_16px] items-center gap-2">
        {dragHandleProps ? (
          <div {...dragHandleProps} className="flex h-8 w-8 touch-none items-center justify-center rounded-xl bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing">
            <GripVertical size={16} />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1efff] text-[#6c47ff]">
            <Icon size={18} strokeWidth={2.1} />
          </div>
        )}
        <button
          type="button"
          onClick={(): void => {
            if (module?.isList && section.blocks.length === 1) {
              router.push(`${baseRoute}/0`)
            } else {
              router.push(baseRoute)
            }
          }}
          className="min-w-0 text-left"
        >
          <div className="truncate text-[14px] font-semibold leading-5 text-slate-950">{label}</div>
          <div className="mt-0.5 truncate text-[12px] leading-4 text-slate-500">
            {getModuleSubtitle(section, isEmpty, isDefault)}
          </div>
        </button>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            isEmpty ? 'bg-slate-100 text-slate-500' : isDefault ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          {isEmpty ? '未填写' : isDefault ? '待完善' : '已填写'}
        </span>
        <ChevronRight size={16} className="text-slate-300" />
      </div>

      {isEmpty ? (
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="mt-2 block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-[12px] leading-5 text-slate-500"
        >
          {getEmptyCopy(module?.key, label)}
        </button>
      ) : (
        renderItems()
      )}

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
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-1.5 text-[12px] font-medium text-violet-700 active:bg-violet-50"
        >
          <Plus size={13} />
          添加一条
        </button>
      )}

      {!module?.isList && !isEmpty && (
        <button
          type="button"
          onClick={(): void => router.push(baseRoute)}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-slate-500"
        >
          <Pencil size={12} />
          编辑
        </button>
      )}
    </article>
  )
}

function getModuleIcon(key?: ModuleKey): ComponentType<LucideProps> {
  switch (key) {
    case 'workExp':
    case 'internExp':
      return BriefcaseBusiness
    case 'eduExp':
      return GraduationCap
    case 'programExp':
      return FolderKanban
    case 'schoolExp':
      return School
    case 'skill':
      return Wrench
    case 'qualifications':
      return Award
    case 'summary':
      return FileText
    default:
      return Sparkles
  }
}

function getModuleSubtitle(section: Section, isEmpty: boolean, isDefault: boolean = false): string {
  if (isEmpty) return '点击填写模块内容'
  if (isDefault) return '请替换默认内容'
  const count = section.blocks.length
  if (count > 1) return `${count} 条内容`
  return '已添加内容'
}

function isDefaultBlock(block: ResumeBlock): boolean {
  switch (block.type) {
    case 'experience':
      return !isMeaningfulText(block.company) && !isMeaningfulText(block.position)
    case 'education':
      return !isMeaningfulText(block.school)
    case 'project':
      return !isMeaningfulText(block.name)
    case 'campus':
      return !isMeaningfulText(block.organization)
    default:
      return false
  }
}

function getEmptyCopy(key: ModuleKey | undefined, label: string): string {
  switch (key) {
    case 'workExp':
      return '请添加至少一段工作或实习经历。建议写清：公司、职位、时间、主要职责和成果。'
    case 'programExp':
      return '可填写课程项目、实习项目、比赛项目或个人项目。建议写清背景、角色、方法和成果。'
    case 'eduExp':
      return '请填写学校、学历、专业和在校时间。应届生可补充主修课程、GPA、奖学金等。'
    case 'skill':
      return '请添加与目标岗位相关的技能，例如 Excel、SQL、数据分析、沟通能力等。'
    case 'summary':
      return '请用 100-200 字概括你的优势，包含专业背景、核心能力和目标岗位匹配度。'
    case 'qualifications':
      return '可填写奖学金、竞赛获奖、职业证书、英语等级等。'
    case 'schoolExp':
      return '可填写学生会、社团、志愿活动、班委经历等，建议写清角色和结果。'
    default:
      return `请补充${label}内容，让简历信息更完整。`
  }
}

function BlockSummary({ block }: { readonly block: ResumeBlock }): ReactElement {
  switch (block.type) {
    case 'experience':
      return (
        <>
          <div className="flex items-start justify-between gap-2 text-sm font-medium text-slate-900">
            <span className="min-w-0 truncate">
              {isMeaningfulText(block.position) ? block.position : '未填写职位'}
              {isMeaningfulText(block.company) && <span className="font-normal text-slate-500"> · {block.company}</span>}
            </span>
            <span className="shrink-0 text-[11px] font-normal text-slate-400">{formatDateRange(block.startDate, block.endDate)}</span>
          </div>
          {block.contentHtml && <div className="mt-1 text-[12px] leading-5 text-slate-500 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
        </>
      )
    case 'education':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {isMeaningfulText(block.school) ? block.school : '未填写学校'}
            {isMeaningfulText(block.major) && <span className="font-normal text-slate-500"> · {block.major}</span>}
          </div>
          <div className="mt-0.5 text-[12px] text-slate-400 truncate">
            {[block.degree, formatDateRange(block.startDate, block.endDate)].filter(Boolean).join(' · ')}
          </div>
        </>
      )
    case 'project':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {isMeaningfulText(block.name) ? block.name : '未填写项目'}
            {isMeaningfulText(block.role) && <span className="font-normal text-slate-500"> · {block.role}</span>}
          </div>
          {block.contentHtml && <div className="mt-1 text-[12px] leading-5 text-slate-500 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
        </>
      )
    case 'campus':
      return (
        <>
          <div className="text-sm font-medium text-slate-900 truncate">
            {isMeaningfulText(block.organization) ? block.organization : '未填写组织'}
            {isMeaningfulText(block.position) && <span className="font-normal text-slate-500"> · {block.position}</span>}
          </div>
          {block.contentHtml && <div className="mt-1 text-[12px] leading-5 text-slate-500 line-clamp-2">{htmlToPlainText(block.contentHtml)}</div>}
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
