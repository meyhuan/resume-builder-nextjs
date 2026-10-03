import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JobIntentionModal from './job-intention-modal'
import { normalizeJobIntention } from '@/entities/user/job-intention-fields'
import type { ResumeData } from '@/entities/resume/resume-data'
import { toResumeContext } from '@/lib/ai/resume-context'
import { exportResumeToMarkdown } from '@/io/export-markdown'
import { profileFromResume } from '@/features/application-profile/resume-sync'
import { useJobIntentionField } from '@/features/edit/draft/use-draft-field'
import { useDraftStore } from '@/features/edit/draft/draft-store'

vi.mock('idb-keyval', () => ({ get: async () => null, set: async () => {}, del: async () => {} }))

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.hasPointerCapture ??= () => false
  HTMLElement.prototype.setPointerCapture ??= () => {}
  HTMLElement.prototype.releasePointerCapture ??= () => {}
  HTMLElement.prototype.scrollIntoView ??= () => {}
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('choice-based job intention', () => {
  it('does not offer the old blank-resume label as an employment choice', () => {
    expect(normalizeJobIntention({ type: '求职类型' }).type).toBeUndefined()
  })
  it.each(['校招', '社招'])('reads legacy %s without guessing employment type', type => {
    expect(normalizeJobIntention({ type, city: '景德镇' })).toEqual({ type: undefined, recruitmentType: type, city: '景德镇' })
    expect(normalizeJobIntention({ type, recruitmentType: '专项招聘' }).recruitmentType).toBe('专项招聘')
  })

  it('keeps legacy and custom values and saves independent employment/recruitment choices', () => {
    const save = vi.fn()
    render(<JobIntentionModal jobIntention={{ type: '校招', city: '海外', salary: '200-300元/天', customFields: [{ label: '方向', value: '研发' }] }} onSave={save} onClose={() => {}} />)
    expect((screen.getByRole('radio', { name: '招聘类型：校招' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: '工作性质：暂不填写' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: '工作性质：实习' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: '实习', recruitmentType: '校招', city: '海外', salary: '200-300元/天', customFields: [{ label: '方向', value: '研发' }] }))
  })

  it('searches city by keyboard, accepts a custom city, and Escape only closes the options', async () => {
    const close = vi.fn(), save = vi.fn()
    render(<JobIntentionModal jobIntention={{ salary: '200-300元/天' }} initialField="city" onSave={save} onClose={close} />)
    await waitFor(() => expect(document.activeElement?.id).toBe('city'))
    fireEvent.click(screen.getByRole('button', { name: '城市' }))
    const search = await screen.findByRole('combobox', { name: '搜索城市' })
    fireEvent.change(search, { target: { value: '杭州' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(screen.getByRole('button', { name: '城市' }).textContent).toContain('杭州')
    fireEvent.click(screen.getByRole('button', { name: '城市' }))
    fireEvent.change(await screen.findByRole('combobox', { name: '搜索城市' }), { target: { value: '景德镇' } })
    fireEvent.keyDown(screen.getByRole('combobox', { name: '搜索城市' }), { key: 'Enter', isComposing: true })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('combobox', { name: '搜索城市' }), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '城市' }))
    fireEvent.change(await screen.findByRole('combobox', { name: '搜索城市' }), { target: { value: '景德镇' } })
    fireEvent.click(screen.getByRole('option', { name: '使用“景德镇”' }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ city: '景德镇' }))
  })

  it('cancel does not persist selection changes; clearing a field remains possible', async () => {
    const save = vi.fn(), close = vi.fn()
    render(<JobIntentionModal jobIntention={{ city: '北京' }} onSave={save} onClose={close} />)
    fireEvent.click(screen.getByRole('button', { name: '城市' }))
    fireEvent.click(await screen.findByRole('option', { name: '暂不填写' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(save).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ city: undefined }))
  })

  it('keeps recruitment separate in AI context and Markdown export; employment sync excludes legacy recruitment values', () => {
    const resume: ResumeData = { id: 'choice-export', name: '李明', sections: [], jobIntentionVisible: true, jobIntention: { type: '实习', recruitmentType: '校招' } }
    expect(toResumeContext(resume).jobIntention).toMatchObject({ type: '实习', recruitmentType: '校招' })
    expect(exportResumeToMarkdown(resume)).toContain('工作性质: 实习 | 招聘类型: 校招')
    const legacy = { ...resume, jobIntention: { type: '社招' } }
    expect(toResumeContext(legacy).jobIntention).toMatchObject({ type: undefined, recruitmentType: '社招' })
    expect(profileFromResume(legacy).jobPreference.employmentType).toBe('')
  })

  it('mobile bindings preserve legacy recruitment when changing another field and keep both choices independent', () => {
    useDraftStore.getState().setFromServer('choice-mobile', { id: 'choice-mobile', name: '李明', sections: [], jobIntention: { type: '校招', city: '上海' } })
    const { result } = renderHook(() => ({ type: useJobIntentionField('type'), recruitment: useJobIntentionField('recruitmentType'), city: useJobIntentionField('city') }))
    expect(result.current.type.value).toBeUndefined()
    expect(result.current.recruitment.value).toBe('校招')
    act(() => result.current.city.setValue('成都'))
    act(() => result.current.type.setValue('实习'))
    expect(useDraftStore.getState().draft?.jobIntention).toMatchObject({ type: '实习', recruitmentType: '校招', city: '成都' })
    act(() => result.current.recruitment.setValue('社招'))
    expect(useDraftStore.getState().draft?.jobIntention).toMatchObject({ type: '实习', recruitmentType: '社招' })
  })
})
