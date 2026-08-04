import { describe, expect, it } from 'vitest'
import { analyzeJdMatch } from './jd-match'

describe('analyzeJdMatch', () => {
  it('extracts meaningful B2B product requirements without treating AIS as AI', () => {
    const result = analyzeJdMatch({
      jobDescription: 'Product Manager for a B2B SaaS platform. Own the product backlog and roadmap, lead Agile sprint planning, partner with data science, and improve API and data pipeline reliability. The product uses AIS-derived signals.',
      resumeText: 'Product Manager with Agile delivery, product backlog ownership, roadmap planning and data pipeline experience.',
    })

    expect(result.matchedKeywords).toEqual(expect.arrayContaining([
      'Product Manager',
      'Product backlog',
      'Roadmap',
      'Agile',
      'Data pipeline',
    ]))
    expect(result.matchedKeywords).not.toContain('AI')
    expect(result.missingKeywords).toContain('API')
  })
})
