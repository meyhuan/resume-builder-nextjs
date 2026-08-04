import { describe, expect, it } from 'vitest'
import type { ResumeData } from '@/entities/resume/resume-data'
import { applyPatches, buildChanges, hashResume, sanitizeResumeHtml } from '../resume-content'
import type { JobFitPatch } from '../types'

function createResume(): ResumeData {
  return {
    id: 'resume-1',
    name: '基础简历',
    contactHtml: '13800138000 · test@example.com',
    jobIntention: { position: '产品经理' },
    sections: [{
      id: 'section-1',
      title: '工作经历',
      columns: 1,
      blocks: [{
        id: 'block-1',
        type: 'experience',
        company: '示例科技',
        position: '产品经理',
        startDate: '2022.01',
        endDate: '至今',
        contentHtml: '<p>负责用户增长，转化率提升 20%</p>',
      }],
    }],
  }
}

const patch: JobFitPatch = {
  sectionId: 'section-1',
  blockId: 'block-1',
  field: 'contentHtml',
  optimizedHtml: '<p>聚焦<strong>用户增长</strong>，转化率提升 20%</p>',
  category: 'EXPERIENCE',
  reason: '突出已有量化成果',
  requirementId: 'req-1',
  evidence: '转化率提升 20%',
}

describe('Job Fit resume patches', () => {
  it('deep-clones the source and only changes the addressed field', () => {
    const source = createResume()
    const beforeHash = hashResume(source)
    const tailored = applyPatches(source, [patch])

    expect(hashResume(source)).toBe(beforeHash)
    expect(tailored).not.toBe(source)
    expect(tailored.sections[0]?.blocks[0]).toMatchObject({ company: '示例科技', position: '产品经理' })
    expect(tailored.sections[0]?.blocks[0]).toMatchObject({ contentHtml: patch.optimizedHtml })
  })

  it('creates stable semantic diff locations and context hashes', () => {
    const source = createResume()
    const first = buildChanges(source, [patch])
    const second = buildChanges(source, [patch])

    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ sectionId: 'section-1', blockId: 'block-1', category: 'EXPERIENCE' })
    expect(first[0]?.contextHash).toBe(second[0]?.contextHash)
    expect(first[0]?.originalText).toContain('转化率提升 20%')
  })

  it('strips executable markup and event handlers', () => {
    const value = sanitizeResumeHtml('<p onclick="steal()">安全内容</p><script>alert(1)</script><img src=x>')
    expect(value).not.toMatch(/onclick|script|<img/i)
    expect(value).toContain('安全内容')
  })
})
