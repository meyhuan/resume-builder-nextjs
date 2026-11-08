import { afterEach, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import ExportPreviewDialog from '@/components/export-preview-dialog'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import type { ExportProgressListener } from '@/lib/export-progress'
const asset: ExportPreviewAsset = {
  id: 'word-preview',
  type: 'docx',
  fileName: '简历',
  confirmed: false,
  downloadUrl: '/word',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  previewImages: ['/word-page.jpg'],
}
const state = vi.hoisted(() => ({
  upgradeContext: 'docx-export',
  quota: { pdfExport: { isVip: false, remaining: 0 } },
  refreshQuota: vi.fn(),
  updateVipStatus: vi.fn(),
}))
vi.mock('@/store/use-vip-store', () => ({
  useVipStore: (selector: (s: typeof state) => unknown) => selector(state),
}))
vi.mock('@/store/use-auth-store', () => ({
  useAuthStore: () => ({
    updateVipStatus: state.updateVipStatus,
    token: 'mock-token',
  }),
}))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.mocked(toast.info).mockClear()
})
it('downloads a generated PDF without an iframe load event', () => {
  const confirm = vi.fn()
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="blob:ready-pdf"
    pdfPageCount={1} isVip onConfirmExport={confirm} />)
  expect(screen.getByTitle('PDF 预览')).toBeTruthy()
  // Tablet webviews may never emit load for the native PDF viewer.
  const button = screen.getByRole('button', { name: '确认下载 PDF' }) as HTMLButtonElement
  expect(button.disabled).toBe(false)
  fireEvent.click(button)
  expect(confirm).toHaveBeenCalledOnce()
})

it('keeps PDF download disabled until a file exists and while confirming', () => {
  const props = { open: true, onOpenChange: vi.fn(), onConfirmExport: vi.fn(), isVip: true }
  const view = render(<ExportPreviewDialog {...props} pdfUrl="" isGenerating />)
  expect((screen.getByRole('button', { name: '确认下载 PDF' }) as HTMLButtonElement).disabled).toBe(true)
  view.rerender(<ExportPreviewDialog {...props} pdfUrl="blob:ready-pdf" isConfirming />)
  expect((screen.getByRole('button', { name: '正在导出…' }) as HTMLButtonElement).disabled).toBe(true)
  expect(props.onConfirmExport).not.toHaveBeenCalled()
})

it('shows server Word progress before the preview is ready and keeps download disabled', async () => {
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" isGenerating={false}
    onConfirmExport={vi.fn()} onExportDocx={vi.fn()}
    onPreviewDocx={async (progress?: ExportProgressListener) => {
      progress?.('converting')
      return new Promise<ExportPreviewAsset>(() => {})
    }} />)
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  await waitFor(() => expect(screen.getByText('正在排版 Word 文档…')).toBeTruthy())
  expect((screen.getByRole('button', {name:'确认下载 Word'}) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText(/预览不扣除导出次数/)).toBeTruthy()
})
it('offers Word before PDF is ready, and routes depleted quota to the Word offer', () => {
  const word = vi.fn(),
    upgrade = vi.fn()
  render(
    <ExportPreviewDialog
      open
      onOpenChange={vi.fn()}
      pdfUrl=""
      isGenerating
      onConfirmExport={vi.fn()}
      onExportDocx={word}
      onUpgradeClick={upgrade}
      isVip={false}
      remainingQuota={0}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  fireEvent.click(screen.getByRole('button', { name: '开通会员，导出 Word' }))
  expect(upgrade).toHaveBeenCalledWith('docx')
  expect(word).not.toHaveBeenCalled()
})
it('renders the Word-specific membership prompt and benefits', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { userId: 1, isVip: false, plans: [] } }),
      }),
  )
  render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
  expect(
    screen.getByRole('heading', { name: '导出可编辑的 Word 简历' }),
  ).toBeDefined()
  expect(screen.getByText(/Word 与 PDF 共用导出次数/)).toBeDefined()
  expect(await screen.findByText('Word 导出（指定模板）')).toBeDefined()
})

it.each([['PDF', 'pdf'], ['Word', 'docx'], ['图片', 'image']] as const)(
  'routes exhausted %s to membership without calling an export action', (label, format) => {
    const upgrade = vi.fn(), download = vi.fn(), markdown = vi.fn()
    render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" remainingQuota={0} isVip={false}
      onConfirmExport={download} onExportPng={download} onExportDocx={download} onExportMarkdown={markdown} onUpgradeClick={upgrade} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + label) }))
    fireEvent.click(screen.getByRole('button', { name: '开通会员，导出 ' + label }))
    expect(upgrade).toHaveBeenCalledWith(format)
    expect(download).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认下载 Markdown' }))
    expect(markdown).toHaveBeenCalledTimes(1)
    expect(upgrade).toHaveBeenCalledTimes(1)
  },
)

it('blocks duplicate actions while exporting', () => {
  render(
    <ExportPreviewDialog
      open
      onOpenChange={vi.fn()}
      pdfUrl=""
      onConfirmExport={vi.fn()}
      onExportDocx={vi.fn()}
      isVip
      isConfirming
    />,
  )
  expect(screen.getByRole('heading', { name: '导出简历' })).toBeDefined()
  for (const name of [/^Word/, /^PDF/, /^图片/, /^Markdown/, '正在导出…']) {
    expect(
      (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
    ).toBe(true)
  }
})

it('greys unsupported Word and only explains where to change the template', () => {
  const preview = vi.fn()
  const confirm = vi.fn()
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" onConfirmExport={confirm} onPreviewDocx={preview} />)
  const word = screen.getByRole('button', { name: /^Word/ })
  expect(word.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(word)
  expect(word.getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByRole('button', { name: /^PDF/ }).getAttribute('aria-pressed')).toBe('true')
  expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('请返回模板列表，筛选'), expect.objectContaining({ id: 'word-export-unsupported' }))
  expect(screen.queryByText(/请返回模板列表，筛选/)).toBeNull()
  expect(screen.queryByRole('button', { name: /更换模板，继续导出/ })).toBeNull()
  expect(preview).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  expect(screen.queryByText(/请返回模板列表，筛选/)).toBeNull()
})

it('requires the actual Word preview to load before confirming the same file, and allows free Markdown', async () => {
  const word = vi.fn(),
    markdown = vi.fn()
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    pdfUrl: '',
    onConfirmExport: vi.fn(),
    onExportDocx: word,
    onPreviewDocx: vi.fn().mockResolvedValue(asset),
    onExportMarkdown: markdown,
    markdownContent: '# 简历',
  }
  const view = render(<ExportPreviewDialog {...props} isVip />)
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  expect(
    (screen.getByRole('button', { name: '确认下载 Word' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  fireEvent.load(await screen.findByAltText('Word 预览第 1 页'))
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: '确认下载 Word',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: '确认下载 Word' }))
  expect(word).toHaveBeenCalledWith(asset)
  view.rerender(
    <ExportPreviewDialog {...props} isVip={false} remainingQuota={0} confirmedWordIds={new Set([asset.id])} />,
  )
  fireEvent.click(screen.getByRole('button', { name: '确认下载 Word' }))
  expect(word).toHaveBeenCalledTimes(2)
  expect(props.onPreviewDocx).toHaveBeenCalledTimes(1)
  view.rerender(
    <ExportPreviewDialog {...props} isVip={false} remainingQuota={0} />,
  )
  fireEvent.click(screen.getByRole('button', { name: /^Markdown/ }))
  expect(screen.getByText('# 简历')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '确认下载 Markdown' }))
  expect(markdown).toHaveBeenCalledOnce()
})

it('blocks failed Word previews and permits retry without downloading', async () => {
  const prepare = vi
    .fn()
    .mockRejectedValueOnce(new Error('转换失败'))
    .mockResolvedValue(asset)
  const download = vi.fn()
  render(
    <ExportPreviewDialog
      open
      onOpenChange={vi.fn()}
      pdfUrl=""
      onConfirmExport={vi.fn()}
      onExportDocx={download}
      onPreviewDocx={prepare}
      isVip
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /^Word/ }))
  expect(await screen.findByText('转换失败')).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: '确认下载 Word' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '重新生成预览' }))
  fireEvent.error(await screen.findByAltText('Word 预览第 1 页'))
  expect(await screen.findByText('预览加载失败，请重试')).toBeTruthy()
  expect(download).not.toHaveBeenCalled()
})

it('downloads the exact PNG preview only after it loads', async () => {
  const download = vi.fn(),
    prepare = vi.fn().mockResolvedValue('data:image/png;base64,cHJldmlldw==')
  render(
    <ExportPreviewDialog
      open
      onOpenChange={vi.fn()}
      pdfUrl=""
      onConfirmExport={vi.fn()}
      onExportPng={download}
      onPreviewImage={prepare}
      isVip
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /^图片/ }))
  expect(
    (screen.getByRole('button', { name: '确认下载 图片' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  const preview = await screen.findByAltText('实际 PNG 导出预览')
  expect(screen.getByRole('status', { name: '正在加载图片预览' })).toBeTruthy()
  fireEvent.load(preview)
  expect(screen.queryByRole('status', { name: '正在加载图片预览' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '确认下载 图片' }))
  expect(download).toHaveBeenCalledWith('data:image/png;base64,cHJldmlldw==')
  expect(prepare).toHaveBeenCalledOnce()
})
