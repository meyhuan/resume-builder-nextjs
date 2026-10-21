import type { ResumeData } from '@/entities/resume/resume-data'
import { applyTranslatedHeaderToClone, applyTranslatedSectionToClone } from './apply-translated-section'

export function applyMobileTranslationUnit(resume: ResumeData, value: unknown): ResumeData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return resume
  const unit = value as Record<string, unknown>
  if (unit.kind === 'header') {
    return applyTranslatedHeaderToClone(resume, {
      name: typeof unit.name === 'string' ? unit.name : undefined,
      baseInfo: record(unit.baseInfo),
      jobIntention: record(unit.jobIntention),
    })
  }
  if (typeof unit.sectionId === 'string') {
    return applyTranslatedSectionToClone(resume, {
      sectionId: unit.sectionId,
      title: typeof unit.title === 'string' ? unit.title : undefined,
      displayTitle: typeof unit.displayTitle === 'string' ? unit.displayTitle : undefined,
      blocks: Array.isArray(unit.blocks) ? unit.blocks : undefined,
    })
  }
  return resume
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined
}

/** Require the terminal event so an interrupted stream cannot be saved as complete. */
export function finishMobileTranslation(resume: ResumeData, done: boolean, failed: number, language: string): ResumeData {
  if (!done) throw new Error('翻译连接已中断，请重新生成')
  if (failed > 0) throw new Error(`有 ${failed} 个模块未完成翻译，请重试后再保存`)
  return { ...resume, language }
}
