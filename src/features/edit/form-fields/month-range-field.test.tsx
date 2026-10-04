import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonthPickerField } from './month-picker-field'
import { MonthRangeField } from './month-range-field'
import { monthRangeError, parseResumeMonth } from '@/lib/resume-month'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('mobile month range', () => {
  it.each(['2025.01', '2025-01', '2025.1'])('recognizes the saved date %s instead of resetting it to today', value => {
    const change = vi.fn()
    render(<MonthPickerField label="工作开始月份" value={value} onValueChange={change} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /工作开始月份 2025年1月/ }))
    expect(screen.getByRole('dialog', { name: '工作开始月份' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('已选择 2025年1月')
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(change).toHaveBeenCalledWith(value.includes('-') ? '2025-01' : '2025.01')
  })
  it('cancels without committing and removes the closed sheet from focus navigation', async () => {
    const change = vi.fn()
    render(<MonthPickerField label="开始时间" value="2024.06" onValueChange={change} />)
    const trigger = screen.getByRole('button', { name: /开始时间 2024年6月/ })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(change).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
  })
  it('prevents an invalid end month from being confirmed', () => {
    render(<MonthPickerField label="结束时间" value="2024.01" minValue="2024.06" onValueChange={vi.fn()} allowPresent />)
    fireEvent.click(screen.getByRole('button', { name: /结束时间 2024年1月/ }))
    expect(screen.getByRole('status').textContent).toBe('结束月份不能早于开始月份')
    expect((screen.getByRole('button', { name: '确定' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('does not offer present for a future start and does not overwrite it on cancel', () => {
    const future = `${new Date().getFullYear() + 2}.01`
    const change = vi.fn()
    render(<MonthPickerField label="结束时间" value="" minValue={future} onValueChange={change} allowPresent />)
    fireEvent.click(screen.getByRole('button', { name: /结束时间 选择月份/ }))
    expect((screen.getByRole('button', { name: '至今' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(change).not.toHaveBeenCalled()
  })
  it('reports an imported invalid range inline and clears the error after correction', async () => {
    function Form() {
      const [end, setEnd] = useState('2024-01')
      return <MonthRangeField start="2024.06" end={end} onStartChange={vi.fn()} onEndChange={setEnd} />
    }
    render(<Form />)
    expect(screen.getByRole('alert').textContent).toBe('结束月份不能早于开始月份')
    fireEvent.click(screen.getByRole('button', { name: /结束时间 2024年1月/ }))
    fireEvent.click(screen.getByRole('button', { name: '至今' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
  it('rejects invalid month numbers and compares mixed separators chronologically', () => {
    expect(parseResumeMonth('2025.13')).toBeNull()
    expect(monthRangeError('2024.06', '2024-06')).toBeNull()
    expect(monthRangeError('2024.06', '2024-05')).toBe('结束月份不能早于开始月份')
    expect(monthRangeError('2030.01', '至今', new Date(2026, 9, 4))).toBe('未来的开始月份不能选择“至今”')
    expect(monthRangeError('2024.06', '')).toBeNull()
  })
})
