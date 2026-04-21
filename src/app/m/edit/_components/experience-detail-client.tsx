'use client'

import { useMemo, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { useSectionList } from '@/features/edit/draft/use-section-list'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ExperienceBlock } from '@/entities/blocks/experience-block'
import type { EducationBlock } from '@/entities/blocks/education-block'
import type { ProjectBlock } from '@/entities/blocks/project-block'
import type { CampusBlock } from '@/entities/blocks/campus-block'
import { ModuleEditShell } from './module-edit-shell'
import type { ValidationResult } from './module-edit-shell'
import { validateRequired } from './validators'
import { TextField } from '@/features/edit/form-fields/text-field'
import { MonthPickerField } from '@/features/edit/form-fields/month-picker-field'
import { TagSelectField } from '@/features/edit/form-fields/tag-select-field'
import { AutocompleteField } from '@/features/edit/form-fields/autocomplete-field'
import { RichAiTextarea } from '@/features/edit/form-fields/rich-ai-textarea'
import { INDUSTRY_OPTIONS } from '@/data/dictionaries/industries'
import { DEGREE_OPTIONS } from '@/data/dictionaries/base-enums'
import type { SectionModuleType } from '@/lib/ai/section-types'

export type ExperienceKind = 'work' | 'intern' | 'education' | 'project' | 'campus'

export interface ExperienceDetailClientProps {
  readonly kind: ExperienceKind
  readonly title: string
  readonly sectionTitle: string
  readonly idx: number
  readonly backRoute: string
}

/**
 * Generic detail page for experience-like blocks. Dispatches on `kind` to
 * render the appropriate field set and binds each field to the draft block.
 */
export function ExperienceDetailClient(props: ExperienceDetailClientProps): ReactElement {
  const { kind, title, sectionTitle, idx, backRoute } = props
  const router = useRouter()
  const { blocks, updateBlock } = useSectionList(sectionTitle)
  const block: ResumeBlock | undefined = blocks[idx]

  const handleFieldChange = useMemo(
    () => (patch: Partial<ResumeBlock>): void => {
      if (!block) return
      updateBlock(block.id, patch)
    },
    [block, updateBlock],
  )

  if (!block) {
    return (
      <ModuleEditShell title={title} onBack={(): void => router.replace(backRoute)}>
        <div className="text-center py-12 text-sm text-slate-500">
          <div className="text-4xl mb-3">🤔</div>
          这条内容不存在或已被删除
        </div>
      </ModuleEditShell>
    )
  }

  const validate = (): ValidationResult => {
    switch (kind) {
      case 'work':
      case 'intern': {
        const b = block as ExperienceBlock
        return validateRequired([
          { label: '公司名称', value: b.company },
          { label: kind === 'intern' ? '实习岗位' : '职位名称', value: b.position },
          { label: '开始时间', value: b.startDate },
        ])
      }
      case 'education': {
        const b = block as EducationBlock
        return validateRequired([
          { label: '学校名称', value: b.school },
          { label: '开始时间', value: b.startDate },
        ])
      }
      case 'project': {
        const b = block as ProjectBlock
        return validateRequired([
          { label: '项目名称', value: b.name },
          { label: '开始时间', value: b.startDate },
        ])
      }
      case 'campus': {
        const b = block as CampusBlock
        return validateRequired([
          { label: '组织名称', value: b.organization },
          { label: '担任职务', value: b.position },
          { label: '开始时间', value: b.startDate },
        ])
      }
      default:
        return { ok: true }
    }
  }

  return (
    <ModuleEditShell title={title} onBack={(): void => router.replace(backRoute)} validate={validate}>
      {kind === 'work' && <WorkFields block={block as ExperienceBlock} onChange={handleFieldChange} moduleType="experience" />}
      {kind === 'intern' && <WorkFields block={block as ExperienceBlock} onChange={handleFieldChange} moduleType="experience" internship />}
      {kind === 'education' && <EducationFields block={block as EducationBlock} onChange={handleFieldChange} />}
      {kind === 'project' && <ProjectFields block={block as ProjectBlock} onChange={handleFieldChange} />}
      {kind === 'campus' && <CampusFields block={block as CampusBlock} onChange={handleFieldChange} />}
    </ModuleEditShell>
  )
}

type OnChange<T> = (patch: Partial<T>) => void

interface WorkFieldsProps {
  readonly block: ExperienceBlock
  readonly onChange: OnChange<ExperienceBlock>
  readonly moduleType: SectionModuleType
  readonly internship?: boolean
}

function WorkFields({ block, onChange, moduleType, internship }: WorkFieldsProps): ReactElement {
  return (
    <>
      <TextField
        label="公司名称"
        value={block.company}
        onValueChange={(v): void => onChange({ company: v })}
        required
        placeholder="请输入公司全称"
      />
      <TextField
        label={internship ? '实习岗位' : '职位名称'}
        value={block.position}
        onValueChange={(v): void => onChange({ position: v })}
        required
        placeholder={internship ? '例如：前端开发实习生' : '例如：高级前端工程师'}
      />
      <AutocompleteField
        label="所属行业"
        options={INDUSTRY_OPTIONS}
        value={block.industry ?? ''}
        onValueChange={(v): void => onChange({ industry: v })}
        placeholder="选择或输入行业"
      />
      <div className="grid grid-cols-2 gap-3">
        <MonthPickerField
          label="开始时间"
          value={block.startDate}
          onValueChange={(v): void => onChange({ startDate: v })}
          required
        />
        <MonthPickerField
          label="结束时间"
          value={block.endDate}
          onValueChange={(v): void => onChange({ endDate: v })}
          allowPresent
        />
      </div>
      <RichAiTextarea
        label="工作描述"
        html={block.contentHtml}
        onHtmlChange={(v): void => onChange({ contentHtml: v })}
        placeholder={'具体简要地描述，将有助于 HR 第一时间发现你的亮点。\n\n• 动词开头，量化成果更有说服力\n• 一行一条，空行分段'}
        tip="用动词开头、量化成果更有说服力"
        moduleType={moduleType}
        minHeight={180}
      />
    </>
  )
}

interface EducationFieldsProps {
  readonly block: EducationBlock
  readonly onChange: OnChange<EducationBlock>
}

function EducationFields({ block, onChange }: EducationFieldsProps): ReactElement {
  return (
    <>
      <TextField
        label="学校名称"
        value={block.school}
        onValueChange={(v): void => onChange({ school: v })}
        required
        placeholder="请输入学校全称"
      />
      <TextField
        label="所学专业"
        value={block.major ?? ''}
        onValueChange={(v): void => onChange({ major: v })}
        placeholder="例如：计算机科学与技术"
      />
      <TagSelectField
        label="学历"
        options={DEGREE_OPTIONS}
        value={block.degree ?? ''}
        onValueChange={(v): void => onChange({ degree: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <MonthPickerField
          label="开始时间"
          value={block.startDate}
          onValueChange={(v): void => onChange({ startDate: v })}
          required
        />
        <MonthPickerField
          label="结束时间"
          value={block.endDate}
          onValueChange={(v): void => onChange({ endDate: v })}
          allowPresent
        />
      </div>
      <RichAiTextarea
        label="在校经历"
        html={block.courseHtml ?? ''}
        onHtmlChange={(v): void => onChange({ courseHtml: v })}
        placeholder="主修课程、GPA、校园活动、奖项等"
        tip="写与求职岗位相关的课程或成绩"
        moduleType="campus"
        minHeight={140}
      />
    </>
  )
}

interface ProjectFieldsProps {
  readonly block: ProjectBlock
  readonly onChange: OnChange<ProjectBlock>
}

function ProjectFields({ block, onChange }: ProjectFieldsProps): ReactElement {
  return (
    <>
      <TextField
        label="项目名称"
        value={block.name}
        onValueChange={(v): void => onChange({ name: v })}
        required
        placeholder="请输入项目名称"
      />
      <TextField
        label="项目角色"
        value={block.role ?? ''}
        onValueChange={(v): void => onChange({ role: v })}
        placeholder="例如：前端负责人"
      />
      <div className="grid grid-cols-2 gap-3">
        <MonthPickerField
          label="开始时间"
          value={block.startDate}
          onValueChange={(v): void => onChange({ startDate: v })}
          required
        />
        <MonthPickerField
          label="结束时间"
          value={block.endDate}
          onValueChange={(v): void => onChange({ endDate: v })}
          allowPresent
        />
      </div>
      <RichAiTextarea
        label="项目描述"
        html={block.contentHtml}
        onHtmlChange={(v): void => onChange({ contentHtml: v })}
        placeholder={'STAR 法则：情境 - 任务 - 行动 - 结果\n\n• 项目背景与目标\n• 你的主要工作\n• 技术栈与难点\n• 最终成果与影响'}
        tip="STAR 法则：情境-任务-行动-结果"
        moduleType="project"
        minHeight={180}
      />
    </>
  )
}

interface CampusFieldsProps {
  readonly block: CampusBlock
  readonly onChange: OnChange<CampusBlock>
}

function CampusFields({ block, onChange }: CampusFieldsProps): ReactElement {
  return (
    <>
      <TextField
        label="组织名称"
        value={block.organization}
        onValueChange={(v): void => onChange({ organization: v })}
        required
        placeholder="例如：校学生会、XX 协会"
      />
      <TextField
        label="担任职务"
        value={block.position}
        onValueChange={(v): void => onChange({ position: v })}
        required
        placeholder="例如：部长、副会长"
      />
      <div className="grid grid-cols-2 gap-3">
        <MonthPickerField
          label="开始时间"
          value={block.startDate}
          onValueChange={(v): void => onChange({ startDate: v })}
          required
        />
        <MonthPickerField
          label="结束时间"
          value={block.endDate}
          onValueChange={(v): void => onChange({ endDate: v })}
          allowPresent
        />
      </div>
      <RichAiTextarea
        label="主要经历"
        html={block.contentHtml}
        onHtmlChange={(v): void => onChange({ contentHtml: v })}
        placeholder="在组织中承担的职责和取得的成果"
        tip="量化成果（例如：组织 X 场活动，筹款 X 元）"
        moduleType="campus"
        minHeight={160}
      />
    </>
  )
}
