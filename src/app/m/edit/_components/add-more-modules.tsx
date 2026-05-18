'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Award, BriefcaseBusiness, FilePlus2, FolderKanban, GraduationCap, Plus, School, Sparkles, Wrench } from 'lucide-react'
import type { ModuleConfig, ModuleKey } from '@/entities/module/module-config'
import { useSectionList } from '@/features/edit/draft/use-section-list'

interface AddMoreModulesProps {
  readonly emptyModules: readonly ModuleConfig[]
}

/**
 * Addable modules, styled as low-friction dashboard cards.
 */
export function AddMoreModules({ emptyModules }: AddMoreModulesProps): ReactElement | null {
  if (emptyModules.length === 0) return null
  return (
    <section className="mt-6 px-[18px]">
      <div className="mb-3 px-1">
        <div className="text-[15px] font-semibold text-slate-900">添加模块</div>
        <div className="mt-0.5 text-[12px] text-slate-500">点击添加需要的模块</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {emptyModules.map((m) => (
          m.isList && m.sectionTitle
            ? <ListModuleChip key={m.key} module={m} />
            : <ModuleChip key={m.key} module={m} />
        ))}
      </div>
    </section>
  )
}

function ModuleChip({ module }: { readonly module: ModuleConfig }): ReactElement {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={(): void => router.push(module.route)}
      className="rounded-[14px] border border-[#edf0f5] bg-white px-3 py-2.5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:border-violet-200 active:scale-[0.98]"
    >
      <ChipContent module={module} />
    </button>
  )
}

function ListModuleChip({ module }: { readonly module: ModuleConfig }): ReactElement {
  const router = useRouter()
  const { addBlock, blocks } = useSectionList(module.sectionTitle!)
  const handleClick = (): void => {
    const newIdx: number = blocks.length
    addBlock()
    router.push(`${module.route}/${newIdx}`)
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-[14px] border border-[#edf0f5] bg-white px-3 py-2.5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:border-violet-200 active:scale-[0.98]"
    >
      <ChipContent module={module} />
    </button>
  )
}

function ChipContent({ module }: { readonly module: ModuleConfig }): ReactElement {
  const Icon = getChipIcon(module.key)
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon size={13} strokeWidth={2.2} className="shrink-0 text-slate-600" />
          <span className="text-[13px] font-semibold text-slate-800">{module.label}</span>
        </div>
        <Plus size={12} className="shrink-0 text-slate-400" />
      </div>
      <div className="mt-1 text-[11px] leading-4 text-slate-400">{getModuleValue(module.key)}</div>
    </div>
  )
}

function getChipIcon(key: ModuleKey) {
  switch (key) {
    case 'workExp':
    case 'internExp':
      return BriefcaseBusiness
    case 'programExp':
      return FolderKanban
    case 'eduExp':
      return GraduationCap
    case 'schoolExp':
      return School
    case 'skill':
      return Wrench
    case 'qualifications':
      return Award
    case 'custom':
      return FilePlus2
    default:
      return Sparkles
  }
}

function getModuleValue(key: ModuleKey): string {
  switch (key) {
    case 'workExp':
      return '展示工作经历与成果'
    case 'internExp':
      return '展示实习经历与成果'
    case 'programExp':
      return '展示项目经历与成果'
    case 'eduExp':
      return '展示教育经历与成绩'
    case 'schoolExp':
      return '展示校园经历与成果'
    case 'summary':
      return '写下你的软实力更加分'
    case 'skill':
      return '展示你的职业专业性'
    case 'qualifications':
      return '突出特长助你脱颖而出'
    case 'intention':
      return '定向投递更精准'
    case 'custom':
      return '添加其他个人亮点'
    default:
      return '让简历更完整'
  }
}
