import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumeData } from './resume-data'
import type { Section } from './section'
import { normalizeResumeContent } from './normalize-resume-content'
import { getRenderableResume } from './renderable-resume'
import { prepareResumeForExport, hasSectionContent } from '@/lib/resume-export-visibility'
import { exportResumeToMarkdown } from '@/io/export-markdown'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useSectionList } from '@/features/edit/draft/use-section-list'
import { useAppStore } from '@/state/store'
import { ModuleManageSheet } from '@/app/m/edit/_components/module-manage-sheet'
import { SectionsList } from '@/app/m/edit/_components/sections-list'
import LanyingTemplate from '@/templates/lanying'
import { buildResumeHtml } from '@/io/html-export'
import { emptyProjectFeedbackResume } from '@/dev/empty-project-feedback'
import { getSectionTypeRegistry, createDefaultBlock } from '@/entities/blocks/block-factory'
import { useEditorUiStore } from '@/state/editor-ui-store'
import { useRetainEditingBlock } from '@/editor/use-retain-editing-block'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

const emptyProject = (): Section => ({ id: 'empty-project', title: '项目经历', columns: 1, blocks: [] })
const makeResume = (): ResumeData => ({
  id: 'test-resume', name: '测试用户', sections: [
    { id: 'edu', title: '教育经历', columns: 1, blocks: [{ id: 'edu-1', type: 'education', school: '测试大学', startDate: '', endDate: '' }] },
    { id: 'skills', title: '相关技能', columns: 1, blocks: [{ id: 'skills-1', type: 'text', html: '<p>工程计算</p>' }] },
    emptyProject(),
  ],
})

beforeEach(() => {
  useEditorUiStore.setState({ editingBlockIds: [] })
  const resume = makeResume()
  useDraftStore.setState({ resumeId: resume.id, draft: resume, server: resume, dirtyPaths: [], hiddenSectionIds: [], isSaving: false })
  useAppStore.setState({ resume, pastStates: [], futureStates: [], readOnly: false })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('empty modules across load, preview and export', () => {
  it('matches the reported content density and retains all five real modules and seven entries', () => {
    const original = structuredClone(emptyProjectFeedbackResume)
    const normalized = normalizeResumeContent(original)
    const rendered = getRenderableResume(normalized)
    expect(rendered.sections).toEqual(original.sections.slice(0, 5))
    expect(rendered.sections.flatMap(s => s.blocks)).toHaveLength(7)
    expect(rendered.sections[1].blocks).toHaveLength(3)
    const { container } = render(<LanyingTemplate resume={rendered} theme={useAppStore.getState().getDefaultThemeForTemplate('lanying')} />)
    const html = buildResumeHtml(container)
    expect(html).not.toContain('项目经历')
    for (const section of original.sections.slice(0, 5)) expect(html).toContain(section.title)
    expect(exportResumeToMarkdown(original)).not.toContain('项目经历')
    expect(original).toEqual(emptyProjectFeedbackResume)
  })

  it('keeps every newly created module type visible and editable', () => {
    for (const entry of getSectionTypeRegistry()) {
      const block = createDefaultBlock(entry.label, prefix => `${prefix}-test`)
      const resume = { ...makeResume(), sections: [{ id: 'new', title: entry.label, columns: 1 as const, blocks: [block] }] }
      expect(getRenderableResume(resume).sections).toEqual(resume.sections)
    }
  })

  it('keeps source block indexes in a mixed editable module for reorder and drop targets', () => {
    const resume = makeResume()
    resume.sections[1].blocks.unshift({ id: 'blank', type: 'text', html: '<p><br></p>' })
    expect(getRenderableResume(resume, []).sections[1].blocks).toEqual(resume.sections[1].blocks)
    expect(getRenderableResume(resume).sections[1].blocks.map(b => b.id)).toEqual(['skills-1'])
  })

  it('retains an active blank rich-text editor until it closes, but exports no empty module', () => {
    const resume = makeResume()
    resume.sections[1].blocks = [{ id: 'skills-1', type: 'text', html: '<p><br></p>' }]
    const { rerender, unmount } = renderHook(({ editing }) => useRetainEditingBlock('skills-1', editing), { initialProps: { editing: true } })
    expect(getRenderableResume(resume, useEditorUiStore.getState().editingBlockIds).sections.map(s => s.id)).toEqual(['edu', 'skills'])
    expect(prepareResumeForExport(resume).sections.map(s => s.id)).toEqual(['edu'])
    rerender({ editing: false })
    expect(getRenderableResume(resume, useEditorUiStore.getState().editingBlockIds).sections.map(s => s.id)).toEqual(['edu'])
    rerender({ editing: true })
    unmount()
    expect(useEditorUiStore.getState().editingBlockIds).toEqual([])
  })
  it('removes legacy zero-block shells at the data boundary without reordering or mutating the source', () => {
    const original = makeResume()
    const normalized = normalizeResumeContent(original)
    expect(normalized.sections.map(s => s.id)).toEqual(['edu', 'skills'])
    expect(original.sections).toHaveLength(3)
    expect(normalizeResumeContent(normalized)).toEqual(normalized)
    useDraftStore.setState({ draft: null })
    useDraftStore.getState().setFromServer(original.id, original)
    expect(useDraftStore.getState().draft!.sections).toEqual(normalized.sections)
  })

  it('preserves editable blank blocks in storage but omits them from all output data', () => {
    const original = makeResume()
    original.sections.push({ id: 'empty-text', title: '空白文本', columns: 1, blocks: [{ id: 'text', type: 'text', html: '<p>&nbsp;&#160;&#xA0;\u200b<br></p>' }] })
    original.sections.push({ id: 'empty-list', title: '空白列表', columns: 1, blocks: [{ id: 'list', type: 'list', items: [{ id: 'item', html: '<p><br></p>' }] }] })
    original.sections[2].blocks.push({ id: 'project', type: 'project', name: ' ', role: '', startDate: '', endDate: '', contentHtml: '<p><br></p>' })
    const snapshot = structuredClone(original)
    expect(normalizeResumeContent(original).sections).toHaveLength(5)
    expect(getRenderableResume(original).sections.map(s => s.id)).toEqual(['edu', 'skills'])
    expect(prepareResumeForExport(original).sections).toEqual(getRenderableResume(original).sections)
    const md = exportResumeToMarkdown(original)
    for (const title of ['项目经历', '空白文本', '空白列表']) expect(md).not.toContain(title)
    expect(md).toContain('工程计算')
    expect(original).toEqual(snapshot)
  })

  it('keeps partial entries, rich media, display names and original relative order', () => {
    const original = makeResume()
    original.sections[2].displayTitle = '实践项目'
    original.sections[2].blocks.push({ id: 'project', type: 'project', name: '', startDate: '2026.09', endDate: '', contentHtml: '' })
    original.sections.push({ id: 'media', title: '作品', columns: 1, blocks: [{ id: 'img', type: 'text', html: '<p><img src="/example.png"></p>' }] })
    const rendered = getRenderableResume(original)
    expect(rendered.sections).toEqual(original.sections)
    expect(rendered.sections.every(hasSectionContent)).toBe(true)
    expect(exportResumeToMarkdown(original)).toContain('实践项目')
  })

  it('still masks hidden job intention while filtering empty modules', () => {
    const original = { ...makeResume(), jobIntentionVisible: false, baseInfo: { title: '工程师' }, jobIntention: { position: '工程师' } }
    const rendered = getRenderableResume(original)
    expect(rendered.sections).toHaveLength(2)
    expect(rendered.baseInfo?.title).toBeUndefined()
    expect(rendered.jobIntention?.position).toBeUndefined()
    expect(original.baseInfo.title).toBe('工程师')
  })

  it('mobile home follows the same emptiness rule without changing item indexes', () => {
    const original = makeResume()
    original.sections[2].blocks.push({ id: 'project', type: 'project', name: '', startDate: '', endDate: '', contentHtml: '<p>&nbsp;<br></p>' })
    render(<SectionsList sections={original.sections} />)
    expect(screen.queryByText('项目经历')).toBeNull()
    expect(screen.getByText('相关技能')).toBeTruthy()
    expect(original.sections[2].blocks).toHaveLength(1)
  })

  it('renders the reported template without the empty heading in its layout or exported HTML', () => {
    const { container } = render(<LanyingTemplate
      resume={getRenderableResume(makeResume())}
      theme={useAppStore.getState().getDefaultThemeForTemplate('lanying')}
    />)
    expect(screen.queryByRole('heading', { name: '项目经历' })).toBeNull()
    expect(screen.getByRole('heading', { name: '教育经历' })).toBeTruthy()
    const html = buildResumeHtml(container)
    expect(html).not.toContain('项目经历')
    expect(html).toContain('工程计算')
  })
})

describe('deletion, saving and re-adding', () => {
  it('does not remove other entries on an unknown id and keeps reorder/edit operations intact', () => {
    useDraftStore.setState({ draft: structuredClone(emptyProjectFeedbackResume) })
    const { result } = renderHook(() => useSectionList('实习经历'))
    const before = structuredClone(result.current.blocks)
    act(() => result.current.removeBlock('missing-id'))
    expect(result.current.blocks).toEqual(before)
    act(() => result.current.moveBlockDown(before[0].id))
    expect(result.current.blocks.map(b => b.id)).toEqual([before[1].id, before[0].id, before[2].id])
    act(() => result.current.updateBlock(before[0].id, { company: '修改后的公司' }))
    expect(result.current.blocks[1]).toMatchObject({ company: '修改后的公司' })
    act(() => result.current.moveBlockUp(before[0].id))
    expect(result.current.blocks[0]).toMatchObject({ id: before[0].id, company: '修改后的公司' })
  })

  it('keeps newer edits dirty when the follow-up save fails and reports failure', async () => {
    let finish!: (value: Response) => void
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve })).mockResolvedValue(new Response('网络中断', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const saving = useDraftStore.getState().saveAll()
    expect((await useDraftStore.getState().saveAll()).ok).toBe(false)
    useDraftStore.getState().updateDraft('name', draft => { draft.name = '更新后的姓名' })
    finish(new Response('{}'))
    expect((await saving).ok).toBe(false)
    expect(useDraftStore.getState().draft!.name).toBe('更新后的姓名')
    expect(useDraftStore.getState().dirtyPaths).toContain('name')
    expect(useDraftStore.getState().isSaving).toBe(false)
  })

  it('does not overwrite a different resume when a pending save completes', async () => {
    let finish!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    const saving = useDraftStore.getState().saveAll()
    const other = { ...makeResume(), id: 'other', name: '另一份简历' }
    useDraftStore.getState().setFromServer('other', other)
    finish(new Response('{}'))
    expect((await saving).ok).toBe(false)
    expect(useDraftStore.getState().draft!.id).toBe('other')
    expect(useDraftStore.getState().draft!.name).toBe('另一份简历')
  })
  it('deleting the last mobile entry removes its module and allows a fresh add', () => {
    const { result } = renderHook(() => useSectionList('项目经历'))
    let id = ''
    act(() => { id = result.current.addBlock() })
    act(() => result.current.removeBlock(id))
    expect(result.current.section).toBeNull()
    expect(useDraftStore.getState().draft!.sections.map(s => s.id)).toEqual(['edu', 'skills'])
    act(() => { result.current.addBlock() })
    expect(result.current.blocks).toHaveLength(1)
    expect(result.current.blocks[0].type).toBe('project')
  })

  it('deleting one of several entries preserves the remaining content', () => {
    const { result } = renderHook(() => useSectionList('项目经历'))
    let first = ''
    act(() => { first = result.current.addBlock(); result.current.addBlock() })
    const second = result.current.blocks[1]
    act(() => result.current.removeBlock(first))
    expect(result.current.blocks).toEqual([second])
  })

  it('PC last-block deletion removes the module and undo restores it', () => {
    const store = useAppStore.getState()
    store.addBlockByType('empty-project')
    const before = useAppStore.getState().resume
    // Model a pre-existing entry, not an add+delete grouped by the history debounce.
    useAppStore.setState({ pastStates: [] })
    store.deleteBlock('empty-project', before.sections[2].blocks[0].id)
    expect(useAppStore.getState().resume.sections).toHaveLength(2)
    store.undo()
    expect(useAppStore.getState().resume).toEqual(before)
  })

  it('mobile module manager can explicitly delete a legacy empty module', () => {
    render(<ModuleManageSheet open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '删除项目经历' }))
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    expect(useDraftStore.getState().draft!.sections.map(s => s.id)).toEqual(['edu', 'skills'])
    expect(screen.queryByRole('button', { name: '删除项目经历' })).toBeNull()
  })

  it('saves a cleaned payload and the module stays absent after reopening', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    expect((await useDraftStore.getState().saveAll()).ok).toBe(true)
    const content = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).content
    expect(content.sections.map((s: Section) => s.id)).toEqual(['edu', 'skills'])
    useDraftStore.getState().setFromServer('test-resume', content)
    expect(useDraftStore.getState().draft!.sections).toHaveLength(2)
  })

  it('does not resurrect a deleted module when an earlier save completes', async () => {
    const { result } = renderHook(() => useSectionList('项目经历'))
    act(() => { result.current.addBlock() })
    let finish!: (value: Response) => void
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve })).mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const saving = useDraftStore.getState().saveAll()
    act(() => result.current.removeBlock(result.current.blocks[0].id))
    await act(async () => { finish(new Response('{}')); await saving })
    expect(useDraftStore.getState().draft!.sections.map(s => s.id)).toEqual(['edu', 'skills'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const payload = JSON.parse(fetchMock.mock.calls[1][1]!.body as string)
    expect(payload.content.sections).toHaveLength(2)
    expect(useDraftStore.getState().dirtyPaths).toEqual([])
  })
})
