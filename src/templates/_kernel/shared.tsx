import type { BaseInfo } from '@/entities/user/base-info'
import type { Section } from '@/entities/resume/section'
import type { ReactElement } from 'react'
import {
  IconPhone,
  IconMail,
  IconGender,
  IconAge,
  IconLocation,
  IconWorkYear,
  IconInfo,
} from '@/components/sections/baseinfo-icons'
import { isUserVisibleBaseInfoCustomField } from '@/lib/template-exclusive-fields'
/** Field definition for base-info rendering. */
export interface BaseInfoFieldDef {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly icon: ReactElement
}

/**
 * Build displayable fields from BaseInfo in a display-friendly order.
 */
export function buildBaseInfoFields(baseInfo: BaseInfo | null): BaseInfoFieldDef[] {
  if (!baseInfo) return []
  const defs: BaseInfoFieldDef[] = []
  if (baseInfo.gender) {
    defs.push({ key: 'gender', label: '性别', value: baseInfo.gender, icon: <IconGender /> })
  }
  if (baseInfo.age !== undefined && baseInfo.age !== null) {
    defs.push({ key: 'age', label: '年龄', value: String(baseInfo.age), icon: <IconAge /> })
  }
  if (baseInfo.currentLocation) {
    defs.push({ key: 'currentLocation', label: '现居', value: baseInfo.currentLocation, icon: <IconLocation /> })
  }
  if (baseInfo.workStartTime) {
    defs.push({ key: 'workStartTime', label: '工作时间', value: baseInfo.workStartTime, icon: <IconWorkYear /> })
  }
  if (baseInfo.phone) {
    defs.push({ key: 'phone', label: '电话', value: baseInfo.phone, icon: <IconPhone /> })
  }
  if (baseInfo.email) {
    defs.push({ key: 'email', label: '邮箱', value: baseInfo.email, icon: <IconMail /> })
  }
  if (baseInfo.nation) {
    defs.push({ key: 'nation', label: '民族', value: baseInfo.nation, icon: <IconInfo /> })
  }
  if (baseInfo.household) {
    defs.push({ key: 'household', label: '户籍', value: baseInfo.household, icon: <IconInfo /> })
  }
  if (baseInfo.politicalStatus) {
    defs.push({ key: 'politicalStatus', label: '政治面貌', value: baseInfo.politicalStatus, icon: <IconInfo /> })
  }
  if (baseInfo.height) {
    defs.push({ key: 'height', label: '身高', value: `${baseInfo.height}cm`, icon: <IconInfo /> })
  }
  if (baseInfo.weight) {
    defs.push({ key: 'weight', label: '体重', value: `${baseInfo.weight}kg`, icon: <IconInfo /> })
  }
  if (baseInfo.customFields) {
    for (const cf of baseInfo.customFields) {
      if (isUserVisibleBaseInfoCustomField(cf)) {
        defs.push({ key: `custom_${cf.label}`, label: cf.label, value: cf.value, icon: <IconInfo /> })
      }
    }
  }
  return defs
}

/** Convert hex to rgba with alpha. Accepts #rgb / #rrggbb. */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Lighten a hex color by amount in [0, 1] (0 = unchanged, 1 = white). */
export function lightenHex(hex: string, amount: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const mix = (v: number): number => Math.round(v + (255 - v) * amount)
  const r = mix(parseInt(h.slice(0, 2), 16))
  const g = mix(parseInt(h.slice(2, 4), 16))
  const b = mix(parseInt(h.slice(4, 6), 16))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Darken a hex color by factor (0 = black, 1 = unchanged). */
export function darkenHex(hex: string, factor: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * factor)))
  const g = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * factor)))
  const b = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * factor)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Check if every block in a section is a TextBlock. */
export function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((b) => b.type === 'text')
}

/** Resolve a human-readable label from a block type. */
export function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}
