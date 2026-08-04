import { describe, expect, it } from 'vitest'
import type { ResumeData } from '@/entities/resume/resume-data'
import { validateJobFitPatch } from '../fact-guard'
import { extractOptimizableFields } from '../resume-content'
import { calculateJobFitScoring } from '../scoring'
import type { JobFitPatch } from '../types'

function createResume(contentHtml = '<p>负责 CRM 用户增长，通过数据分析将转化率提升 20%</p>'): ResumeData {
  return {
    id: 'resume-1',
    name: '产品经理简历',
    contactHtml: '13800138000 · test@example.com',
    jobIntention: { position: '产品经理' },
    sections: [{
      id: 'section-1',
      title: '工作经历',
      columns: 1,
      blocks: [{
        id: 'block-1', type: 'experience', company: '示例科技', position: '产品经理',
        startDate: '2022.01', endDate: '至今', contentHtml,
      }],
    }],
  }
}

function patch(optimizedHtml: string, evidence = '数据分析'): JobFitPatch {
  return {
    sectionId: 'section-1', blockId: 'block-1', field: 'contentHtml', optimizedHtml,
    category: 'KEYWORD', reason: '对齐岗位要求', evidence,
  }
}

describe('Job Fit scoring and fact guard', () => {
  it('uses the fixed weighted score version and is deterministic', () => {
    const source = createResume()
    const optimized = createResume('<p>负责 CRM 用户增长与数据分析，转化率提升 20%</p>')
    const jd = '招聘产品经理，负责 CRM 用户增长、数据分析和转化率优化。'
    const first = calculateJobFitScoring(source, optimized, jd, '产品经理', [])
    const second = calculateJobFitScoring(source, optimized, jd, '产品经理', [])

    expect(first).toEqual(second)
    expect(first.version).toBe('job-fit-score-v1')
    expect(first.optimized).toBeGreaterThanOrEqual(0)
    expect(first.optimized).toBeLessThanOrEqual(100)
  })

  it('does not claim a score gain when only the job-intention label changes', () => {
    const source = createResume()
    const titleOnly = {
      ...source,
      jobIntention: { position: 'CRM 增长产品经理' },
    }
    const jd = '招聘 CRM 增长产品经理，负责 CRM 用户增长、数据分析和转化率优化。'

    const result = calculateJobFitScoring(source, titleOnly, jd, 'CRM 增长产品经理', [])

    expect(result.improvement).toBe(0)
    expect(result.keyword.improvement).toBe(0)
  })

  it('accepts an evidence-backed rewrite with existing facts', () => {
    const resume = createResume()
    const result = validateJobFitPatch(
      patch('<p>聚焦 CRM 用户增长与数据分析，转化率提升 20%</p>'),
      extractOptimizableFields(resume),
      '示例科技 产品经理 2022.01 至今 CRM 用户增长 数据分析 转化率提升 20%',
    )
    expect(result).toEqual({ ok: true })
  })

  it('allows an evidence-backed rewrite that only adds ordinary prose', () => {
    const resume = createResume('<p>Cross functional collaboration for product delivery</p>')
    const result = validateJobFitPatch(
      patch('<p>Prioritized product delivery through cross functional collaboration</p>', 'Cross functional collaboration for product delivery'),
      extractOptimizableFields(resume),
      'Cross functional collaboration for product delivery',
    )
    expect(result).toEqual({ ok: true })
  })

  it('allows a markup-only highlight of a source-backed keyword', () => {
    const resume = createResume('<p>负责 CRM 用户增长与数据分析</p>')
    const result = validateJobFitPatch(
      patch('<p>负责 CRM <strong>用户增长</strong>与数据分析</p>', 'CRM 用户增长与数据分析'),
      extractOptimizableFields(resume),
      'CRM 用户增长与数据分析',
    )
    expect(result).toEqual({ ok: true })
  })

  it('rejects invented metrics, technologies, and unsupported evidence', () => {
    const resume = createResume()
    const fields = extractOptimizableFields(resume)
    const source = '示例科技 产品经理 2022.01 至今 CRM 用户增长 数据分析 转化率提升 20%'

    expect(validateJobFitPatch(patch('<p>转化率提升 80%</p>'), fields, source).ok).toBe(false)
    expect(validateJobFitPatch(patch('<p>使用 Kubernetes 推动用户增长</p>'), fields, source).ok).toBe(false)
    expect(validateJobFitPatch(patch('<p>担任 Product Owner，编写 user stories 和 acceptance criteria</p>'), fields, source).ok).toBe(false)
    expect(validateJobFitPatch(patch('<p>负责用户增长</p>', '不存在的证据'), fields, source).ok).toBe(false)
  })
})
