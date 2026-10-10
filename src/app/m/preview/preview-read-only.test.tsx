import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useAppStore } from '@/state/store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { AvatarActions } from '@/components/avatar/avatar-actions'
import MobilePreviewClient from './preview-client'

const navigation = vi.hoisted(() => ({ params: new URLSearchParams('tpl=simple'), router: { push: vi.fn() } }))
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
vi.mock('../_components/use-mini-program', () => ({ useInMiniProgram: () => false }))
vi.mock('../_components/use-mini-program-capabilities', () => ({ useMiniProgramCapabilities: () => ({ markdownExportSupported: true }) }))
vi.mock('./_components/preview-settings-sheet', () => ({ PreviewSettingsSheet: () => null, ONE_PAGE_BADGE_STYLES: {} }))

beforeEach(() => {
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
