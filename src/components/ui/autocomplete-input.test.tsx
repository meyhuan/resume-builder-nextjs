import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutocompleteInput } from './autocomplete-input'
import { CITY_OPTIONS } from '@/data/dictionaries/cities'
import { SCHOOL_OPTIONS, MAJOR_OPTIONS } from '@/data/dictionaries/education'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'

const store = vi.hoisted(() => ({ readOnly: false, setResume: vi.fn() }))
vi.mock('@/state/store', () => ({ useAppStore: (selector: (s: typeof store) => unknown) => selector(store) }))
beforeEach(() => {
  store.setResume.mockReset()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView ??= () => {}
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function City({ initial = '', onKeyDown = vi.fn() }) {
  const [value, setValue] = useState(initial)
  return <><AutocompleteInput aria-label="城市" value={value} onValueChange={setValue} options={CITY_OPTIONS} onKeyDown={onKeyDown} /><button>下一个字段</button></>
}

describe('direct input suggestions', () => {
  it.each(['上', 'shanghai', 'SH', 'shang hai'])('finds Shanghai from %s without rewriting typed text', query => {
    render(<City />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: query } })
    expect(screen.getByRole('option', { name: '上海' })).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe(query)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('上海')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keeps ambiguous initials available and allows clearing/custom text', () => {
    render(<City initial="上海 / 杭州" />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    expect(input.value).toBe('上海 / 杭州')
    fireEvent.change(input, { target: { value: 'sz' } })
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['深圳', '苏州'])
    fireEvent.change(input, { target: { value: '景德镇' } })
    expect(screen.getByRole('status').textContent).toContain('保留当前输入')
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('景德镇')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
  })

  it('closes suggestions before forwarding Escape to an enclosing editor', () => {
    const keyDown = vi.fn()
    render(<City onKeyDown={keyDown} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'sh' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(keyDown).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(keyDown).toHaveBeenCalledOnce()
  })

  it('does not pick a candidate during Chinese composition', () => {
    const keyDown = vi.fn()
    render(<City onKeyDown={keyDown} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '北京' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.compositionStart(input)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(keyDown).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(input.value).toBe('北京')
  })

  it('bounds a large school list and identifies schools with location and aliases', () => {
    expect(SCHOOL_OPTIONS).toHaveLength(2952)
    const Harness = () => {
      const [value, setValue] = useState('')
      return <AutocompleteInput aria-label="学校" options={SCHOOL_OPTIONS} value={value} onValueChange={setValue} />
    }
    render(<Harness />)
    const input = screen.getByRole('combobox')
    act(() => input.focus())
    expect(screen.getAllByRole('option')).toHaveLength(80)
    fireEvent.change(input, { target: { value: '北大' } })
    expect(screen.getByRole('option', { name: '北京大学 北京市' })).toBeTruthy()
    fireEvent.change(input, { target: { value: '南大' } })
    expect(screen.getByRole('option', { name: '南京大学 南京市' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '南昌大学 南昌市' })).toBeTruthy()
    expect(MAJOR_OPTIONS.some(option => option.value === '计算机科学与技术')).toBe(true)
  })

  it.each(['mouse', 'keyboard'])('keeps an inline school selection editable and commits its full name on blur (%s)', method => {
    render(<EditableFieldWrapper blockId="education-1" fieldName="school" value="原学校" onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '原学校' }))
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '北大' } })
    if (method === 'mouse') {
      const option = screen.getByRole('option', { name: '北京大学 北京市' })
      fireEvent.pointerDown(option)
      fireEvent.click(option)
    } else {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    expect(input.value).toBe('北京大学')
    expect(document.activeElement).toBe(input)
    expect(store.setResume).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(store.setResume).toHaveBeenCalledOnce()
    const draft = { sections: [{ blocks: [{ id: 'education-1', type: 'education', school: '原学校', major: '原专业' }] }] }
    store.setResume.mock.calls[0][0](draft)
    expect(draft.sections[0].blocks[0]).toMatchObject({ school: '北京大学', major: '原专业' })
  })
})
