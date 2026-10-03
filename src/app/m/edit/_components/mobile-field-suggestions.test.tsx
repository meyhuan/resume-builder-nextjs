import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JobIntentionEditPage from '../intention/page'
import { ExperienceDetailClient, type ExperienceKind } from './experience-detail-client'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

vi.mock('idb-keyval', () => ({ get: async () => null, set: async () => {}, del: async () => {} }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('./module-edit-shell', () => ({ ModuleEditShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('@/features/edit/form-fields/rich-ai-textarea', () => ({ RichAiTextarea: () => null }))
vi.mock('@/features/edit/form-fields/month-picker-field', () => ({ MonthPickerField: () => null }))

beforeEach(() => {
  useDraftStore.setState({ draft: null, server: null, resumeId: null, dirtyPaths: [] })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('mobile autocomplete bindings', () => {
  it('binds job aliases and full city data to the draft while preserving unselected custom text', () => {
    act(() => useDraftStore.getState().setFromServer('mobile-choice-qa', { id: 'mobile-choice-qa', name: '李小满', sections: [], jobIntention: { position: '原职位' } }))
    render(<JobIntentionEditPage />)
    const job = screen.getByRole('combobox', { name: '意向岗位' })
    fireEvent.change(job, { target: { value: 'BD' } })
    fireEvent.keyDown(job, { key: 'ArrowDown' })
    fireEvent.keyDown(job, { key: 'Enter' })
    expect(useDraftStore.getState().draft?.jobIntention?.position).toBe('商务拓展')
    const city = screen.getByRole('combobox', { name: '意向城市' })
    fireEvent.change(city, { target: { value: 'kunshan' } })
    fireEvent.click(screen.getByRole('option', { name: '昆山 江苏 · 苏州' }))
    expect(useDraftStore.getState().draft?.jobIntention?.city).toBe('昆山')
    fireEvent.change(job, { target: { value: '自定义产品实习岗位' } })
    fireEvent.keyDown(job, { key: 'Enter' })
    expect(useDraftStore.getState().draft?.jobIntention?.position).toBe('自定义产品实习岗位')
  })

  const date = { id: 'block-1', startDate: '2025.01', endDate: '2025.06' }
  it.each([
    ['work', { ...date, type: 'experience', company: '公司', position: '原岗位', contentHtml: '' }, '职位名称', '产品', '产品助理 产品', 'position', '产品助理'],
    ['intern', { ...date, type: 'experience', company: '公司', position: '原岗位', contentHtml: '' }, '实习岗位', '产品', '产品助理 产品', 'position', '产品助理'],
    ['project', { ...date, type: 'project', name: '项目', role: '成员', contentHtml: '' }, '项目角色', '前端', '前端负责人', 'role', '前端负责人'],
    ['campus', { ...date, type: 'campus', organization: '社团', position: '成员', contentHtml: '' }, '担任职务', '部长', '部长', 'position', '部长'],
    ['education', { ...date, type: 'education', school: '原学校', major: '原专业', courseHtml: '' }, '学校名称', '北大', '北京大学 北京市', 'school', '北京大学'],
    ['education', { ...date, type: 'education', school: '原学校', major: '原专业', courseHtml: '' }, '所学专业', '具身', '具身智能 本科 · 交叉学科', 'major', '具身智能'],
  ] as const)('saves the selected %s/%s to the right draft field', (kind, block, label, query, option, field, value) => {
    act(() => useDraftStore.getState().setFromServer('mobile-block-qa', { id: 'mobile-block-qa', name: '李小满', sections: [{ id: 'section-1', title: '测试经历', blocks: [{ ...block } as ResumeBlock], columns: 1 }] }))
    render(<ExperienceDetailClient kind={kind as ExperienceKind} title="测试经历" sectionTitle="测试经历" idx={0} backRoute="/m/edit" />)
    const input = screen.getByRole('combobox', { name: label })
    fireEvent.change(input, { target: { value: query } })
    fireEvent.click(screen.getByRole('option', { name: option }))
    const saved = useDraftStore.getState().draft?.sections[0].blocks[0]
    expect(saved).toMatchObject({ id: block.id, type: block.type, [field]: value })
    expect(document.activeElement).toBe(input)
  })
})
