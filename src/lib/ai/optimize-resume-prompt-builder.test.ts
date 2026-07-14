import { describe, expect, it } from 'vitest'
import { buildOptimizeUserPrompt, MAX_OPTIMIZE_JD_LENGTH } from './optimize-resume-prompt-builder'

describe('buildOptimizeUserPrompt', () => {
  it('supports a complete job description and server-confirmed evidence', () => {
    const prompt = buildOptimizeUserPrompt(
      [{ blockId: 'work-1', type: 'experience', label: '工作经历', contentHtml: '<p>负责商城运营</p>' }],
      '岗位要求：负责电商平台运营与投放复盘',
      [{ blockId: 'work-1', text: '使用万相台进行人群投放，根据 ROI 调整预算' }],
    )

    expect(MAX_OPTIMIZE_JD_LENGTH).toBe(5000)
    expect(prompt).toContain('负责电商平台运营与投放复盘')
    expect(prompt).toContain('使用万相台进行人群投放')
    expect(prompt).toContain('不得扩展、推断')
    expect(prompt).toContain('仅限 blockId=work-1')
  })
})
