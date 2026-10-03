import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TemplateBrowser } from './template-browser'
import { templateCatalog } from '@/lib/templates/template-catalog'
import { PreviewSettingsSheet, DEFAULT_PREVIEW_THEME } from '@/app/m/preview/_components/preview-settings-sheet'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

afterEach(cleanup)
function setup() {
  const select = vi.fn()
  render(
    <TemplateBrowser
      templates={templateCatalog}
      currentId="simple"
      renderTemplate={(template) => (
        <button key={template.id} onClick={() => select(template.id)}>
          {template.name}
        </button>
      )}
    />,
  )
  return select
}
describe('template browser', () => {
  it('mobile preview filters without updating the theme or selecting until a card is clicked', () => {
    const select = vi.fn()
    const updateTheme = vi.fn()
    render(<PreviewSettingsSheet open tab="template" templateId="qingning"
      theme={{} as ThemeTokens} defaultPrimaryColor="#c6e1d2" locksPrimaryColor={false}
      onePageStatus="idle" onClose={vi.fn()} onConfirm={vi.fn()} confirming={false}
      onReset={vi.fn()} onTabChange={vi.fn()} onSelectTemplate={select} onUpdateTheme={updateTheme} />)
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
    fireEvent.change(screen.getByRole('combobox', { name: '模板分类' }), { target: { value: 'english' } })
    expect(screen.getByRole('status').textContent).toContain('1 款')
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
    fireEvent.click(screen.getByRole('checkbox', { name: '双栏' }))
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('模板分类')
    expect(screen.getByRole('button', { name: '筛选 · 2' })).toBeDefined()
    expect(screen.getByText('没有符合这些条件的模板')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '查看全部模板' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
  })
  it('hides reset on template tab; names its full scope on appearance tab', () => {
    const props = { open: true, templateId: 'qingning', theme: DEFAULT_PREVIEW_THEME, defaultPrimaryColor: '#c6e1d2', locksPrimaryColor: false,
      onePageStatus: 'idle' as const, onClose: vi.fn(), onConfirm: vi.fn(), confirming: false, onReset: vi.fn(), onTabChange: vi.fn(), onSelectTemplate: vi.fn(), onUpdateTheme: vi.fn() }
    const { rerender } = render(<PreviewSettingsSheet {...props} tab="template" />)
    expect(screen.queryByRole('button', { name: /重置/ })).toBeNull()
    expect(screen.getByText('已选模板：').textContent).toContain('青柠')
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(props.onClose).toHaveBeenCalledOnce()
    rerender(<PreviewSettingsSheet {...props} tab="appearance" />)
    fireEvent.click(screen.getByRole('button', { name: '重置当前模板全部样式' }))
    expect(props.onReset).toHaveBeenCalledOnce()
  })
  it('unmounts closed dialog and exposes recoverable save errors; locks controls while saving', () => {
    const props = { tab: 'template' as const, templateId: 'qingning', theme: DEFAULT_PREVIEW_THEME, defaultPrimaryColor: '#c6e1d2', locksPrimaryColor: false,
      onePageStatus: 'idle' as const, onClose: vi.fn(), onConfirm: vi.fn(), confirming: false, onReset: vi.fn(), onTabChange: vi.fn(), onSelectTemplate: vi.fn(), onUpdateTheme: vi.fn() }
    const { rerender } = render(<PreviewSettingsSheet {...props} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<PreviewSettingsSheet {...props} open saveError="保存失败，请重试或取消。" />)
    expect(screen.getByRole('alert').textContent).toContain('保存失败')
    fireEvent.click(screen.getByRole('button', { name: '应用并保存' }))
    expect(props.onConfirm).toHaveBeenCalledOnce()
    rerender(<PreviewSettingsSheet {...props} open confirming />)
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true')
    expect((screen.getByRole('button', { name: '保存中…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '取消并关闭' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('[inert]')).not.toBeNull()
  })
  it('filters without selecting a template; preserves current indication and permits explicit selection', () => {
    const select = setup()
    fireEvent.click(screen.getByRole('button', { name: /英文简历/ }))
    expect(screen.getByRole('status').textContent).toContain('1 款')
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
    fireEvent.click(screen.getByRole('checkbox', { name: '双栏' }))
    expect(screen.getByText('没有符合这些条件的模板')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '查看全部模板' }))
    expect(screen.getByRole('status').textContent).toContain(`${templateCatalog.length} 款`)
    expect(
      (screen.getByRole('checkbox', { name: '英文' }) as HTMLInputElement)
        .checked,
    ).toBe(false)
  })
})
