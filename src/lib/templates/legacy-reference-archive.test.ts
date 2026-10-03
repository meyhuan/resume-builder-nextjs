import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TEMPLATE_METADATA } from './template-metadata'

describe('archived legacy reference sources', () => {
  it('keeps four unchanged SVG sources with reproducible hashes, dimensions and outlined text', () => {
    for (const id of ['qingning', 'jingrui', 'lanzix', 'moxu']) {
      const directory = `docs/template-references/legacy-2026-10-01/${id}`
      const source = readFileSync(`${directory}/reference.svg`)
      const record = JSON.parse(readFileSync(`${directory}/source.json`, 'utf8'))
      const png = readFileSync(`${directory}/reference.png`)
      expect(record.id).toBe(id)
      expect(createHash('sha256').update(source).digest('hex')).toBe(record.sha256)
      expect(source.byteLength).toBe(record.bytes)
      expect(record.textNodes).toBe(0)
      expect(record.pathNodes).toBeGreaterThan(500)
      expect(record.externalImageReferences).toEqual([])
      expect(png.subarray(1, 4).toString()).toBe('PNG')
      expect(png.readUInt32BE(16)).toBe(794)
      expect(png.readUInt32BE(20)).toBe(1123)
    }
  })
  it('does not invent unknown public template IDs or market a referenced source as original', () => {
    const records = (id: string) => JSON.parse(readFileSync(`docs/template-references/legacy-2026-10-01/${id}/source.json`, 'utf8'))
    expect(records('jingrui').sourceId).toBeNull()
    expect(records('lanzix').sourceId).toBeNull()
    expect(records('qingning').sourceIdKind).toContain('design ID, not a public template ID')
    expect(records('moxu').sourceId).toBe('EAGGgJLDRO8')
    expect(TEMPLATE_METADATA.lanzix.tags).not.toContain('原创')
  })
})
