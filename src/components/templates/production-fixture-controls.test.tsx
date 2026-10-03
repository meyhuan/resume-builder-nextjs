import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RightSidebar from '@/ui/right-sidebar'
import SectionHeader from '@/components/sections/section-header'
import { RESUME_SCENARIOS } from '@/dev/resume-scenarios'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

const state = vi.hoisted(() => ({
  readOnly: false,
  resume: {},
  getDefaultThemeForTemplate: () => ({ primaryColor: '#7c3aed' }),
  resetThemeForTemplate: vi.fn(),
  loadScenarioData: vi.fn(),
}))
vi.mock('@/state/store', () => ({ useAppStore: Object.assign((select: (value: typeof state) => unknown) => select(state), { getState: () => state }) }))
vi.mock('@/ui/theme-panel', () => ({ default: () => null }))
vi.mock('@/ui/section-manager', () => ({ default: () => null }))
vi.mock('@/components/portfolio/portfolio-manager', () => ({ default: () => null }))
vi.mock('@/components/templates/template-browser', () => ({ TemplateBrowser: () => null }))

const theme: ThemeTokens = { primaryColor: '#7c3aed', textColor: '#171717', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, spacingScale: 1, pagePaddingVertical: 16, pagePaddingHorizontal: 16 }
const props = { embedded: true, activePanel: 'layout' as const, onClose: vi.fn(), theme, tpl: 'simple', templates: [], onTplChange: vi.fn(), onThemePatch: vi.fn() }
beforeEach(() => { state.readOnly = false; vi.clearAllMocks(); vi.stubEnv('NODE_ENV', 'production') })
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('production fixture and section QA entry points', () => {
  it('does not expose data replacement in the ordinary production editor', () => {
    render(<RightSidebar {...props} />)
    expect(screen.queryByText('模板测试数据')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: '加载场景数据' })).toBeNull()
  })
  it('lets the isolated QA route load the selected scenario through the real sidebar handler', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<RightSidebar {...props} enableScenarioData />)
    const scenario = RESUME_SCENARIOS.find((item) => item.id === 'long-content')!
    expect(scenario).toBeDefined()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: scenario.id } })
    fireEvent.click(screen.getByRole('button', { name: '加载场景数据' }))
    expect(state.loadScenarioData).toHaveBeenCalledWith(scenario.resume)
    expect(window.confirm).toHaveBeenCalledOnce()
  })
  it('keeps the current data when the fixture overwrite is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<RightSidebar {...props} enableScenarioData />)
    fireEvent.click(screen.getByRole('button', { name: '加载场景数据' }))
    expect(state.loadScenarioData).not.toHaveBeenCalled()
  })
  it.each(['default', 'ribbon'] as const)('marks the actual %s hover target and removes actions in read-only mode', (layout) => {
    const onAdd = vi.fn()
    const onDelete = vi.fn()
    const { container, rerender } = render(<SectionHeader sectionId="section-1" title="教育经历" themeColor="#333333" layout={layout} onAdd={onAdd} onDelete={onDelete} />)
    const target = container.querySelector('[data-template-section-header="true"]')!
    expect(target).not.toBeNull()
    fireEvent.mouseEnter(target)
    fireEvent.click(screen.getByTitle('添加'))
    fireEvent.click(screen.getByTitle('删除'))
    expect(onAdd).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
    state.readOnly = true
    rerender(<SectionHeader sectionId="section-1" title="教育经历" themeColor="#333333" layout={layout} onAdd={onAdd} onDelete={onDelete} />)
    expect(container.querySelector('[data-template-section-header="true"]')).toBeNull()
    expect(screen.queryByTitle('删除')).toBeNull()
  })
})
