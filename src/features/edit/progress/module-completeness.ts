import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ModuleKey } from '@/entities/module/module-config'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'

/**
 * Status of a module on the edit home.
 */
export type ModuleStatus = 'empty' | 'partial' | 'complete'

export interface ModuleInfo {
  readonly status: ModuleStatus
  readonly summary: string
  readonly count: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findSection(resume: ResumeData, title: string): Section | undefined {
  const normalized: string = title.replace(/\s/g, '')
  const sections: readonly Section[] = Array.isArray(resume.sections) ? resume.sections : []
  return sections.find((s) => s.title.replace(/\s/g, '') === normalized)
}

/**
 * A block is considered "filled" when at least one meaningful field has content.
 * This prevents empty placeholder blocks from counting as real content.
 */
function isBlockFilled(block: ResumeBlock): boolean {
  switch (block.type) {
    case 'experience':
      return Boolean(block.company?.trim() || block.position?.trim() || htmlToPlainText(block.contentHtml))
    case 'education':
      return Boolean(block.school?.trim() || block.major?.trim())
    case 'project':
      return Boolean(block.name?.trim() || htmlToPlainText(block.contentHtml))
    case 'campus':
      return Boolean(block.organization?.trim() || block.position?.trim() || htmlToPlainText(block.contentHtml))
    case 'text':
      return Boolean(htmlToPlainText(block.html))
    case 'list':
      return true // list blocks are always considered filled if present
    default:
      return false
  }
}

/**
 * Count blocks in a section that have real content.
 */
function countFilledBlocks(section: Section | undefined): number {
  if (!section) return 0
  return section.blocks.filter(isBlockFilled).length
}

// ---------------------------------------------------------------------------
// Per-module status
// ---------------------------------------------------------------------------

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

    case 'eduExp': {
      const section = findSection(resume, '教育经历')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 段教育经历` : '点击添加教育经历',
        count,
      }
    }

    case 'workExp': {
      const section = findSection(resume, '工作经历')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 段工作经历` : '点击添加工作经历',
        count,
      }
    }

    case 'programExp': {
      const section = findSection(resume, '项目经验')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 个项目` : '点击添加项目经验',
        count,
      }
    }

    case 'internExp': {
      const section = findSection(resume, '实习经历')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 段实习经历` : '点击添加实习经历',
        count,
      }
    }

    case 'schoolExp': {
      const section = findSection(resume, '在校经历')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 项在校经历` : '点击添加在校经历',
        count,
      }
    }

    case 'summary': {
      const section = findSection(resume, '自我评价')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? '已填写' : '点击添加自我评价',
        count,
      }
    }

    case 'skill': {
      const section = findSection(resume, '相关技能')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? '已填写' : '点击添加技能',
        count,
      }
    }

    case 'qualifications': {
      const section = findSection(resume, '奖项证书')
      const count = countFilledBlocks(section)
      return {
        status: count > 0 ? 'complete' : 'empty',
        summary: count > 0 ? `${count} 项证书/奖项` : '点击添加奖项证书',
        count,
      }
    }

    case 'custom': {
      const canonical: readonly string[] = [
        '工作经历', '教育经历', '项目经验', '实习经历', '在校经历',
        '自我评价', '相关技能', '奖项证书',
      ]
      const sections: readonly Section[] = Array.isArray(resume.sections) ? resume.sections : []
      const custom = sections.filter((s) => !canonical.includes(s.title.replace(/\s/g, '')))
      const count: number = custom.length
      return {
        status: count === 0 ? 'empty' : 'complete',
        summary: count === 0 ? '自定义更多内容' : `${count} 个模块`,
        count,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Progress computation
// ---------------------------------------------------------------------------

/**
 * Compute a realistic progress percentage (0–100) from the user's perspective.
 *
 * Design principles:
 * 1. Only mandatory and universally-expected modules determine the score.
 *    Optional modules (qualifications, schoolExp, custom) are excluded so
 *    they cannot inflate the number.
 * 2. Experience modules (work / project / intern) are treated as a single
 *    "core experience" slot — having ANY one of them earns full credit.
 *    This avoids penalising fresh graduates who have no work history.
 * 3. Blocks are checked for real content, not just existence, so an empty
 *    placeholder block does not count.
 * 4. partial status earns half weight so users feel incremental progress.
 *
 * Score breakdown (total = 100):
 *   base info        25 pts  (name + phone + email; partial = 12)
 *   job intention    15 pts  (position + city; partial = 7)
 *   education        20 pts  (at least 1 filled block)
 *   core experience  25 pts  (work OR project OR intern, whichever is best)
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
  // Give full credit as long as the user has filled at least one experience type.
  const work = getModuleInfo(resume, 'workExp')
  const project = getModuleInfo(resume, 'programExp')
  const intern = getModuleInfo(resume, 'internExp')
  const hasAnyExp =
    work.status === 'complete' ||
    project.status === 'complete' ||
    intern.status === 'complete'
  if (hasAnyExp) earned += 25

  // --- self summary (10 pts) ---
  const summary = getModuleInfo(resume, 'summary')
  if (summary.status === 'complete') earned += 10

  // --- skill (5 pts) ---
  const skill = getModuleInfo(resume, 'skill')
  if (skill.status === 'complete') earned += 5

  return Math.min(100, Math.round(earned))
}
