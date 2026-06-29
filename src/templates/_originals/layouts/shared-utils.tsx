"use client"

import { useState } from 'react'
import type { ReactElement } from 'react'
import { CalendarDays, GraduationCap, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { isTemplateExclusiveBaseInfoField } from '@/lib/template-exclusive-fields'
import { useAppStore } from '@/state/store'
import { AvatarSlot, FieldChip, SortableSection, lightenHex } from '@/templates/_core'
import type { DragHandleProps, EditableHeader } from '@/templates/_core'
import type { BaseInfoFieldDef } from '@/templates/_kernel/shared'
import type { VariantConfig } from '../types'
import { ConceptSection, sectionStackGap, scaledSpacing } from '../components'

export function refPx(px: number): number {
  return Math.round((px * 794) / 848)
}

export function moduleGap(config: Pick<VariantConfig, 'density' | 'formal'>, theme: ThemeTokens): number {
  return scaledSpacing(sectionStackGap(config), theme)
}

export function isSection(section: Section, pattern: RegExp): boolean {
  return pattern.test(section.title)
}

export function splitSections(sections: readonly Section[], pattern: RegExp): [Section[], Section[]] {
  const picked = sections.filter((section) => isSection(section, pattern))
  const pickedIds = new Set(picked.map((section) => section.id))
  return [picked, sections.filter((section) => !pickedIds.has(section.id))]
}

export function useSidebarSplit(resume: ResumeData, pattern: RegExp, externalIds?: readonly string[], onExternalChange?: (ids: readonly string[]) => void) {
  const defaultIds = resume.sections.filter((s) => pattern.test(s.title)).map((s) => s.id)
  const [localIds, setLocalIds] = useState<readonly string[]>(defaultIds)
  const sidebarIds = externalIds ?? localIds
  const validIds = new Set(resume.sections.map((s) => s.id))
  const normalized = sidebarIds.filter((id) => validIds.has(id))
  const sidebarSet = new Set(normalized)
  const leftSections = resume.sections.filter((s) => sidebarSet.has(s.id))
  const rightSections = resume.sections.filter((s) => !sidebarSet.has(s.id))
  const updateSidebar = (ids: readonly string[]): void => {
    const filtered = ids.filter((id) => validIds.has(id))
    setLocalIds(filtered)
    onExternalChange?.(filtered)
  }
  const handleMoveToColumn = (sectionId: string, toColumn: 'left' | 'right'): void => {
    if (toColumn === 'left') {
      updateSidebar(normalized.includes(sectionId) ? normalized : [...normalized, sectionId])
    } else {
      updateSidebar(normalized.filter((id) => id !== sectionId))
    }
  }
  return { leftSections, rightSections, handleMoveToColumn }
}

export function useDndActions() {
  return {
    moveSection: useAppStore((s) => s.moveSection),
    moveBlockInSection: useAppStore((s) => s.moveBlockInSection),
    moveBlockToSection: useAppStore((s) => s.moveBlockToSection),
  }
}

export function educationTimelineRank(section: Section): number {
  if (/教育|学校|学历|课程/i.test(section.title)) return 0
  if (/校园|社团|学生|竞赛|获奖/i.test(section.title)) return 1
  if (/实习|项目|经历/i.test(section.title)) return 2
  return 3
}

export function TemplateSection(props: {
  readonly section: Section
  readonly theme: ThemeTokens
  readonly config: VariantConfig
  readonly index?: number
  readonly compact?: boolean
  readonly dark?: boolean
}): ReactElement {
  return (
    <SortableSection sectionId={props.section.id}>
      {(dragProps: DragHandleProps) => (
        <ConceptSection
          section={props.section}
          dragProps={dragProps}
          theme={props.theme}
          config={props.config}
          index={props.index}
          compact={props.compact}
          dark={props.dark}
        />
      )}
    </SortableSection>
  )
}

export function originalHeaderFields(header: EditableHeader): BaseInfoFieldDef[] {
  return header.fields.filter((field) => !isTemplateExclusiveBaseInfoField(field.label))
}

export function HeaderFieldGrid(props: {
  readonly header: EditableHeader
  readonly accent: string
  readonly labelColor: string
  readonly valueColor: string
  readonly columns?: string
  readonly gap?: string
  readonly fontSize?: string
  readonly compact?: boolean
}): ReactElement {
  const { header, accent, labelColor, valueColor, columns = 'repeat(2, minmax(0, 1fr))', gap = '10px 24px', fontSize = '0.86em', compact } = props
  const fields = originalHeaderFields(header)
  if (fields.length === 0) return <></>
  return (
    <div className="grid" style={{ gridTemplateColumns: columns, gap, marginTop: compact ? 5 : 16, fontSize, lineHeight: compact ? 1.34 : 1.58 }}>
      {fields.map((field) => (
        <FieldChip
          key={field.key}
          field={field}
          header={header}
          deleteColor={accent}
          className="min-w-0 max-w-full flex-wrap items-baseline"
          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
          <span style={{ flex: '0 0 auto', color: labelColor, fontWeight: 700 }}>{field.label}：</span>
          <span style={{ minWidth: 0, color: valueColor, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{field.value}</span>
        </FieldChip>
      ))}
    </div>
  )
}

export function SizedAvatar(props: {
  readonly header: EditableHeader
  readonly width: number
  readonly height: number
  readonly accent: string
  readonly radius?: number
  readonly border?: string
  readonly backgroundColor?: string
}): ReactElement | null {
  const { header, width, height, accent, radius = 0, border, backgroundColor = '#eef3f7' } = props
  return (
    <AvatarSlot
      header={header}
      placeholderSize={Math.min(width, height) * 0.5}
      placeholderBg={backgroundColor}
      placeholderColor={lightenHex(accent, 0.45)}
      render={({ image, uploadOverlay }) => (
        <div className="relative overflow-hidden" style={{ width, height, borderRadius: radius, border, backgroundColor }}>
          {image}
          {uploadOverlay}
        </div>
      )}
    />
  )
}

export { CalendarDays, GraduationCap, Mail, MapPin, Phone, UserRound }
