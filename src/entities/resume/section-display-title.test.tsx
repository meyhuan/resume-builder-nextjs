import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumeData } from './resume-data'
import { getSectionDisplayTitle, normalizeSectionDisplayTitle, validateSectionDisplayTitle } from './section-display-title'
import { normalizeResumeContent } from './normalize-resume-content'
import { useAppStore } from '@/state/store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useSectionDisplayTitle } from '@/features/edit/draft/use-section-display-title'
import { useSectionList } from '@/features/edit/draft/use-section-list'
import { useCustomSections } from '@/features/edit/draft/use-custom-sections'
import { useSingleTextBlock } from '@/features/edit/draft/use-single-text-block'
import { getModuleInfo, computeProgress } from '@/features/edit/progress/module-completeness'
import { findModuleBySectionTitle } from '@/entities/module/module-config'
import { applyTranslatedSection, applyTranslatedSectionToClone } from '@/lib/ai/apply-translated-section'
import { translatedSectionSchema } from '@/lib/ai/translate-schema'
import { toResumeContext } from '@/lib/ai/resume-context'
import { exportResumeToMarkdown } from '@/io/export-markdown'
import { prepareResumeForExport } from '@/lib/resume-export-visibility'
import { buildResumeHtml } from '@/io/html-export'
import { exportImage } from '@/io/export-image'
import { SectionTitleText } from '@/components/sections/section-title-text'
import { SectionNameEditor } from '@/components/sections/section-name-editor'
import SectionManager from '@/ui/section-manager'
import { ModuleManageSheet } from '@/app/m/edit/_components/module-manage-sheet'
import { SectionPreview } from '@/app/m/edit/_components/section-preview'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigate }) }))

vi.mock('html-to-image', () => ({ toPng: vi.fn(async () => 'data:image/png;base64,test') }))
vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))

const makeResume = (): ResumeData => ({
  id: 'resume', name: '张三', sections: [
    { id: 'work', title: '工作经历', columns: 1, blocks: [{ id: 'exp', type: 'experience', company: '示例公司', position: '工程师', startDate: '', endDate: '', contentHtml: '<p>建设数据平台</p>' }] },
    { id: 'custom', title: '个人作品', columns: 1, blocks: [{ id: 'text', type: 'text', html: '<p>作品说明</p>' }] },
    { id: 'skills', title: '相关技能', columns: 1, blocks: [{ id: 'skill', type: 'text', html: '<p>TypeScript</p>' }] },
  ],
})

beforeEach(() => {
  useAppStore.setState({ resume: makeResume(), pastStates: [], futureStates: [], readOnly: false })
  useDraftStore.setState({ resumeId: 'resume', draft: makeResume(), server: makeResume(), dirtyPaths: [] })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('display names preserve module identity', () => {
  it('normalizes optional names without truncating old strings or changing fallback labels', () => {
    expect(getSectionDisplayTitle(makeResume().sections[0], '原界面文案')).toBe('原界面文案')
    expect(normalizeSectionDisplayTitle(12)).toBeUndefined()
    expect(normalizeSectionDisplayTitle('  ')).toBeUndefined()
    const resume = makeResume()
    resume.sections[0].displayTitle = '旧'.repeat(60)
    const normalized = normalizeResumeContent(resume)
    expect(normalized.sections[0].displayTitle).toHaveLength(60)
    expect(normalized.sections[1]).not.toHaveProperty('displayTitle')
    expect(validateSectionDisplayTitle('😀'.repeat(40))).toBeUndefined()
    for (const value of ['', '  ', 'a\nb', 'a'.repeat(41)]) expect(validateSectionDisplayTitle(value)).toBeTruthy()
  })

  it('PC rename retains original content, classification and completion; adding still creates experience', () => {
    const original = makeResume()
    useAppStore.getState().updateSectionDisplayTitle('work', ' 职业履历 ')
    const renamed = useAppStore.getState().resume
    expect(renamed.sections[0]).toEqual({ ...original.sections[0], displayTitle: '职业履历' })
    expect(findModuleBySectionTitle(renamed.sections[0].title)?.key).toBe('workExp')
    expect(getModuleInfo(renamed, 'workExp')).toEqual(getModuleInfo(original, 'workExp'))
    expect(computeProgress(renamed)).toBe(computeProgress(original))
    useAppStore.getState().addBlockByType('work')
    expect(useAppStore.getState().resume.sections[0].blocks[1].type).toBe('experience')
  })

  it('supports undo, redo, reset, missing IDs and readonly guards without history noise', () => {
    const store = useAppStore.getState()
    store.updateSectionDisplayTitle('work', '职业履历')
    store.undo()
    expect(useAppStore.getState().resume.sections[0].displayTitle).toBeUndefined()
    store.redo()
    expect(useAppStore.getState().resume.sections[0].displayTitle).toBe('职业履历')
    store.updateSectionDisplayTitle('work', undefined)
    expect(useAppStore.getState().resume.sections[0]).not.toHaveProperty('displayTitle')
    const prior = useAppStore.getState().resume
    store.updateSectionDisplayTitle('missing', '名称')
    store.updateSectionDisplayTitle('work', '')
    store.setReadOnly(true)
    store.updateSectionDisplayTitle('work', '禁止修改')
    expect(useAppStore.getState().resume).toBe(prior)
  })

  it('mobile list and text bindings still resolve originals; duplicate display names stay independent', () => {
    const { result } = renderHook(() => ({ rename: useSectionDisplayTitle(), work: useSectionList('工作经历'), custom: useCustomSections(), skill: useSingleTextBlock('相关技能') }))
    act(() => {
      result.current.rename('work', '教育经历')
      result.current.custom.renameSection('custom', '教育经历')
      result.current.rename('skills', '核心能力')
    })
    expect(result.current.custom.sections.map(s => s.id)).toContain('custom')
    expect(result.current.work.section?.id).toBe('work')
    expect(result.current.skill.html).toBe('<p>TypeScript</p>')
    act(() => { result.current.work.addBlock(); result.current.skill.setHtml('<p>React</p>') })
    expect(result.current.work.blocks[1].type).toBe('experience')
    expect(useDraftStore.getState().draft?.sections).toHaveLength(3)
    expect(useDraftStore.getState().draft?.sections[1].title).toBe('个人作品')
  })

  it('persists and reopens display overrides through mobile save and PC normalization', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useSectionDisplayTitle())
    act(() => result.current('work', '职业履历'))
    await act(async () => { expect((await useDraftStore.getState().saveAll()).ok).toBe(true) })
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const content = JSON.parse(options.body as string).content
    useAppStore.getState().loadScenarioData(normalizeResumeContent(content))
    expect(useAppStore.getState().resume.sections[0]).toEqual({ ...makeResume().sections[0], displayTitle: '职业履历' })
    expect(useDraftStore.getState().dirtyPaths).toEqual([])
  })

  it('exports names and supplies AI context without replacing semantic title', () => {
    const resume = makeResume()
    resume.sections[0].displayTitle = '职业履历'
    expect(exportResumeToMarkdown(resume)).toContain('## 职业履历')
    expect(prepareResumeForExport(resume).sections[0].displayTitle).toBe('职业履历')
    expect(toResumeContext(resume).sections[0]).toMatchObject({ title: '工作经历', displayTitle: '职业履历' })
    expect(toResumeContext(resume).sections[1]).not.toHaveProperty('displayTitle')
  })

  it('translates title and override independently in overwrite and copy modes', () => {
    useAppStore.getState().updateSectionDisplayTitle('work', '职业履历')
    const original = useAppStore.getState().resume
    const payload = translatedSectionSchema.parse({ sectionId: 'work', title: 'Work Experience', displayTitle: 'Career History', blocks: [] })
    const copy = applyTranslatedSectionToClone(original, payload)
    expect(copy.sections[0]).toMatchObject({ title: 'Work Experience', displayTitle: 'Career History' })
    expect(original.sections[0].title).toBe('工作经历')
    applyTranslatedSection(payload)
    expect(useAppStore.getState().resume).toEqual(copy)
    expect(applyTranslatedSectionToClone(original, { sectionId: 'work', title: 'Work' }).sections[0].displayTitle).toBe('职业履历')
    expect(applyTranslatedSectionToClone(original, { sectionId: 'work', displayTitle: ' ' }).sections[0].displayTitle).toBe('职业履历')
    expect(applyTranslatedSectionToClone(makeResume(), payload).sections[0]).not.toHaveProperty('displayTitle')
    for (const invalid of [null, 123, ' ', 'line\nbreak']) {
      const translated = translatedSectionSchema.parse({ ...payload, displayTitle: invalid })
      expect(translated.displayTitle).toBeUndefined()
      expect(applyTranslatedSectionToClone(original, translated).sections[0].displayTitle).toBe('职业履历')
      applyTranslatedSection(translated)
      expect(useAppStore.getState().resume.sections[0].displayTitle).toBe('Career History')
    }
  })
})

describe('title editors and exports', () => {
  it('PC manager renames by ID while predefined module deduplication stays unchanged', () => {
    render(<SectionManager onClose={vi.fn()} onOpenPortfolio={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '修改工作经历名称' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '职业履历' } })
    fireEvent.click(screen.getByText('确定'))
    expect(useAppStore.getState().resume.sections[0]).toEqual({ ...makeResume().sections[0], displayTitle: '职业履历' })
    expect(screen.queryByText('工作经历')).toBeNull()
    fireEvent.click(screen.getByText('恢复默认名称'))
    expect(useAppStore.getState().resume.sections[0]).toEqual(makeResume().sections[0])
  })

  it('mobile manager updates the draft and preview keeps the work form route', () => {
    const { unmount } = render(<ModuleManageSheet open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '修改工作经历名称' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '职业履历' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    const section = useDraftStore.getState().draft!.sections[0]
    expect(section).toEqual({ ...makeResume().sections[0], displayTitle: '职业履历' })
    unmount()
    const module = findModuleBySectionTitle(section.title)!
    render(<SectionPreview section={section} module={module} />)
    fireEvent.click(screen.getByText('职业履历'))
    expect(navigate).toHaveBeenCalledWith(module.route)
  })

  it('inline editing validates, supports IME, cancels and commits exactly once', () => {
    const commit = vi.fn()
    render(<SectionTitleText value="工作经历" onCommit={commit} />)
    fireEvent.click(screen.getByText('工作经历'))
    const input = screen.getByRole('textbox')
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert').textContent).toBe('请输入模块名称')
    fireEvent.paste(input, { clipboardData: { getData: () => '职业\n履历' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert').textContent).toBe('模块名称不能包含换行')
    expect(commit).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '职业履历' } })
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(commit).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(commit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('工作经历'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' 职业履历 ' } })
    fireEvent.blur(screen.getByRole('textbox'))
    expect(commit).toHaveBeenCalledExactlyOnceWith('职业履历')
  })

  it('management edits do not bubble into drag and allow reset and duplicate names', () => {
    const change = vi.fn(), pointer = vi.fn()
    const section = { ...makeResume().sections[0], displayTitle: '职业履历' }
    render(<div onPointerDown={pointer}><SectionNameEditor section={section} onChange={change} /></div>)
    fireEvent.pointerDown(screen.getByText('修改模块名称'))
    expect(pointer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('修改模块名称'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '名'.repeat(41) } })
    fireEvent.click(screen.getByText('确定'))
    expect(screen.getByRole('alert').textContent).toContain('40')
    expect(change).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('取消'))
    fireEvent.click(screen.getByText('恢复默认名称'))
    expect(change).toHaveBeenCalledWith('work', undefined)
  })

  it('read-only titles cannot open an editor', () => {
    useAppStore.getState().setReadOnly(true)
    render(<SectionTitleText value="职业履历" onCommit={vi.fn()} />)
    fireEvent.click(screen.getByText('职业履历'))
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('HTML and image export exclude an active invalid editor and retain saved title', async () => {
    const { container } = render(<SectionTitleText value="职业履历" onCommit={vi.fn()} />)
    fireEvent.click(screen.getByText('职业履历'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    fireEvent.blur(screen.getByRole('textbox'))
    const html = buildResumeHtml(container)
    expect(html).toContain('职业履历')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('请输入模块名称')
    await exportImage({ current: container }, { returnBase64: true })
    const { toPng } = await import('html-to-image')
    const options = vi.mocked(toPng).mock.calls[0][1]
    expect(options?.filter?.(container.querySelector('[data-export-hide]')! as HTMLElement)).toBe(false)
    expect(options?.filter?.(container.querySelector('h2')!)).toBe(true)
  })
})
