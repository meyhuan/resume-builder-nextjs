import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { REFERENCE_DESIGNS, referenceStructureSignature } from '@/templates/_canva/designs'
import { TEMPLATE_METADATA } from './template-metadata'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'

describe('archived Canva adaptations', () => {
  it('has 24 real sources and distinct colour-independent layout recipes', () => {
    const entries = Object.entries(REFERENCE_DESIGNS)
    expect(entries).toHaveLength(24)
    expect(new Set(entries.map(([, design]) => design.sourceId)).size).toBe(24)
    expect(new Set(entries.map(([, design]) => referenceStructureSignature(design))).size).toBe(24)
    const records = readFileSync('docs/template-canva-batch-2026-09-28.md', 'utf8')
    for (const [id, design] of entries) {
      expect(records).toContain(design.sourceId)
      expect(statSync(`docs/template-references/canva-batch-2026-09-28/${id}-reference.jpg`).size).toBeGreaterThan(5000)
      expect(readFileSync(`src/templates/${id}/index.tsx`, 'utf8')).toContain('CanvaAdaptedTemplate')
    }
  })
  it('keeps runtime defaults and layout/density filters aligned with the measured designs', () => {
    for (const [id, design] of Object.entries(REFERENCE_DESIGNS)) {
      const metadata = TEMPLATE_METADATA[id as keyof typeof REFERENCE_DESIGNS]
      expect(metadata.taxonomy.layouts).toEqual([design.columns === 'single' ? 'single' : 'double'])
      expect(metadata.taxonomy.densities).toEqual([design.density])
      expect(TEMPLATE_REGISTRY[id].recommendedPrimaryColor).toBe(design.accent)
    }
  })
})
