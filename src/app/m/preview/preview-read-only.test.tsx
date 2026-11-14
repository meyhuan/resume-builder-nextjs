import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useAppStore } from '@/state/store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { AvatarActions } from '@/components/avatar/avatar-actions'
import MobilePreviewClient from './preview-client'
import { CSS_PX_PER_MM } from '@/lib/resume-page-metrics'

const navigation = vi.hoisted(() => ({ params: new URLSearchParams('tpl=simple'), router: { push: vi.fn() } }))
const mini = vi.hoisted(() => ({ enabled: false }))
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.params, useRouter: () => navigation.router }))
vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }))
vi.mock('@/templates/template-loader', () => ({
  TEMPLATE_REGISTRY: { simple: {} },
  getTemplate: () => ({ component: ({ resume }: { resume: ResumeData }) => <div>
    <img src={resume.baseInfo?.avatarUrl || undefined} alt="证件照" />
    <AvatarActions baseInfo={resume.baseInfo ?? null} name={resume.name} onUpload={vi.fn()} />
    <div data-testid="section-order">{resume.sections.map((section) => section.id).join(',')}</div>
  </div> }),
}))
vi.mock('@/components/ai-section/ai-section-provider', () => ({ default: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/components/vip/vip-upgrade-dialog', () => ({ default: () => null }))
vi.mock('@/hooks/use-vip-check', () => ({ useVipCheck: () => ({ showUpgrade: false, setShowUpgrade: vi.fn() }) }))
vi.mock('@/hooks/use-one-page-mode', () => ({ useOnePageMode: () => ({ status: 'idle' }) }))
vi.mock('@/hooks/use-resume-pagination', () => ({ useResumePagination: () => [] }))
vi.mock('../_components/use-mini-program', () => ({ useInMiniProgram: () => mini.enabled }))
vi.mock('../_components/use-mini-program-capabilities', () => ({ useMiniProgramCapabilities: () => ({ markdownExportSupported: true }) }))
vi.mock('./_components/preview-settings-sheet', () => ({ PreviewSettingsSheet: (props: { open: boolean; templateId: string; onClose: () => void; onConfirm: () => void; onSelectTemplate: (id: string) => void }) => props.open ? <div role="dialog">
  <span data-testid="selected-template">{props.templateId}</span>
  <button onClick={() => props.onSelectTemplate('qingning')}>选择青柠</button>
  <button onClick={() => props.onSelectTemplate('moxu')}>选择墨序</button>
  <button onClick={props.onClose}>关闭样式面板</button>
  <button onClick={props.onConfirm}>查看整体效果</button>
</div> : null, ONE_PAGE_BADGE_STYLES: {} }))

beforeEach(() => {
  mini.enabled = false
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  useAppStore.setState({ readOnly: false, themes: {} })
  useDraftStore.setState({ resumeId: null, draft: null, dirtyPaths: [] })
  useDraftStore.getState().setFromServer('preview-fixture', {
    id: 'preview-fixture', name: '测试用户', baseInfo: { avatarUrl: '/avatar.jpg' },
    sections: [
      { id: 'edu', title: '教育经历', columns: 1, blocks: [{ id: 'edu-text', type: 'text', html: '<p>教育经历内容</p>' }] },
      { id: 'work', title: '工作经历', columns: 1, blocks: [{ id: 'work-text', type: 'text', html: '<p>工作经历内容</p>' }] },
    ],
  }, 'simple')
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.wx
})

it.each([['导出 PDF', 'pdf'], ['导出图片', 'image'], ['导出 Markdown', 'markdown']])(
  'hands %s to the original native preview before creating or confirming an export',
  async (label, type) => {
    mini.enabled = true
    const navigateTo = vi.fn()
    window.wx = { miniProgram: { navigateTo } } as unknown as NonNullable<typeof window.wx>
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<MobilePreviewClient />)
    fireEvent.click(screen.getByRole('button', { name: '导出' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: label })) })
    expect(navigateTo).toHaveBeenCalledOnce()
    const destination = new URL(navigateTo.mock.calls[0][0].url, 'https://mini.invalid')
    expect(destination.pathname).toBe('/pages/exportResult/exportResult')
    expect(destination.searchParams.get('resumeId')).toBe('preview-fixture')
    expect(destination.searchParams.get('type')).toBe(type)
    expect(destination.searchParams.has('id')).toBe(false)
    expect(destination.searchParams.has('url')).toBe(false)
    // Native preview owns quota checking and its existing single/member paywall.
    expect(fetchMock.mock.calls.every(([url]) => url === '/next-api/resumes/preview-fixture')).toBe(true)
  },
)

it('places mobile page labels at successive boundaries and removes them when content fits one page', () => {
  let resize: ResizeObserverCallback
  let observed: Element
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback }
    observe(node: Element) { observed = node }
    disconnect() {}
  })
  render(<MobilePreviewClient />)
  const resizeContent = (height: number) => act(() => resize([
    { target: observed, contentRect: { height } } as ResizeObserverEntry,
  ], {} as ResizeObserver))
  resizeContent(2500)
  const guides = screen.getByText('第 2 页').closest('[data-mobile-page-guides]')!
  expect(guides.getAttribute('data-export-hide')).toBe('true')
  expect(guides.classList.contains('print:hidden')).toBe(true)
  // The mobile store's default theme has 19 mm vertical margins.
  expect(parseFloat(screen.getByText('第 2 页').parentElement!.style.top)).toBeCloseTo(278 * CSS_PX_PER_MM)
  expect(parseFloat(screen.getByText('第 3 页').parentElement!.style.top)).toBeCloseTo(537 * CSS_PX_PER_MM)
  resizeContent(500)
  expect(screen.queryByText('第 2 页')).toBeNull()
})

it('keeps avatar controls hidden throughout draft reordering and restores editing on exit', () => {
  const view = render(<MobilePreviewClient />)
  expect(screen.queryByText('本地上传')).toBeNull()
  expect(screen.queryByText('调整大小')).toBeNull()
  expect(screen.getByAltText('证件照')).toBeTruthy()
  expect(screen.getByTestId('section-order').textContent).toBe('edu,work')

  // Watch every store notification, including effect cleanup, so a temporary
  // release of read-only mode cannot pass just because the final state is true.
  const modes: boolean[] = []
  const unsubscribe = useAppStore.subscribe((state) => { modes.push(state.readOnly) })
  act(() => useDraftStore.getState().reorderSections(0, 1))
  expect(screen.getByTestId('section-order').textContent).toBe('work,edu')
  expect(modes.length).toBeGreaterThan(0)
  expect(modes.every(Boolean)).toBe(true)
  expect(screen.queryByText('本地上传')).toBeNull()
  expect(screen.queryByText('调整大小')).toBeNull()
  view.unmount()
  expect(useAppStore.getState().readOnly).toBe(false)
  unsubscribe()
  render(<AvatarActions baseInfo={{ avatarUrl: '/avatar.jpg' }} name="测试用户" onUpload={vi.fn()} />)
  expect(screen.getByText('本地上传')).toBeTruthy()
  expect(screen.getByText('调整大小')).toBeTruthy()
})


it.each(['关闭样式面板', '查看整体效果'])('keeps the latest selection after %s and undoes the whole selection session', async (closeLabel) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  render(<MobilePreviewClient />)
  fireEvent.click(screen.getByRole('button', { name: '样式' }))
  fireEvent.click(screen.getByRole('button', { name: '选择青柠' }))
  expect(useDraftStore.getState().templateId).toBe('qingning')
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '选择墨序' }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: closeLabel })) })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(useDraftStore.getState().templateId).toBe('moxu')
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).template).toBe('moxu')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '撤销本次调整' })) })
  expect(useDraftStore.getState().templateId).toBe('simple')
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).template).toBe('simple')
  expect(screen.queryByRole('button', { name: '撤销本次调整' })).toBeNull()
})

it('keeps the selected template on save failure and retries without reopening the sheet', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'failed' }).mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  render(<MobilePreviewClient />)
  fireEvent.click(screen.getByRole('button', { name: '样式' }))
  fireEvent.click(screen.getByRole('button', { name: '选择青柠' }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '关闭样式面板' })) })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(useDraftStore.getState().templateId).toBe('qingning')
  expect(screen.getByRole('alert').textContent).toContain('当前效果已保留')
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '重试保存' })) })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).template).toBe('qingning')
})
