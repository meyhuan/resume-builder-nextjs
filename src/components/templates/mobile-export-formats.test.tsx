import { afterEach, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { BottomActionBar } from '@/app/m/preview/_components/bottom-action-bar'
import { ExportLoadingContent } from '@/app/m/preview/_components/export-loading-content'
import { EXPORT_JOB_TIPS, pickExportJobTips } from '@/lib/export-job-tips'
import { miniProgramRuntime } from '@/app/m/_components/mini-program-runtime'
import { HomeActionBar } from '@/app/m/edit/_components/home-action-bar'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import type { ExportFormat } from '@/components/export-format-options'
import type { ExportProgressListener } from '@/lib/export-progress'
const navigation = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation }))
vi.mock('@/app/m/edit/_components/module-manage-sheet', () => ({ ModuleManageSheet: () => null }))
vi.mock('@/app/m/edit/_components/use-pc-guide-entry', () => ({ usePcGuideEntry: () => ({ openingPcGuide: false, openPcGuide: vi.fn() }) }))
const asset = (type: ExportFormat): ExportPreviewAsset => ({
  id: type + '-preview',
  type,
  fileName: '简历',
  downloadUrl: '/file/' + type,
  confirmed: false,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  previewImages: ['/page-' + type + '.jpg'],
  markdownContent: type === 'markdown' ? '# 本次 Markdown 内容' : undefined,
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  sessionStorage.clear()
  history.replaceState({}, '', '/')
  navigation.push.mockClear()
  vi.mocked(toast.info).mockClear()
})
const props = () => ({
  onOpenSettings: vi.fn(),
  onPrepareExport: vi.fn(async (type: ExportFormat) => asset(type)),
  onConfirmExport: vi.fn().mockResolvedValue(undefined),
  previewRevision: 'first',
  wordSupported: true,
  wordClientSupported: true,
  isExporting: false,
})
it('shows the live Word stage in the mini-program H5 panel', async () => {
  render(<BottomActionBar {...props()} onPrepareExport={async (type, progress?: ExportProgressListener) => {
    if (type !== 'docx') return asset(type)
    progress?.('queued')
    return new Promise<ExportPreviewAsset>(() => {})
  }} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  await waitFor(() => expect(screen.getByText('预览任务排队中，请稍候…')).toBeTruthy())
  expect((screen.getByRole('button', {name:'确认导出 Word'}) as HTMLButtonElement).disabled).toBe(true)
})

it('shows four formats on legacy clients with an explicit update message', () => {
  const p = props()
  render(
    <BottomActionBar
      {...p}
      wordClientSupported={false}
      showMarkdownExport={false}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  for (const name of [/^PDF/, /^Word/, /^图片/, /^Markdown/])
    expect(screen.getByRole('button', { name })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  expect(
    (screen.getByRole('button', { name: '请更新小程序' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  expect(p.onConfirmExport).not.toHaveBeenCalled()
})

it('only hints for unsupported Word, then previews normally with a supported template', async () => {
  const p = props()
  const view = render(<BottomActionBar {...p} wordSupported={false} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  expect(screen.getByRole('button', { name: /^Word/ }).getAttribute('aria-disabled')).toBe('true')
  expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('请返回模板列表，筛选'), expect.objectContaining({ id: 'word-export-unsupported' }))
  expect(screen.queryByText(/请返回模板列表，筛选/)).toBeNull()
  expect(p.onPrepareExport.mock.calls.map(([type]) => type)).not.toContain('docx')
  expect(p.onConfirmExport).not.toHaveBeenCalled()
  view.rerender(<BottomActionBar {...p} />)
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  expect(
    (screen.getByRole('button', { name: '确认导出 Word' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  fireEvent.load(await screen.findByAltText('Word 预览第 1 页'))
  fireEvent.click(screen.getByRole('button', { name: '确认导出 Word' }))
  expect(p.onConfirmExport).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'docx-preview', confirmed: false }),
  )
})

it('defaults to PDF, previews all four formats and caches completed previews', async () => {
  const p = props()
  render(<BottomActionBar {...p} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  expect(await screen.findByAltText('PDF 预览第 1 页')).toBeTruthy()
  for (const [label, alt] of [
    ['Word', 'Word'],
    ['图片', 'PNG'],
  ] as const) {
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp('^' + label) }),
    )
    fireEvent.load(await screen.findByAltText(alt + ' 预览第 1 页'))
    expect(
      (
        screen.getByRole('button', {
          name: '确认导出 ' + label,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  }
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  expect(await screen.findByRole('heading', { name: '本次 Markdown 内容' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  await screen.findByAltText('Word 预览第 1 页')
  expect(p.onPrepareExport.mock.calls.map(([type]) => type)).toEqual([
    'pdf',
    'docx',
    'image',
    'markdown',
  ])
  expect(p.onConfirmExport).not.toHaveBeenCalled()
})

it.each([['pdf', 'PDF'], ['docx', 'Word'], ['image', '图片']] as const)(
  'labels exhausted %s as membership export while still requiring its preview', async (format, label) => {
    const p = props()
    p.onPrepareExport.mockImplementation(async type => ({ ...asset(type), isVip: false, remaining: 0 }))
    render(<BottomActionBar {...p} />)
    fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
    if (format !== 'pdf') fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + label) }))
    const button = await screen.findByRole('button', { name: '开通会员，导出 ' + label })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('免费导出次数已用完，预览不受影响；开通会员后可导出。')).toBeTruthy()
    fireEvent.load(await screen.findByAltText((format === 'image' ? 'PNG' : label) + ' 预览第 1 页'))
    fireEvent.click(button)
    // Confirmation rechecks current entitlement, allowing a user who has since subscribed.
    expect(p.onConfirmExport).toHaveBeenCalledWith(expect.objectContaining({ type: format, remaining: 0 }))
    fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
    await screen.findByRole('heading', { name: '本次 Markdown 内容' })
    fireEvent.click(screen.getByRole('button', { name: '确认导出 Markdown' }))
    expect(p.onConfirmExport).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'markdown' }))
    expect(screen.queryByText(/免费导出次数已用完/)).toBeNull()
  },
)

it('ignores a late Word response after switching to Markdown', async () => {
  let resolveWord!: (value: ExportPreviewAsset) => void
  const p = props()
  p.onPrepareExport.mockImplementation((type) =>
    type === 'docx'
      ? new Promise((resolve) => {
          resolveWord = resolve
        })
      : Promise.resolve(asset(type)),
  )
  render(<BottomActionBar {...p} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  await screen.findByAltText('PDF 预览第 1 页')
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  await waitFor(() => expect(resolveWord).toBeTypeOf('function'))
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  await screen.findByRole('heading', { name: '本次 Markdown 内容' })
  await act(async () => resolveWord(asset('docx')))
  expect(screen.queryByAltText('Word 预览第 1 页')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '确认导出 Markdown' }))
  expect(p.onConfirmExport).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'markdown' }),
  )
})

it('updates quota after returning from membership without regenerating the Word preview', async () => {
  const p = props()
  const view = render(<BottomActionBar {...p} exportQuota={{ isVip: false, remaining: 0 }} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  fireEvent.load(await screen.findByAltText('Word 预览第 1 页'))
  expect(screen.getByRole('button', { name: '开通会员，导出 Word' })).toBeTruthy()
  const prepared = p.onPrepareExport.mock.calls.length
  view.rerender(<BottomActionBar {...p} exportQuota={{ isVip: true, remaining: 'unlimited' }} />)
  expect(screen.getByText('会员不限次导出')).toBeTruthy()
  expect(screen.getByRole('button', { name: '确认导出 Word' })).toBeTruthy()
  expect(p.onPrepareExport.mock.calls.length).toBe(prepared)
  view.rerender(<BottomActionBar {...p} exportQuota={{ isVip: false, remaining: 0 }} confirmedExportIds={new Set(['docx-preview'])} />)
  fireEvent.click(screen.getByRole('button', { name: '确认导出 Word' }))
  expect(p.onConfirmExport).toHaveBeenCalledWith(expect.objectContaining({ id: 'docx-preview' }))
  expect(p.onPrepareExport.mock.calls.length).toBe(prepared)
})

it('remembers the native capability across H5 navigation and clears it on an old-client launch', () => {
  history.replaceState({}, '', '/m?miniVersion=2.0.1&miniDocx=1')
  expect(miniProgramRuntime.supportsDocxExport()).toBe(true)
  miniProgramRuntime.rememberCurrentUrl()
  history.replaceState({}, '', '/m/preview')
  expect(miniProgramRuntime.supportsDocxExport()).toBe(true)
  history.replaceState({}, '', '/m/preview?miniVersion=2.0.1')
  miniProgramRuntime.rememberCurrentUrl()
  expect(miniProgramRuntime.supportsDocxExport()).toBe(true)
  history.replaceState({}, '', '/m?miniVersion=2.0.1')
  expect(miniProgramRuntime.supportsDocxExport()).toBe(false)
  miniProgramRuntime.rememberCurrentUrl()
  history.replaceState({}, '', '/m/preview')
  expect(miniProgramRuntime.supportsDocxExport()).toBe(false)
})

it('carries Word support from the edit home to the preview URL', () => {
  history.replaceState({}, '', '/m/edit?id=sample&source=mini&miniVersion=2.0.1&miniDocx=1')
  miniProgramRuntime.rememberCurrentUrl()
  render(<HomeActionBar resumeId="sample" template="canva-minimal" />)
  fireEvent.click(screen.getByRole('button', { name: '预览简历' }))
  const target = navigation.push.mock.calls[0][0]
  expect(new URL(target, location.origin).searchParams.get('miniDocx')).toBe('1')
  history.replaceState({}, '', target)
  miniProgramRuntime.rememberCurrentUrl()
  expect(miniProgramRuntime.supportsDocxExport()).toBe(true)
})

it('clears Word support on explicit denial, native old-client entry or a different version', () => {
  for (const target of [
    '/m/preview?miniVersion=2.0.1&miniDocx=0',
    '/m/edit?source=mini&miniVersion=2.0.1',
    '/m/preview?miniVersion=1.9.0',
  ]) {
    history.replaceState({}, '', '/m/edit?source=mini&miniVersion=2.0.1&miniDocx=1')
    miniProgramRuntime.rememberCurrentUrl()
    history.replaceState({}, '', target)
    expect(miniProgramRuntime.supportsDocxExport()).toBe(false)
    miniProgramRuntime.rememberCurrentUrl()
    history.replaceState({}, '', '/m/preview')
    expect(miniProgramRuntime.supportsDocxExport()).toBe(false)
  }
})

it('uses only an accessible title inside the native shell without duplicate navigation controls', () => {
  render(<BottomActionBar {...props()} inMiniProgram />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  expect(screen.getByRole('heading', { name: '导出预览' }).classList.contains('sr-only')).toBe(true)
  expect(screen.queryByRole('button', { name: '关闭导出预览' })).toBeNull()
  expect(screen.queryByRole('button', { name: '返回简历' })).toBeNull()
})

it('opens membership directly for known exhausted quota without attempting an export', async () => {
  const p = props()
  const openMembership = vi.fn()
  render(<BottomActionBar {...p} inMiniProgram onRequestMembership={openMembership} exportQuota={{ isVip: false, remaining: 0 }} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  const image = await screen.findByAltText('PDF 预览第 1 页')
  fireEvent.load(image)
  const button = screen.getByRole('button', { name: '开通会员，导出 PDF' })
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(button)
  expect(openMembership).toHaveBeenCalledTimes(1)
  expect(p.onConfirmExport).not.toHaveBeenCalled()
})

it('allows membership during generation, but waits for the real preview before downloading after rights recover', async () => {
  const p = props()
  const openMembership = vi.fn()
  let finish!: (asset: ExportPreviewAsset) => void
  const prepare = vi.fn(() => new Promise<ExportPreviewAsset>(resolve => { finish = resolve }))
  const shared = { ...p, onPrepareExport: prepare, inMiniProgram: true, onRequestMembership: openMembership, loadingContent: <ExportLoadingContent /> }
  const h = render(<BottomActionBar {...shared} exportQuota={{ isVip: false, remaining: 0 }} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  await screen.findByRole('region', { name: '求职小提示' })
  expect(screen.queryByText('先检查一下简历内容')).toBeNull()
  const membership = screen.getByRole('button', { name: '开通会员，导出 PDF' }) as HTMLButtonElement
  expect(membership.disabled).toBe(false)
  fireEvent.click(membership)
  expect(openMembership).toHaveBeenCalledTimes(1)
  expect(p.onConfirmExport).not.toHaveBeenCalled()
  expect(prepare).toHaveBeenCalledTimes(1)
  h.rerender(<BottomActionBar {...shared} exportQuota={{ isVip: true, remaining: 'unlimited' }} />)
  expect((screen.getByRole('button', { name: '确认导出 PDF' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => finish(asset('pdf')))
  const image = await screen.findByAltText('PDF 预览第 1 页')
  expect(screen.queryByRole('region', { name: '求职小提示' })).toBeNull()
  expect((screen.getByRole('button', { name: '确认导出 PDF' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.load(image)
  await waitFor(() => expect((screen.getByRole('button', { name: '确认导出 PDF' }) as HTMLButtonElement).disabled).toBe(false))
  expect(p.onConfirmExport).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '确认导出 PDF' }))
  expect(p.onConfirmExport).toHaveBeenCalledTimes(1)
})

it('changes waiting tips with horizontal swipes and buttons without confusing vertical gestures', () => {
  render(<ExportLoadingContent />)
  const tips = screen.getByRole('region', { name: '求职小提示' })
  const first = tips.dataset.tipId
  fireEvent.touchStart(tips, { touches: [{ clientX: 250, clientY: 100 }] })
  fireEvent.touchEnd(tips, { changedTouches: [{ clientX: 50, clientY: 110 }] })
  const second = tips.dataset.tipId
  expect(second).not.toBe(first)
  fireEvent.touchStart(tips, { touches: [{ clientX: 250, clientY: 100 }] })
  fireEvent.touchEnd(tips, { changedTouches: [{ clientX: 200, clientY: 250 }] })
  expect(tips.dataset.tipId).toBe(second)
  fireEvent.click(screen.getByRole('button', { name: '上一条求职提示' }))
  expect(tips.dataset.tipId).toBe(first)
  const seen = new Set([first])
  for (let i = 0; i < 4; i++) { fireEvent.click(screen.getByRole('button', { name: '下一条求职提示' })); seen.add(tips.dataset.tipId) }
  expect(seen.size).toBe(5)
  fireEvent.click(screen.getByRole('button', { name: '下一条求职提示' }))
  expect(tips.dataset.tipId).toBe(first)
})

it('samples five unique tips from twenty without mutating the library', () => {
  expect(EXPORT_JOB_TIPS).toHaveLength(20)
  const original = EXPORT_JOB_TIPS.map(tip => tip.id)
  const first = pickExportJobTips(() => 0), second = pickExportJobTips(() => 0.99)
  expect(first).toHaveLength(5)
  expect(new Set(first.map(tip => tip.id)).size).toBe(5)
  expect(first).not.toEqual(second)
  expect(EXPORT_JOB_TIPS.map(tip => tip.id)).toEqual(original)
})

it('rotates the chosen five every ten seconds, pauses for interaction and visibility, and clears its timer', () => {
  vi.useFakeTimers()
  const h = render(<ExportLoadingContent />)
  const tips = screen.getByRole('region', { name: '求职小提示' })
  const first = tips.dataset.tipId
  h.rerender(<ExportLoadingContent />)
  expect(tips.dataset.tipId).toBe(first)
  act(() => vi.advanceTimersByTime(9999))
  expect(tips.dataset.tipId).toBe(first)
  act(() => vi.advanceTimersByTime(1))
  expect(tips.dataset.tipId).not.toBe(first)
  act(() => vi.advanceTimersByTime(40_000))
  expect(tips.dataset.tipId).toBe(first)
  fireEvent.click(screen.getByRole('button', { name: '暂停自动轮播' }))
  act(() => vi.advanceTimersByTime(20_000))
  expect(tips.dataset.tipId).toBe(first)
  fireEvent.click(screen.getByRole('button', { name: '继续自动轮播' }))
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(20_000))
  expect(tips.dataset.tipId).toBe(first)
  hidden.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(10_000))
  expect(tips.dataset.tipId).not.toBe(first)
  fireEvent.focus(screen.getByRole('button', { name: '下一条求职提示' }))
  const focused = tips.dataset.tipId
  act(() => vi.advanceTimersByTime(20_000))
  expect(tips.dataset.tipId).toBe(focused)
  h.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('does not unlock a pending export with unknown quota or a free format', async () => {
  const p = props()
  const openMembership = vi.fn()
  const prepare = vi.fn(() => new Promise<ExportPreviewAsset>(() => {}))
  const h = render(<BottomActionBar {...p} onPrepareExport={prepare} onRequestMembership={openMembership} />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  expect((screen.getByRole('button', { name: '确认导出 PDF' }) as HTMLButtonElement).disabled).toBe(true)
  h.rerender(<BottomActionBar {...p} onPrepareExport={prepare} onRequestMembership={openMembership} exportQuota={{ isVip: false, remaining: 0 }} />)
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  expect((screen.getByRole('button', { name: '确认导出 Markdown' }) as HTMLButtonElement).disabled).toBe(true)
  expect(openMembership).not.toHaveBeenCalled()
})

it('backs out of export first, keeps format switches in one entry, and restores on forward', async () => {
  history.replaceState({ preserved: 'editor' }, '', '/m/edit?id=sample')
  const previewUrl = '/m/preview?id=sample&tpl=canva-minimal&miniDocx=1#resume'
  history.pushState({ preserved: 'preview' }, '', previewUrl)
  const length = history.length
  render(<BottomActionBar {...props()} inMiniProgram />)
  fireEvent.click(screen.getByRole('button', { name: '导出简历' }))
  expect(history.length).toBe(length + 1)
  expect(history.state.preserved).toBe('preview')
  expect(location.hash).toBe('#resume')
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  await screen.findByRole('heading', { name: '本次 Markdown 内容' })
  expect(history.length).toBe(length + 1)
  await act(async () => { history.back() })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(location.pathname + location.search + location.hash).toBe(previewUrl)
  await act(async () => { history.forward() })
  await screen.findByRole('dialog')
  await act(async () => { history.back() })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await act(async () => { history.back() })
  await waitFor(() => expect(location.pathname).toBe('/m/edit'))
})

it('restores a direct export URL and closes it without jumping to another page', async () => {
  history.replaceState({ preserved: true }, '', '/m/preview?id=sample&exportPreview=1')
  const length = history.length
  render(<BottomActionBar {...props()} />)
  await screen.findByRole('dialog')
  fireEvent.click(screen.getByRole('button', { name: '返回简历' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(location.pathname + location.search).toBe('/m/preview?id=sample')
  expect(history.length).toBe(length)
  expect(history.state.preserved).toBe(true)
})
