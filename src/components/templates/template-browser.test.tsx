import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TemplateBrowser } from './template-browser'
import { templateCatalog } from '@/lib/templates/template-catalog'
import { filterTemplates } from '@/lib/templates/template-taxonomy'
import { PreviewSettingsSheet, DEFAULT_PREVIEW_THEME } from '@/app/m/preview/_components/preview-settings-sheet'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  class Observer {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }
  vi.stubGlobal('IntersectionObserver', Observer)
  // JSDOM has no layout; provide the sheet's measured bounds while keeping
  // React Modal Sheet and its animation/snap logic real.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('react-modal-sheet-container') ? 633 : 44
    return { x: 0, y: 0, top: 0, left: 0, width: 375, height, right: 375, bottom: height, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('react-modal-sheet-container') ? 633 : 44
  })
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element): void {
      if (target.classList.contains('react-modal-sheet-container')) {
        queueMicrotask(() => {
          if (target.isConnected) this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
        })
      }
    }
    disconnect(): void {}
    unobserve(): void {}
  })
})
const englishCount = filterTemplates(templateCatalog, { languages: ['en'] }).length
function setup() {
  const select = vi.fn()
  render(
    <TemplateBrowser
      templates={templateCatalog}
      currentId="simple"
      renderTemplate={(template, wordBadge) => (
        <button key={template.id} onClick={() => select(template.id)}>
          {template.name}{wordBadge}
        </button>
      )}
    />,
  )
  return select
}
describe('template browser', () => {
  it('filters to the three Word templates without changing the resume', () => {
    const select = setup()
    fireEvent.click(screen.getByRole('button', { name: '支持 Word' }))
    expect(screen.getByRole('status').textContent).toContain('3 款')
    expect(screen.getAllByText('支持 Word', { selector: 'span' })).toHaveLength(3)
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '清除筛选' }))
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
  })
  it('mobile preview filters without updating the theme or selecting until a card is clicked', async () => {
    const select = vi.fn()
    const updateTheme = vi.fn()
    render(<PreviewSettingsSheet open tab="template" templateId="qingning"
      theme={{} as ThemeTokens} defaultPrimaryColor="#c6e1d2" locksPrimaryColor={false}
      onePageStatus="idle" onClose={vi.fn()} onConfirm={vi.fn()} confirming={false}
      onReset={vi.fn()} onTabChange={vi.fn()} onSelectTemplate={select} onUpdateTheme={updateTheme} />)
    await screen.findByRole('dialog')
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
    fireEvent.change(screen.getByRole('combobox', { name: '模板分类' }), { target: { value: 'english' } })
    expect(screen.getByRole('status').textContent).toContain(`${englishCount} 款`)
    expect(select).not.toHaveBeenCalled()
    expect(updateTheme).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /墨序/ }))
    expect(select).toHaveBeenCalledExactlyOnceWith('moxu')
  })
  it('keeps mobile filters collapsed, exposes custom conditions and clears them', () => {
    render(<TemplateBrowser templates={templateCatalog} compact renderTemplate={(item) => <div key={item.id}>{item.name}</div>} />)
    const toggle = screen.getByRole('button', { name: '筛选' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('checkbox', { name: '英文' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '教育教学' }))
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('模板分类')
    expect(screen.getByRole('button', { name: '筛选 · 2' })).toBeDefined()
    expect(screen.getByText('没有符合这些条件的模板')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '查看全部模板' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
  })
  it('hides reset on template tab; names its full scope on appearance tab', async () => {
    const props = { open: true, templateId: 'qingning', theme: DEFAULT_PREVIEW_THEME, defaultPrimaryColor: '#c6e1d2', locksPrimaryColor: false,
      onePageStatus: 'idle' as const, onClose: vi.fn(), onConfirm: vi.fn(), confirming: false, onReset: vi.fn(), onTabChange: vi.fn(), onSelectTemplate: vi.fn(), onUpdateTheme: vi.fn() }
    const { rerender } = render(<PreviewSettingsSheet {...props} tab="template" />)
    await screen.findByRole('dialog')
    expect(screen.queryByRole('button', { name: /重置/ })).toBeNull()
    expect(screen.getByText('已选模板：').textContent).toContain('青柠')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(props.onConfirm).toHaveBeenCalledOnce()
    rerender(<PreviewSettingsSheet {...props} tab="appearance" />)
    fireEvent.click(screen.getByRole('button', { name: '重置当前模板全部样式' }))
    expect(props.onReset).toHaveBeenCalledOnce()
  })
  it('unmounts closed dialog and exposes recoverable save errors; locks controls while saving', async () => {
    const props = { tab: 'template' as const, templateId: 'qingning', theme: DEFAULT_PREVIEW_THEME, defaultPrimaryColor: '#c6e1d2', locksPrimaryColor: false,
      onePageStatus: 'idle' as const, onClose: vi.fn(), onConfirm: vi.fn(), confirming: false, onReset: vi.fn(), onTabChange: vi.fn(), onSelectTemplate: vi.fn(), onUpdateTheme: vi.fn() }
    const { rerender } = render(<PreviewSettingsSheet {...props} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<PreviewSettingsSheet {...props} open saveError="保存失败，请重试或取消。" />)
    await screen.findByRole('dialog')
    expect(screen.getByRole('alert').textContent).toContain('保存失败')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(props.onConfirm).toHaveBeenCalledOnce()
    rerender(<PreviewSettingsSheet {...props} open confirming />)
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true')
    expect((screen.getByRole('button', { name: '保存中…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '展开调整面板' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('[inert]')).not.toBeNull()
  }, 15000)
  it('filters without selecting a template; preserves current indication and permits explicit selection', () => {
    const select = setup()
    fireEvent.click(screen.getByRole('button', { name: /英文简历/ }))
    expect(screen.getByRole('status').textContent).toContain(`${englishCount} 款`)
    expect(screen.getByText(/正在使用「简约」/)).toBeDefined()
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '墨序' }))
    expect(select).toHaveBeenCalledExactlyOnceWith('moxu')
    fireEvent.click(screen.getByRole('button', { name: '清除筛选' }))
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
  })
  it('supports combined conditions, empty results and recovery', () => {
    setup()
    fireEvent.click(screen.getByText('更多筛选'))
    fireEvent.click(screen.getByRole('checkbox', { name: '英文' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '教育教学' }))
    expect(screen.getByText('没有符合这些条件的模板')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '查看全部模板' }))
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
    expect(
      (screen.getByRole('checkbox', { name: '英文' }) as HTMLInputElement)
        .checked,
    ).toBe(false)
  })
})


it('resizes the nonmodal panel and keeps template filtering available', async () => {
  render(<PreviewSettingsSheet open tab="template" templateId="simple" theme={DEFAULT_PREVIEW_THEME} defaultPrimaryColor="#111827" locksPrimaryColor={false}
    onePageStatus="idle" onClose={vi.fn()} onConfirm={vi.fn()} confirming={false} onReset={vi.fn()} onTabChange={vi.fn()} onSelectTemplate={vi.fn()} onUpdateTheme={vi.fn()} />)
  await screen.findByRole('dialog')
  expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false')
  expect(screen.getByRole('slider', { name: '调整面板高度' }).getAttribute('aria-valuenow')).toBe('50')
  fireEvent.click(screen.getByRole('button', { name: '展开调整面板' }))
  await waitFor(() => expect(screen.getByRole('slider', { name: '调整面板高度' }).getAttribute('aria-valuenow')).toBe('75'))
  fireEvent.click(screen.getByRole('button', { name: '收起调整面板' }))
  const handle = screen.getByRole('slider', { name: '调整面板高度' })
  await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('30'))
  fireEvent.keyDown(handle, { key: 'ArrowUp' })
  await waitFor(() => expect(handle.getAttribute('aria-valuenow')).toBe('50'))
  fireEvent.change(screen.getByRole('combobox', { name: '模板分类' }), { target: { value: 'english' } })
  expect((screen.getByRole('combobox', { name: '模板分类' }) as HTMLSelectElement).value).toBe('english')
})


it('shows every layout slider without category switching', async () => {
  render(<PreviewSettingsSheet open tab="layout" templateId="simple" theme={DEFAULT_PREVIEW_THEME} defaultPrimaryColor="#111827" locksPrimaryColor={false}
    onePageStatus="idle" onClose={vi.fn()} onConfirm={vi.fn()} confirming={false} onReset={vi.fn()} onTabChange={vi.fn()} onSelectTemplate={vi.fn()} onUpdateTheme={vi.fn()} />)
  await screen.findByRole('dialog')
  expect(screen.getAllByRole('slider')).toHaveLength(6)
  expect(screen.queryByRole('button', { name: '字号' })).toBeNull()
  expect(screen.getByText('左右边距')).toBeTruthy()
})
