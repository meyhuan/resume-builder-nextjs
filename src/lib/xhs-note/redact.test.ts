import { describe, expect, it } from 'vitest'
import type { ResumeData } from '@/entities/resume/resume-data'
import { redactResume } from '@/lib/xhs-note/redact'

const resume = {
  id: 'r',
  name: '袁观环',
  baseInfo: {
    name: '袁观环',
    phone: '13800138000',
    email: 'yuan@example.com',
  },
  sections: [
    {
      id: 's',
      title: '实习经历',
      blocks: [
        {
          id: 'b',
          type: 'experience',
          company: '星巴克中国',
          position: '品牌运营实习生',
          startDate: '2024-06',
          endDate: '2024-09',
          contentHtml: '<p>负责门店晚班排班和开店准备，整理班表。微信：yuan_wx 身份证 110101199001011234</p>',
        },
      ],
    },
    {
      id: 'e',
      title: '教育经历',
      blocks: [
        {
          id: 'edu',
          type: 'education',
          school: '浙江大学',
          major: '市场营销',
          degree: '本科',
          startDate: '2022-09',
          endDate: '2026-06',
          courseHtml: '',
        },
      ],
    },
  ],
} as unknown as ResumeData

describe('redactResume', () => {
  it('removes identity and generalizes company and school names', () => {
    const { text, usable, recommendedTopics } = redactResume(resume)
    expect(usable).toBe(true)
    expect(text).not.toContain('袁观环')
    expect(text).not.toContain('13800138000')
    expect(text).not.toContain('yuan@example.com')
    expect(text).not.toContain('星巴克中国')
    expect(text).not.toContain('浙江大学')
    expect(text).not.toContain('110101199001011234')
    expect(text).not.toContain('yuan_wx')
    expect(text).toContain('某连锁品牌公司')
    expect(text).toMatch(/某综合大学|某重点高校|某院校|某本科院校/)
    expect(text).toContain('品牌运营实习生')
    expect(text).toContain('晚班排班')
    expect(Array.isArray(recommendedTopics)).toBe(true)
    expect(recommendedTopics.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects a resume that has no usable experience text', () => {
    const empty = { id: 'r', name: '空', sections: [] } as unknown as ResumeData
    expect(redactResume(empty).usable).toBe(false)
  })
})
