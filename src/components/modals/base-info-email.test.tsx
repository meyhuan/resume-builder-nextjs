import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BaseInfoModal from './base-info-modal'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.hasPointerCapture ??= () => false
  HTMLElement.prototype.setPointerCapture ??= () => {}
  HTMLElement.prototype.releasePointerCapture ??= () => {}
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function form(email = '') {
  const save = vi.fn(), close = vi.fn()
  render(<BaseInfoModal name="李小满" baseInfo={{ email }} onSave={save} onClose={close} />)
  return { input: screen.getByRole('combobox', { name: '邮箱' }), save, close }
}

describe('email completion in base info', () => {
  it('offers common complete addresses and saves the chosen address', async () => {
    const { input, save } = form()
    fireEvent.change(input, { target: { value: 'xiaoman' } })
    const options = await screen.findAllByRole('option')
    expect(options.slice(0, 3).map(el => el.textContent)).toEqual(['xiaoman@qq.com', 'xiaoman@163.com', 'xiaoman@126.com'])
    fireEvent.click(screen.getByRole('option', { name: 'xiaoman@163.com' }))
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ email: 'xiaoman@163.com' }), '李小满')
  })

  it('filters domain prefixes, preserves the local part, and confirms with arrow/Enter', async () => {
    const { input, save } = form()
    fireEvent.change(input, { target: { value: 'Xiao.Man+cv@o' } })
    expect((await screen.findAllByRole('option')).map(el => el.textContent)).toEqual(['Xiao.Man+cv@outlook.com'])
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ email: 'Xiao.Man+cv@outlook.com' }), '李小满')
  })

  it.each(['', 'li@qq.com', 'li@company.cn', 'li@@qq.com'])('does not overwrite or suggest an unrelated address for %s', email => {
    const { input, save } = form(email)
    fireEvent.focus(input)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ email: email || undefined }), '李小满')
  })

  it('Escape and Tab dismiss suggestions without selecting a domain or closing the dialog', async () => {
    const { input, close, save } = form()
    fireEvent.change(input, { target: { value: 'li' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(close).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'li@q' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(save).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  it('keeps email suggestions from intercepting IME confirmation', async () => {
    const { input } = form()
    fireEvent.change(input, { target: { value: 'li@q' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect((input as HTMLInputElement).value).toBe('li@q')
    expect(screen.queryByRole('listbox')).toBeTruthy()
    fireEvent.compositionStart(input)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.compositionEnd(input)
    await screen.findByRole('listbox')
    expect((input as HTMLInputElement).value).toBe('li@q')
  })
})
