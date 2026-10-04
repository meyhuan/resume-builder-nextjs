import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BaseInfoModal from './base-info-modal'
import { ChineseMonthInput } from '@/components/ui/chinese-month-input'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.hasPointerCapture ??= () => false
  HTMLElement.prototype.setPointerCapture ??= () => {}
  HTMLElement.prototype.releasePointerCapture ??= () => {}
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function form(workStartTime = '') {
  const save = vi.fn(), close = vi.fn()
  render(<BaseInfoModal name="李小满" baseInfo={{ workStartTime, nation: '汉族' }} onSave={save} onClose={close} />)
  fireEvent.click(screen.getByRole('button', { name: '更多信息（选填）' }))
  return { trigger: screen.getByRole('button', { name: '开始工作时间' }), save, close }
}

describe('month selection for the first working date', () => {
  it('reads the existing dotted month and saves the chosen month in resume format', async () => {
    const { trigger, save } = form('2025.07')
    expect(trigger.textContent).toContain('2025.07')
    fireEvent.click(trigger)
    const popup = await screen.findByRole('dialog', { name: '开始工作时间' })
    fireEvent.click(within(popup).getByRole('button', { name: '8月' }))
    expect(trigger.textContent).toContain('2025.08')
    expect(screen.queryByRole('button', { name: '8月' })).toBeNull()
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ workStartTime: '2025.08', nation: '汉族' }), '李小满')
  })

  it('does not commit a year until a month is chosen, and modal cancellation discards the draft', async () => {
    const { trigger, save, close } = form('2025.07')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: '选择年份，当前2025年' }))
    fireEvent.click(await screen.findByRole('button', { name: '2024年' }))
    expect(trigger.textContent).toContain('2025.07')
    fireEvent.click(screen.getByRole('button', { name: '3月' }))
    expect(trigger.textContent).toContain('2024.03')
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(save).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  it('allows clearing an existing date', async () => {
    const { trigger, save } = form('2025.07')
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: '清除' }))
    expect(trigger.textContent).toContain('请选择年月')
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ workStartTime: undefined }), '李小满')
  })

  it('supports the current month shortcut without requiring another confirmation in the picker', async () => {
    const { trigger, save } = form()
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: '本月' }))
    const now = new Date()
    const expected = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(trigger.textContent).toContain(expected)
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ workStartTime: expected }), '李小满')
  })

  it.each(['2019年', '2019.13', '2019-09'])('keeps an untouched imported value (%s)', value => {
    const { save } = form(value)
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ workStartTime: value }), '李小满')
  })

  it('keeps the ISO output and Chinese display used by the application profile', async () => {
    function ProfileMonth() {
      const [value, setValue] = useState('2019-09')
      return <><ChineseMonthInput id="profile-month" value={value} onValueChange={setValue} /><output data-testid="stored-month">{value}</output></>
    }
    render(<ProfileMonth />)
    fireEvent.click(screen.getByRole('button', { name: '2019年09月，点击选择年月' }))
    fireEvent.click(await screen.findByRole('button', { name: '10月' }))
    expect(screen.getByTestId('stored-month').textContent).toBe('2019-10')
    expect(screen.getByRole('button', { name: '2019年10月，点击选择年月' })).toBeTruthy()
  })
})
