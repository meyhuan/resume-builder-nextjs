import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { getModule, getSectionTitleCandidates, type ModuleKey } from '@/entities/module/module-config'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'
import { isMeaningfulText } from './meaningful-field'

/**
 * Status of a module on the edit home.
 */
export type ModuleStatus = 'empty' | 'partial' | 'complete'

export interface ModuleInfo {
  readonly status: ModuleStatus
  readonly summary: string
  readonly count: number
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '')
}

function findSectionByModule(resume: ResumeData, key: ModuleKey): Section | undefined {
  const module = getModule(key)
  if (!module) return undefined
  const titles = getSectionTitleCandidates(module).map(normalizeTitle)
  const sections: readonly Section[] = Array.isArray(resume.sections) ? resume.sections : []
  return sections.find((section) => titles.includes(normalizeTitle(section.title)))
}

/**
 * A block is considered "filled" when at least one meaningful field has content.
 * This prevents empty placeholder blocks from counting as real content.
 */
function isBlockFilled(block: ResumeBlock): boolean {
  switch (block.type) {
    case 'experience':
      return Boolean(isMeaningfulText(block.company) || isMeaningfulText(block.position) || htmlToPlainText(block.contentHtml))
    case 'education':
      return Boolean(isMeaningfulText(block.school) || isMeaningfulText(block.major))
    case 'project':
      return Boolean(isMeaningfulText(block.name) || htmlToPlainText(block.contentHtml))
    case 'campus':
      return Boolean(isMeaningfulText(block.organization) || isMeaningfulText(block.position) || htmlToPlainText(block.contentHtml))
    case 'text':
      return Boolean(htmlToPlainText(block.html))
    case 'list':
      return true
    default:
      return false
  }
}

function countFilledBlocks(section: Section | undefined): number {
  if (!section) return 0
  return section.blocks.filter(isBlockFilled).length
}


export function getModuleInfo(resume: ResumeData, key: ModuleKey): ModuleInfo {
  switch (key) {
    case 'base': {
      const b = resume.baseInfo
      const hasName: boolean = isMeaningfulText(resume.name)
      const hasPhone: boolean = isMeaningfulText(b?.phone)
      const hasEmail: boolean = isMeaningfulText(b?.email)
      const filled: number = [hasName, hasPhone, hasEmail].filter(Boolean).length
      const status: ModuleStatus = filled === 3 ? 'complete' : filled === 0 ? 'empty' : 'partial'
      const summaryParts: string[] = []
      if (isMeaningfulText(resume.name)) summaryParts.push(resume.name)
      if (b?.age) summaryParts.push(`${b.age}岁`)
      if (isMeaningfulText(b?.title)) summaryParts.push(b.title)
      return {
        status,
        summary: summaryParts.length > 0 ? summaryParts.join(' · ') : '点击填写基本信息',
        count: filled,
      }
    }

    case 'intention': {
      const ji = resume.jobIntention
      const hasPosition: boolean = isMeaningfulText(ji?.position)
      const hasCity: boolean = isMeaningfulText(ji?.city)
      const filled: number = [hasPosition, hasCity].filter(Boolean).length
      const status: ModuleStatus = filled === 2 ? 'complete' : filled === 0 ? 'empty' : 'partial'
      const parts: string[] = []
      if (isMeaningfulText(ji?.position)) parts.push(ji.position)
      if (isMeaningfulText(ji?.city)) parts.push(ji.city)
      if (isMeaningfulText(ji?.salary)) parts.push(ji.salary)
      return {
        status,
        summary: parts.length > 0 ? parts.join(' · ') : '点击添加期望岗位',
        count: filled,
      }
    }

    case 'eduExp':
      return countModule(resume, key, '段教育经历', '点击添加教育经历')
    case 'workExp':
      return countModule(resume, key, '段工作经历', '点击添加工作经历')
    case 'programExp':
      return countModule(resume, key, '个项目', '点击添加项目经历')
    case 'internExp':
      return countModule(resume, key, '段实习经历', '点击添加实习经历')
    case 'schoolExp':
      return countModule(resume, key, '项校园经历', '点击添加校园经历')
    case 'summary':
      return filledTextModule(resume, key, '已填写', '点击添加自我评价')
    case 'skill':
      return filledTextModule(resume, key, '已填写', '点击添加技能')
    case 'qualifications':
      return countModule(resume, key, '项证书/奖项', '点击添加奖项证书')
    case 'custom': {
      const canonicalTitles = new Set(
        ['workExp', 'eduExp', 'programExp', 'internExp', 'schoolExp', 'summary', 'skill', 'qualifications']
          .flatMap((moduleKey) => {
            const module = getModule(moduleKey as ModuleKey)
            return module ? getSectionTitleCandidates(module).map(normalizeTitle) : []
          }),
      )
      const sections: readonly Section[] = Array.isArray(resume.sections) ? resume.sections : []
      const custom = sections.filter((section) => !canonicalTitles.has(normalizeTitle(section.title)))
      const count: number = custom.length
      return {
        status: count === 0 ? 'empty' : 'complete',
        summary: count === 0 ? '自定义更多内容' : `${count} 个模块`,
        count,
      }
    }
  }
}

function countModule(resume: ResumeData, key: ModuleKey, unit: string, emptySummary: string): ModuleInfo {
  const count = countFilledBlocks(findSectionByModule(resume, key))
  return {
    status: count > 0 ? 'complete' : 'empty',
    summary: count > 0 ? `${count} ${unit}` : emptySummary,
    count,
  }
}

function filledTextModule(resume: ResumeData, key: ModuleKey, filledSummary: string, emptySummary: string): ModuleInfo {
  const count = countFilledBlocks(findSectionByModule(resume, key))
  return {
    status: count > 0 ? 'complete' : 'empty',
    summary: count > 0 ? filledSummary : emptySummary,
    count,
  }
}

/**
 * Compute a realistic progress percentage (0–100) from the user's perspective.
 *
 * Score breakdown (total = 100):
 *   base info        25 pts  (name + phone + email; partial = 12)
 *   job intention    15 pts  (position + city; partial = 7)
 *   education        20 pts  (at least 1 filled block)
 *   core experience  25 pts  (work OR project OR intern)
 *   self summary     10 pts
 *   skill             5 pts
 */
export function computeProgress(resume: ResumeData): number {
  let earned = 0

  // --- base info (25 pts) ---
  const base = getModuleInfo(resume, 'base')
  if (base.status === 'complete') earned += 25
  else if (base.status === 'partial') earned += 12

  // --- job intention (15 pts) ---
  const intention = getModuleInfo(resume, 'intention')
  if (intention.status === 'complete') earned += 15
  else if (intention.status === 'partial') earned += 7

  // --- education (20 pts) ---
  const edu = getModuleInfo(resume, 'eduExp')
  if (edu.status === 'complete') earned += 20

  // --- core experience: best of work / project / intern (25 pts) ---
  const work = getModuleInfo(resume, 'workExp')
  const project = getModuleInfo(resume, 'programExp')
  const intern = getModuleInfo(resume, 'internExp')
  if (work.status === 'complete' || project.status === 'complete' || intern.status === 'complete') {
    earned += 25
  }

  // --- self summary (10 pts) ---
  const summary = getModuleInfo(resume, 'summary')
  if (summary.status === 'complete') earned += 10

  // --- skill (5 pts) ---
  const skill = getModuleInfo(resume, 'skill')
  if (skill.status === 'complete') earned += 5

  return Math.min(100, Math.round(earned))
}
