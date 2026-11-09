import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ExportPreviewDialog from '@/components/export-preview-dialog'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
const state = vi.hoisted(() => ({ upgradeContext: 'docx-export', quota: { pdfExport: { isVip: false, remaining: 0 } }, refreshQuota: vi.fn(), updateVipStatus: vi.fn() }))
vi.mock('@/store/use-vip-store', () => ({ useVipStore: (selector: (s: typeof state) => unknown) => selector(state) }))
vi.mock('@/store/use-auth-store', () => ({ useAuthStore: () => ({ updateVipStatus: state.updateVipStatus, token: 'mock-token' }) }))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('keeps Word action clickable for a non-member with no PDF balance', () => {
  const word = vi.fn()
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" onConfirmExport={vi.fn()} onExportDocx={word} isVip={false} remainingQuota={0} />)
  fireEvent.click(screen.getByRole('button', { name: 'Word' }))
  expect(word).toHaveBeenCalledOnce()
})
it('renders the Word-specific membership prompt and benefits', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { userId: 1, isVip: false, plans: [] } }) }))
  render(<VipUpgradeDialog open onOpenChange={vi.fn()} />)
  expect(screen.getByRole('heading', { name: '导出可编辑的 Word 简历' })).toBeDefined()
  expect(screen.getByText(/Word 与 PDF 共用导出次数/)).toBeDefined()
  expect(await screen.findByText('Word 导出（指定模板）')).toBeDefined()
})

it('blocks duplicate format actions while exporting and labels the PDF preview explicitly', () => {
  const word = vi.fn()
  render(<ExportPreviewDialog open onOpenChange={vi.fn()} pdfUrl="" onConfirmExport={vi.fn()} onExportDocx={word} onExportPng={vi.fn()} onExportMarkdown={vi.fn()} isVip isConfirming />)
  expect(screen.getByRole('heading', { name: 'PDF 预览' })).toBeDefined()
  expect(screen.getByText(/排版可能与 PDF 预览不同/)).toBeDefined()
  for (const name of ['Word', 'PNG', 'Markdown', '确认导出 PDF']) {
    expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true)
  }
  fireEvent.click(screen.getByRole('button', { name: 'Word' }))
  expect(word).not.toHaveBeenCalled()
})
