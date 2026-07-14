import { describe, expect, it } from 'vitest'
import { validateEvidenceBoundRewrite } from './evidence-rewrite-validator'

describe('validateEvidenceBoundRewrite', () => {
  const source = '<p>负责私域小程序商城运营，参与双十一活动，助力GMV增长1800万。</p>'

  it('allows professional rephrasing that keeps existing facts', () => {
    const result = validateEvidenceBoundRewrite(source, '<p>负责私域小程序商城运营，参与双十一大促并助力GMV增长1800万。</p>')
    expect(result.safe).toBe(true)
  })

  it('blocks invented numbers', () => {
    const result = validateEvidenceBoundRewrite(source, '<p>负责私域商城运营，推动转化率提升30%，GMV增长1800万。</p>')
    expect(result.safe).toBe(false)
    expect(result.issues.join('')).toContain('30%')
  })

  it('blocks concrete platforms and tools missing from confirmed facts', () => {
    const result = validateEvidenceBoundRewrite(source, '<p>负责天猫店铺运营，使用万相台投放，助力GMV增长1800万。</p>')
    expect(result.safe).toBe(false)
    expect(result.issues.join('')).toContain('天猫')
    expect(result.issues.join('')).toContain('万相台')
  })

  it('allows tools explicitly present in confirmed evidence', () => {
    const confirmedEvidence = '在双十一期间使用万相台进行人群投放，根据ROI调整预算与出价。'
    const result = validateEvidenceBoundRewrite(
      `${source}\n${confirmedEvidence}`,
      '<p>参与双十一活动，使用万相台进行人群投放，并根据ROI调整预算与出价。</p>',
    )
    expect(result.safe).toBe(true)
  })
})
