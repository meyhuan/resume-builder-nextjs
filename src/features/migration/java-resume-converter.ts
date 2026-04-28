import type {
  ExternalResume,
  ExternalCustomModule,
  ExternalSelfEvaluation,
  ExternalSkills,
  ExternalQualifications,
} from '@/io/external-resume-types'

/**
 * Converter from the WeChat mini-program Java backend resume JSON shape to
 * the canonical {@link ExternalResume} used by the Next.js importer.
 *
 * The Java backend stores resumes under {@code ResumeFlat.resumeJson} as a
 * stringified JSON blob whose shape mostly matches ExternalResume already.
 * The notable differences that this converter normalizes:
 *
 *   - {@code self_evaluation} is a plain string in Java -> wrap into
 *     {@code { content, is_hide }}.
 *   - {@code skill_certificate} (string) in Java -> {@code skills} object.
 *   - {@code extra.custom} (single custom section) -> merged into
 *     {@code custom_module_info[]} so the standard importer picks it up.
 *   - Nullish / missing arrays are replaced with empty arrays.
 *
 * The converter is intentionally lenient: it never throws on unknown fields
 * and always produces a well-formed ExternalResume so downstream code can
 * rely on it. Failures during migration should come from network / DB
 * issues, not from this pure function.
 */

/** Shape of a single item returned by Java /resume/export-for-migration. */
export interface JavaResumeExportItem {
  readonly id: number | string
  readonly name: string | null
  readonly templateId: string | null
  readonly coverImageUrl?: string | null
  readonly createTime?: string | null
  readonly updateTime?: string | null
  readonly resumeJson: Record<string, unknown> | null
}

export interface ConvertedResume {
  readonly javaId: string
  readonly title: string
  readonly template: string
  readonly coverImageUrl: string | null
  readonly external: ExternalResume
}

const DEFAULT_TEMPLATE = 'simple'
const DEFAULT_TITLE = '我的简历'

/**
 * Entry point used by the migration executor. Returns the shape we persist
 * into Prisma Resume + the original javaId for idempotency tracking.
 */
export function convertJavaResume(item: JavaResumeExportItem): ConvertedResume {
  const external: ExternalResume = toExternalResume(item.resumeJson || {})
  const title: string = nonEmpty(item.name) ?? nonEmpty(external.base_info?.name) ?? DEFAULT_TITLE
  const template: string = nonEmpty(item.templateId) ?? DEFAULT_TEMPLATE
  return {
    javaId: String(item.id),
    title,
    template,
    coverImageUrl: nonEmpty(item.coverImageUrl ?? null) ?? null,
    external,
  }
}

/**
 * Normalizes a raw Java resumeJson into a strict ExternalResume.
 * Exported for direct unit testing.
 */
export function toExternalResume(raw: Record<string, unknown>): ExternalResume {
  const baseInfo = asObject(raw.base_info)
  const jobIntention = asObject(raw.job_intention)
  const experience = asArray(raw.experience)
  const intern = asArray(raw.intern)
  const education = asArray(raw.education)
  const projects = asArray(raw.program_experience)
  const schoolExps = asArray(raw.school_exps)
  const customModules = mergeCustomModules(raw)
  return {
    base_info: {
      name: asString(baseInfo.name, ''),
      gender: asOptionalString(baseInfo.gender),
      age: asOptionalString(baseInfo.age),
      birthday: asOptionalString(baseInfo.birthday),
      show_age_type: typeof baseInfo.show_age_type === 'number' ? baseInfo.show_age_type : undefined,
      phone: asOptionalString(baseInfo.phone),
      mail: asOptionalString(baseInfo.mail),
      url: asOptionalString(baseInfo.url),
      nation: asOptionalString(baseInfo.nation),
      hide_avatar: asOptionalBoolean(baseInfo.hide_avatar),
      politics_status: asOptionalString(baseInfo.politics_status),
      height: asOptionalString(baseInfo.height),
      weight: asOptionalString(baseInfo.weight),
    },
    job_intention: {
      objective: asOptionalString(jobIntention.objective),
      category: asOptionalString(jobIntention.category),
      industry: asOptionalString(jobIntention.industry),
      curr_salary: asOptionalString(jobIntention.curr_salary),
      workyear_age: asOptionalString(jobIntention.workyear_age),
      location: asOptionalString(jobIntention.location),
      home_location: asOptionalString(jobIntention.home_location),
      current_state: asOptionalString(jobIntention.current_state),
      hope: asOptionalString(jobIntention.hope),
      hope_industry: asOptionalString(jobIntention.hope_industry),
      city: asOptionalString(jobIntention.city),
      type: asOptionalString(jobIntention.type),
      salary: asOptionalString(jobIntention.salary),
      apply: typeof jobIntention.apply === 'number' ? jobIntention.apply : undefined,
      is_hide: asOptionalBoolean(jobIntention.is_hide),
    },
    experience: experience.map((e, i) => ({
      id: asString(e.id, `exp-${i}`),
      name: asString(e.name, ''),
      category: asOptionalString(e.category),
      industry: asOptionalString(e.industry),
      position: asString(e.position, ''),
      work_place: asOptionalString(e.work_place),
      month_salary: asOptionalString(e.month_salary),
      work_industry: asOptionalString(e.work_industry),
      content: asString(e.content, ''),
      is_hide: asOptionalBoolean(e.is_hide),
      period: readPeriod(e.period),
    })),
    intern: intern.map((e, i) => ({
      id: asString(e.id, `intern-${i}`),
      name: asString(e.name, ''),
      category: asOptionalString(e.category),
      industry: asOptionalString(e.industry),
      position: asString(e.position, ''),
      work_place: asOptionalString(e.work_place),
      month_salary: asOptionalString(e.month_salary),
      work_industry: asOptionalString(e.work_industry),
      content: asString(e.content, ''),
      is_hide: asOptionalBoolean(e.is_hide),
      period: readPeriod(e.period),
    })),
    education: education.map((e, i) => ({
      id: asString(e.id, `edu-${i}`),
      name: asString(e.name, ''),
      major: asOptionalString(e.major),
      degree: asOptionalString(e.degree),
      is_hide: asOptionalBoolean(e.is_hide),
      recruit_type: asOptionalString(e.recruit_type),
      course: asOptionalString(e.course),
      content: asOptionalString(e.content),
      period: readPeriod(e.period),
    })),
    program_experience: projects.map((e, i) => ({
      id: asString(e.id, `proj-${i}`),
      name: asString(e.name, ''),
      role: asOptionalString(e.role),
      category: asOptionalString(e.category),
      content: asString(e.content, ''),
      is_hide: asOptionalBoolean(e.is_hide),
      period: readPeriod(e.period),
    })),
    school_exps: schoolExps.map((e, i) => ({
      id: asString(e.id, `school-${i}`),
      name: asString(e.name, ''),
      position: asOptionalString(e.position),
      content: asString(e.content, ''),
      is_hide: asOptionalBoolean(e.is_hide),
      period: readPeriod(e.period),
    })),
    self_evaluation: readSelfEvaluation(raw),
    skills: readSkills(raw),
    qualifications: readQualifications(raw),
    custom_module_info: customModules,
    lang_type: asOptionalString(raw.lang_type),
  }
}

/**
 * Merge {@code extra.custom} (mini-program's single custom section) and any
 * existing {@code custom_module_info[]} into one array, preserving order.
 * {@code extra.custom} comes first so users who only used the mini-program
 * see their module at the top.
 */
function mergeCustomModules(raw: Record<string, unknown>): ExternalCustomModule[] {
  const merged: ExternalCustomModule[] = []
  const extra = asObject(raw.extra)
  const extraCustom = asObject(extra.custom)
  if (extraCustom && nonEmpty(asString(extraCustom.content, ''))) {
    merged.push({
      name: asString(extraCustom.name, '自定义模块'),
      content: asString(extraCustom.content, ''),
      is_hide: asOptionalBoolean(extraCustom.is_hide),
      module_name: `custom_extra_${merged.length}`,
    })
  }
  const list = asArray(raw.custom_module_info)
  list.forEach((m, idx) => {
    const content: string = asString(m.content, '')
    if (!nonEmpty(content)) return
    merged.push({
      name: asString(m.name, '自定义模块'),
      content,
      is_hide: asOptionalBoolean(m.is_hide),
      module_name: asString(m.module_name, `custom_${idx}`),
    })
  })
  return merged
}

function readSelfEvaluation(raw: Record<string, unknown>): ExternalSelfEvaluation | undefined {
  const value = raw.self_evaluation
  if (value == null || value === '') return undefined
  if (typeof value === 'string') {
    return { content: value, is_hide: false }
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const content: string = asString(obj.content, '')
    if (!content) return undefined
    return { content, is_hide: asOptionalBoolean(obj.is_hide) }
  }
  return undefined
}

function readSkills(raw: Record<string, unknown>): ExternalSkills | undefined {
  const direct = asObject(raw.skills)
  if (direct && nonEmpty(asString(direct.content, ''))) {
    return {
      content: asString(direct.content, ''),
      is_hide: asOptionalBoolean(direct.is_hide),
    }
  }
  const legacy = raw.skill_certificate
  if (typeof legacy === 'string' && nonEmpty(legacy)) {
    return { content: legacy, is_hide: false }
  }
  return undefined
}

function readQualifications(raw: Record<string, unknown>): ExternalQualifications | undefined {
  const q = asObject(raw.qualifications)
  if (!q) return undefined
  const content: string = asString(q.content, '')
  if (!nonEmpty(content)) return undefined
  return { content, is_hide: asOptionalBoolean(q.is_hide) }
}

function readPeriod(value: unknown): { start: string; end: string } {
  const obj = asObject(value)
  return {
    start: asString(obj.start, ''),
    end: asString(obj.end, ''),
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Record<string, unknown> => v != null && typeof v === 'object')
  }
  return []
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return undefined
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed: string = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
