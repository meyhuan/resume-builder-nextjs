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

describe('main integration save guards', () => {
  it('flushes edits made while saving instead of overwriting them with a stale response', async () => {
    useDraftStore.getState().setFromServer('save-in-flight', { id: 'save-in-flight', name: '初始姓名', sections: [] })
    let finishFirst!: (response: { ok: boolean }) => void
    const fetch = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
      .mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)
    const saving = useDraftStore.getState().saveAll()
    useDraftStore.getState().updateDraft('name', (draft) => { draft.name = '最新姓名' })
    finishFirst({ ok: true })
    expect(await saving).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetch.mock.calls[1][1].body).content.name).toBe('最新姓名')
    expect(useDraftStore.getState().draft?.name).toBe('最新姓名')
    expect(useDraftStore.getState().dirtyPaths).toEqual([])
  })

  it('rejects duplicate saves while a request is pending', async () => {
    useDraftStore.getState().setFromServer('duplicate-save', { id: 'duplicate-save', name: '测试', sections: [] })
    let finish!: (response: { ok: boolean }) => void
    const fetch = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    const saving = useDraftStore.getState().saveAll()
    expect(await useDraftStore.getState().saveAll()).toEqual({ ok: false, error: '正在保存，请稍后重试' })
    expect(fetch).toHaveBeenCalledTimes(1)
    finish({ ok: true })
    expect(await saving).toEqual({ ok: true })
  })

  it('does not replace a different resume when an old save completes', async () => {
    useDraftStore.getState().setFromServer('old-resume', { id: 'old-resume', name: '旧简历', sections: [] })
    let finish!: (response: { ok: boolean }) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finish = resolve })))
    const saving = useDraftStore.getState().saveAll()
    useDraftStore.getState().setFromServer('new-resume', { id: 'new-resume', name: '新简历', sections: [] })
    finish({ ok: true })
    expect(await saving).toEqual({ ok: false, error: '简历已切换，请保存当前简历' })
    expect(useDraftStore.getState().draft?.id).toBe('new-resume')
    expect(useDraftStore.getState().draft?.name).toBe('新简历')
  })
})
