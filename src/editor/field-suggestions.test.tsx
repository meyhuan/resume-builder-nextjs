import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditableFieldWrapper from './editable-field-wrapper'
import ExperienceBlockView from '@/components/blocks/experience-block-view'
import ProjectBlockView from '@/components/blocks/project-block-view'
import CampusBlockView from '@/components/blocks/campus-block-view'
import JobIntentionModal from '@/components/modals/job-intention-modal'
import BaseInfoModal from '@/components/modals/base-info-modal'
import { AutocompleteField } from '@/features/edit/form-fields/autocomplete-field'
import { POSITION_SUGGESTIONS, PROJECT_ROLE_SUGGESTIONS } from '@/data/dictionaries/editor-suggestions'

const store = vi.hoisted(() => ({
  readOnly: false,
  resume: { sections: [] as { blocks: { id: string; type: string }[] }[] },
  setResume: vi.fn(),
}))
vi.mock('@/state/store', () => ({ useAppStore: (selector: (s: typeof store) => unknown) => selector(store) }))
vi.mock('@/editor/inline-editor', () => ({ default: () => null }))
vi.mock('@/editor/editable-date-field', () => ({ default: () => null }))

beforeEach(() => {
  store.setResume.mockReset()
  store.resume.sections = []
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('field-specific suggestions', () => {
  it('completes the intended job without replacing typed text on Enter and saves only the title', () => {
    const save = vi.fn()
    render(<JobIntentionModal jobIntention={{ position: '高级产品顾问 / 实习' }} onSave={save} onClose={() => {}} />)
    const input = screen.getByRole('combobox', { name: '意向岗位' }) as HTMLInputElement
    expect(input.value).toBe('高级产品顾问 / 实习')
    fireEvent.change(input, { target: { value: '产品' } })
    expect(screen.getByRole('option', { name: '产品助理 产品' })).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('产品')
    fireEvent.click(screen.getByRole('option', { name: '产品助理 产品' }))
    expect(document.activeElement).toBe(input)
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ position: '产品助理' }))
  })

  it('keeps an ambiguous job abbreviation explicit and allows custom, cancelled and blank titles', () => {
    const save = vi.fn(), close = vi.fn()
    render(<JobIntentionModal jobIntention={{ position: '原岗位' }} onSave={save} onClose={close} />)
    const input = screen.getByLabelText('意向岗位') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'PM' } })
    expect(screen.getAllByRole('option').slice(0, 2).map(option => option.getAttribute('aria-label'))).toEqual(['产品经理 产品', '项目经理 项目管理'])
    fireEvent.change(input, { target: { value: '医疗器械产品经理（实习）' } })
    fireEvent.click(screen.getByRole('option', { name: '使用“医疗器械产品经理（实习）” 自定义填写' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(save).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ position: undefined }))
  })

  it('supports the header job and political status while preserving an imported specific status', () => {
    const save = vi.fn()
    render(<BaseInfoModal name="李小满" baseInfo={{ title: '原岗位', politicalStatus: '民盟盟员' }} onSave={save} onClose={() => {}} />)
    const title = screen.getByLabelText('意向岗位')
    fireEvent.change(title, { target: { value: '界面设计' } })
    fireEvent.click(screen.getByRole('option', { name: 'UI 设计师 设计' }))
    fireEvent.click(screen.getByRole('button', { name: '更多信息（选填）' }))
    const status = screen.getByLabelText('政治面貌') as HTMLInputElement
    expect(status.value).toBe('民盟盟员')
    fireEvent.change(status, { target: { value: '党员' } })
    fireEvent.keyDown(status, { key: 'Enter', isComposing: true })
    expect(status.value).toBe('党员')
    fireEvent.click(screen.getByRole('option', { name: '中共党员' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: 'UI 设计师', politicalStatus: '中共党员' }), '李小满')
  })

  it.each([
    ['experience', 'position', '产品', '产品助理 产品', '产品助理'],
    ['experience', 'industry', '人工', '人工智能', '人工智能'],
    ['project', 'role', '前端', '前端负责人', '前端负责人'],
    ['campus', 'position', '部长', '部长', '部长'],
    ['education', 'degree', '硕', '硕士', '硕士'],
  ])('uses the right context and commits a selected %s/%s on blur', (type, field, query, label, saved) => {
    store.resume.sections = [{ blocks: [{ id: 'block-1', type }] }]
    render(<EditableFieldWrapper blockId="block-1" fieldName={field} value="原值" onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '原值' }))
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: query } })
    if (type === 'campus') expect(screen.queryByRole('option', { name: /产品经理/ })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: label }))
    expect(input.value).toBe(saved)
    expect(store.setResume).not.toHaveBeenCalled()
    fireEvent.blur(input)
    const draft = { sections: [{ blocks: [{ id: 'block-1', type, [field]: '原值', other: '保留内容' }] }] }
    store.setResume.mock.calls[0][0](draft)
    expect(draft.sections[0].blocks[0]).toMatchObject({ [field]: saved, other: '保留内容' })
    expect(store.setResume).toHaveBeenCalledOnce()
  })

  it.each(['company', 'name', 'organization'])('keeps personal %s content free of unrelated suggestions', field => {
    render(<EditableFieldWrapper blockId="block-1" fieldName={field} value="原值" onUpdate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '原值' }))
    expect(screen.queryByRole('combobox')).toBeNull()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '自定义内容' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(store.setResume).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByRole('button', { name: '原值' })).toBeTruthy()
  })

  it.each(['experience', 'project', 'campus'])('also supports the legacy %s block editing path', type => {
    if (type === 'experience') render(<ExperienceBlockView block={{ id: 'block-1', type, company: '公司', position: '原职位', industry: '行业', startDate: '', endDate: '', contentHtml: '' }} />)
    else if (type === 'project') render(<ProjectBlockView block={{ id: 'block-1', type, name: '项目', role: '原职位', startDate: '', endDate: '', contentHtml: '' }} />)
    else render(<CampusBlockView block={{ id: 'block-1', type: 'campus', organization: '社团', position: '原职位', startDate: '', endDate: '', contentHtml: '' }} />)
    fireEvent.click(screen.getByText('原职位'))
    const input = screen.getByRole('combobox') as HTMLInputElement
    const query = type === 'experience' ? '产品' : type === 'project' ? '项目' : '班'
    const label = type === 'experience' ? '产品助理 产品' : type === 'project' ? '项目负责人' : '班长'
    fireEvent.change(input, { target: { value: query } })
    fireEvent.click(screen.getByRole('option', { name: label }))
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(store.setResume).toHaveBeenCalledOnce()
    const draft = { sections: [{ blocks: [{ id: 'block-1', type, position: '原职位', role: '原职位' }] }] }
    store.setResume.mock.calls[0][0](draft)
    expect(draft.sections[0].blocks[0][type === 'project' ? 'role' : 'position']).toBe(label.split(' ')[0])
  })

  it('mobile suggestions preserve custom text, use aliases and require explicit keyboard selection', () => {
    function Form() {
      const [value, setValue] = useState('')
      return <><AutocompleteField label="意向岗位" value={value} onValueChange={setValue} options={POSITION_SUGGESTIONS} required />
        <AutocompleteField label="项目角色" value="" onValueChange={() => {}} options={PROJECT_ROLE_SUGGESTIONS} /></>
    }
    render(<Form />)
    const input = screen.getByRole('combobox', { name: '意向岗位' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: '产品' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('产品')
    fireEvent.change(input, { target: { value: 'BD' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('商务拓展')
    fireEvent.change(input, { target: { value: '自定义实习方向' } })
    expect(screen.getByRole('option', { name: '使用“自定义实习方向” 自定义填写' })).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('自定义实习方向')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
