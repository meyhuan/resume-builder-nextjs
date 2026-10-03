import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDraftStore } from './draft-store'
import { DEFAULT_EDITOR_META } from '@/entities/editor/editor-meta'
import { DEFAULT_PREVIEW_THEME } from '@/app/m/preview/_components/preview-settings-sheet'

vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))
afterEach(() => vi.unstubAllGlobals())

describe('preview thumbnail persistence', () => {
  it('preserves committed editor metadata without changing the draft', async () => {
    useDraftStore.getState().setFromServer('fixture', { id: 'fixture', name: '测试简历', sections: [] }, 'moxu')
    const draft = useDraftStore.getState().draft
    const metadata = { ...DEFAULT_EDITOR_META, themes: { moxu: { ...DEFAULT_PREVIEW_THEME, primaryColor: '#2563eb' } } }
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)
    expect(await useDraftStore.getState().saveThumbnail('data:image/png;base64,fixture', metadata)).toEqual({ ok: true })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.content.__editorMeta).toEqual(metadata)
    expect(body.content.name).toBe('测试简历')
    expect(body.thumbnail).toBe('data:image/png;base64,fixture')
    expect(useDraftStore.getState().draft).toBe(draft)
  })
  it('returns a failed result when thumbnail persistence fails', async () => {
    useDraftStore.getState().setFromServer('fixture', { id: 'fixture', name: '测试简历', sections: [] })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' }))
    expect(await useDraftStore.getState().saveThumbnail('fixture', DEFAULT_EDITOR_META)).toEqual({ ok: false, error: '封面保存失败 (503)' })
  })
})
