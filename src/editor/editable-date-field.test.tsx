import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditableDateField from './editable-date-field'

const store = vi.hoisted(() => ({
  readOnly: false,
  resume: { sections: [{ blocks: [{ id: 'date-1', type: 'experience', startDate: '2023.03', endDate: '2025.09' }] }] },
  setResume: vi.fn(),
}))
vi.mock('@/state/store', () => ({ useAppStore: (selector: (state: typeof store) => unknown) => selector(store) }))

beforeEach(() => {
  store.readOnly = false
  store.resume.sections[0].blocks = [{ id: 'date-1', type: 'experience', startDate: '2023.03', endDate: '2025.09' }]
  store.setResume.mockReset().mockImplementation((update: (draft: typeof store.resume) => void) => update(store.resume))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.hasPointerCapture ??= () => false
  HTMLElement.prototype.setPointerCapture ??= () => {}
  HTMLElement.prototype.releasePointerCapture ??= () => {}
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function open(field: 'startDate' | 'endDate' = 'startDate') {
  render(<EditableDateField blockId="date-1" fieldName={field} value={store.resume.sections[0].blocks[0][field]} />)
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${field === 'startDate' ? '开始' : '结束'}时间：`) }))
  const popup = await screen.findByRole('dialog', { name: '经历起止时间' })
  await within(popup).findByRole('button', { name: '3月' })
  return within(popup)
}
const saved = () => store.resume.sections[0].blocks[0]

describe('shared experience date range panel', () => {
  it('shows both values and saves a valid single-date change without an extra confirmation', async () => {
    const panel = await open()
    expect(panel.getByRole('tab', { name: '开始时间 2023.03' }).getAttribute('aria-selected')).toBe('true')
    expect(panel.getByRole('tab', { name: '结束时间 2025.09' })).toBeTruthy()
    fireEvent.click(panel.getByRole('button', { name: '4月' }))
    expect(saved()).toMatchObject({ startDate: '2023.04', endDate: '2025.09' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('switches to the other date in the same panel and returns its selected year', async () => {
    const panel = await open()
    fireEvent.click(panel.getByRole('tab', { name: '结束时间 2025.09' }))
    expect(panel.getByText('2025年 · 选择月份')).toBeTruthy()
    fireEvent.click(panel.getByRole('button', { name: '10月' }))
    expect(saved()).toMatchObject({ startDate: '2023.03', endDate: '2025.10' })
  })

  it('continues to the end date after filling an incomplete range', async () => {
    saved().endDate = ''
    const panel = await open()
    fireEvent.click(panel.getByRole('button', { name: '4月' }))
    expect(saved().startDate).toBe('2023.04')
    expect(panel.getByRole('tab', { name: '结束时间 未填写' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(panel.getByRole('button', { name: '至今' }))
    expect(saved().endDate).toBe('PRESENT')
  })

  it('keeps an incompatible start as a draft and does not write an inverted range', async () => {
    saved().endDate = '2023.05'
    const panel = await open()
    fireEvent.click(panel.getByRole('button', { name: '9月' }))
    expect(saved()).toMatchObject({ startDate: '2023.03', endDate: '2023.05' })
    expect(store.setResume).not.toHaveBeenCalled()
    expect(panel.getByRole('status').textContent).toContain('开始时间暂未保存')
    expect((panel.getByRole('button', { name: '8月' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('saves both dates in one update when the pending start gets a compatible end', async () => {
    saved().endDate = '2023.05'
    const panel = await open()
    fireEvent.click(panel.getByRole('button', { name: '9月' }))
    fireEvent.click(panel.getByRole('button', { name: /^选择年份/ }))
    fireEvent.click(panel.getByRole('button', { name: '2023年' }))
    fireEvent.click(panel.getByRole('button', { name: '10月' }))
    expect(saved()).toMatchObject({ startDate: '2023.09', endDate: '2023.10' })
    expect(store.setResume).toHaveBeenCalledOnce()
  })

  it('disables months earlier than the start while allowing the same month', async () => {
    saved().endDate = '2023.09'
    const panel = await open('endDate')
    expect((panel.getByRole('button', { name: '2月' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(panel.getByRole('button', { name: '3月' }))
    expect(saved().endDate).toBe('2023.03')
  })

  it('shows the present action only for the end date and clears only that date', async () => {
    const panel = await open()
    expect(panel.queryByRole('button', { name: '至今' })).toBeNull()
    fireEvent.click(panel.getByRole('tab', { name: '结束时间 2025.09' }))
    fireEvent.click(panel.getByRole('button', { name: '清除结束时间' }))
    expect(saved()).toMatchObject({ startDate: '2023.03', endDate: '' })
  })

  it('protects future starts from an incompatible present end', async () => {
    const futureYear = new Date().getFullYear() + 1
    saved().startDate = `${futureYear}.03`
    saved().endDate = `${futureYear}.09`
    const panel = await open('endDate')
    expect((panel.getByRole('button', { name: '至今' }) as HTMLButtonElement).disabled).toBe(true)
    expect(panel.getByRole('status').textContent).toContain('预计结束月份')
    fireEvent.click(panel.getByRole('button', { name: '10月' }))
    expect(saved().endDate).toBe(`${futureYear}.10`)
  })

  it('reads ISO months and preserves the untouched counterpart format', async () => {
    saved().startDate = '2023-03'
    saved().endDate = '2025-09'
    const panel = await open('endDate')
    expect(panel.getByText('2025年 · 选择月份')).toBeTruthy()
    fireEvent.click(panel.getByRole('button', { name: '10月' }))
    expect(saved()).toMatchObject({ startDate: '2023-03', endDate: '2025.10' })
  })

  it('does not normalize invalid imported values by opening or switching tabs', async () => {
    saved().startDate = '1999.13'
    const panel = await open()
    fireEvent.click(panel.getByRole('tab', { name: '结束时间 2025.09' }))
    expect(saved().startDate).toBe('1999.13')
    expect(store.setResume).not.toHaveBeenCalled()
  })

  it('supports arrow-key navigation between the date tabs', async () => {
    const panel = await open()
    const start = panel.getByRole('tab', { name: '开始时间 2023.03' })
    fireEvent.keyDown(start, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(panel.getByRole('tab', { name: '结束时间 2025.09' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(document.activeElement).toBe(start)
  })

  it('keeps read-only dates free of editing controls', () => {
    store.readOnly = true
    render(<EditableDateField blockId="date-1" fieldName="endDate" value="PRESENT" />)
    expect(screen.getByText('至今')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
