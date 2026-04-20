import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import type { ModuleKey } from '@/entities/module/module-config'

/**
 * Status of a module on the edit home.
 */
export type ModuleStatus = 'empty' | 'partial' | 'complete'

export interface ModuleInfo {
  readonly status: ModuleStatus
  readonly summary: string
  readonly count: number
}

/**
 * Find a section whose title matches the given title (case-insensitive, fuzzy).
 */
function findSection(resume: ResumeData, title: string): Section | undefined {
  const normalized: string = title.replace(/\s/g, '')
  return resume.sections.find((s) => s.title.replace(/\s/g, '') === normalized)
}

/**
 * Count blocks inside a section.
 */
function countBlocks(section: Section | undefined): number {
  return section?.blocks.length ?? 0
}

/**
 * Compute status and one-line summary for a given module key.
 */
export function getModuleInfo(resume: ResumeData, key: ModuleKey): ModuleInfo {
  switch (key) {
    case 'base': {
      const b = resume.baseInfo
      const hasName: boolean = Boolean(resume.name?.trim())
      const hasPhone: boolean = Boolean(b?.phone?.trim())
      const hasEmail: boolean = Boolean(b?.email?.trim())
      const filled: number = [hasName, hasPhone, hasEmail].filter(Boolean).length
      const status: ModuleStatus = filled === 3 ? 'complete' : filled === 0 ? 'empty' : 'partial'
      const summaryParts: string[] = []
      if (resume.name) summaryParts.push(resume.name)
      if (b?.age) summaryParts.push(`${b.age}岁`)
      if (b?.title) summaryParts.push(b.title)
      return {
        status,
        summary: summaryParts.length > 0 ? summaryParts.join(' · ') : '点击填写基础信息',
        count: filled,
      }
    }
    case 'intention': {
      const ji = resume.jobIntention
      const hasPosition: boolean = Boolean(ji?.position?.trim())
      const hasCity: boolean = Boolean(ji?.city?.trim())
      const filled: number = [hasPosition, hasCity].filter(Boolean).length
      const status: ModuleStatus = filled === 2 ? 'complete' : filled === 0 ? 'empty' : 'partial'
      const parts: string[] = []
      if (ji?.position) parts.push(ji.position)
      if (ji?.city) parts.push(ji.city)
      if (ji?.salary) parts.push(ji.salary)
      return {
        status,
        summary: parts.length > 0 ? parts.join(' · ') : '点击添加期望岗位',
        count: filled,
      }
    }
    case 'workExp':
    case 'eduExp':
    case 'programExp':
    case 'internExp':
    case 'schoolExp':
    case 'summary':
    case 'skill':
    case 'qualifications': {
      const titleMap: Record<string, string> = {
        workExp: '工作经历',
        eduExp: '教育经历',
        programExp: '项目经验',
        internExp: '实习经历',
        schoolExp: '在校经历',
        summary: '自我评价',
        skill: '相关技能',
        qualifications: '奖项证书',
      }
      const section = findSection(resume, titleMap[key])
      const count: number = countBlocks(section)
      const status: ModuleStatus = count === 0 ? 'empty' : 'complete'
      const summary: string = count === 0 ? '点击添加' : `${count} 项内容`
      return { status, summary, count }
    }
    case 'custom': {
      // Any section not in the canonical set is "custom"
      const canonical: readonly string[] = [
        '工作经历', '教育经历', '项目经验', '实习经历', '在校经历',
        '自我评价', '相关技能', '奖项证书',
      ]
      const custom = resume.sections.filter((s) => !canonical.includes(s.title.replace(/\s/g, '')))
      const count: number = custom.length
      const status: ModuleStatus = count === 0 ? 'empty' : 'complete'
      const summary: string = count === 0 ? '自定义更多内容' : `${count} 个模块`
      return { status, summary, count }
    }
  }
}

/**
 * Weighted progress percentage (0-100) across all modules.
 */
export function computeProgress(resume: ResumeData): number {
  const weights: Record<ModuleKey, number> = {
    base: 20,
    intention: 15,
    workExp: 12,
    eduExp: 12,
    programExp: 8,
    internExp: 5,
    schoolExp: 3,
    summary: 8,
    skill: 8,
    qualifications: 5,
    custom: 4,
  }
  let total: number = 0
  let earned: number = 0
  for (const k of Object.keys(weights) as ModuleKey[]) {
    const w: number = weights[k]
    total += w
    const info = getModuleInfo(resume, k)
    if (info.status === 'complete') earned += w
    else if (info.status === 'partial') earned += w * 0.5
  }
  return Math.round((earned / total) * 100)
}
