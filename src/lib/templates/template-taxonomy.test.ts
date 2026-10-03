import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { templateMetadata } from './template-metadata'
import { templateCatalog } from './template-catalog'
import {
  filterTemplates,
  QUICK_FILTERS,
  TAXONOMY_OPTIONS,
  type TaxonomyDimension,
} from './template-taxonomy'
import {
  getAllTemplates,
  getPublicTemplates,
  getTemplate,
  TEMPLATE_REGISTRY,
} from '@/templates/template-loader'

describe('shared metadata and visibility', () => {
  it('covers every registered template once and preserves editor/catalog policy', () => {
    expect(templateMetadata).toHaveLength(64)
    expect(new Set(templateMetadata.map((t) => t.id)).size).toBe(64)
    expect(Object.keys(TEMPLATE_REGISTRY)).toEqual(
      templateMetadata.map((t) => t.id),
    )
    expect(getAllTemplates()).toHaveLength(63)
    expect(templateCatalog).toHaveLength(50)
    expect(getPublicTemplates().map((t) => t.id)).toEqual(templateCatalog.map((t) => t.id))
    expect(getPublicTemplates().every((t) => t.visibility.catalog && t.visibility.editor)).toBe(true)
    expect(getTemplate('lanxin')).toBeDefined()
    expect(getAllTemplates().some((t) => t.id === 'lanxin')).toBe(false)
    expect(
      getAllTemplates()
        .filter((t) => !templateCatalog.some((c) => c.id === t.id))
        .map((t) => t.id),
    ).toEqual(['shanglan', 'qingyun', 'mashang', 'zhumo', 'xingtan', 'suxian', 'mixu', 'chengyan', 'lanqi', 'shenke', 'kuangxu', 'huiying', 'jianqing'])
  })
  it('has valid attributes, real thumbnails, matching runtime metadata and lazy components', () => {
    for (const item of templateMetadata) {
      expect(existsSync('public' + item.preview), item.id).toBe(true)
      expect(getTemplate(item.id)?.taxonomy).toEqual(item.taxonomy)
      expect(getTemplate(item.id)?.preview).toBe(item.preview)
      expect(getTemplate(item.id)?.component).toBeDefined()
      for (const key of Object.keys(TAXONOMY_OPTIONS) as TaxonomyDimension[]) {
        expect(item.taxonomy[key].length, item.id + ':' + key).toBeGreaterThan(
          0,
        )
        for (const value of item.taxonomy[key])
          expect(value in TAXONOMY_OPTIONS[key]).toBe(true)
      }
    }
  })
})

describe('filter semantics', () => {
  it('keeps ordering, deduplicates and never mutates input', () => {
    const before = JSON.stringify(templateMetadata)
    expect(filterTemplates([...templateCatalog, ...templateCatalog])).toEqual(
      templateCatalog,
    )
    filterTemplates(templateMetadata, { roles: ['technical'] })
    expect(JSON.stringify(templateMetadata)).toBe(before)
  })
  it('ORs a dimension and ANDs independent dimensions', () => {
    const result = filterTemplates(templateCatalog, {
      roles: ['technical', 'education'],
      layouts: ['double'],
    })
    expect(result.map((t) => t.id)).toEqual(['lifeng', 'heiyao', 'shujuliu'])
  })
  it('handles empty selections, no results and unverified bilingual capability', () => {
    expect(filterTemplates(templateCatalog, { roles: [] })).toEqual(
      templateCatalog,
    )
    expect(
      filterTemplates(templateCatalog, {
        languages: ['en'],
        layouts: ['double'],
      }),
    ).toEqual([])
    expect(
      filterTemplates(templateCatalog, { languages: ['bilingual'] }),
    ).toEqual([])
    expect(
      filterTemplates(templateCatalog, { languages: ['en'] }).map((t) => t.id),
    ).toEqual(['moxu'])
  })
  it('counts quick entries using only the supplied visible list', () => {
    const tech = QUICK_FILTERS.find((q) => q.id === 'tech')!
    expect(filterTemplates(getAllTemplates(), tech.filters).length).toBeGreaterThanOrEqual(
      filterTemplates(templateCatalog, tech.filters).length,
    )
    for (const quick of QUICK_FILTERS)
      expect(
        filterTemplates(templateCatalog, quick.filters).some(
          (t) => t.id === 'lanxin',
        ),
      ).toBe(false)
  })
})
