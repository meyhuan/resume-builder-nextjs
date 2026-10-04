import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BaseInfoEditPage from '../base/page'
import { ExperienceDetailClient, type ExperienceKind } from './experience-detail-client'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

const captured = vi.hoisted(() => ({ validate: undefined as undefined | (() => { ok: boolean; message?: string }) }))
vi.mock('idb-keyval', () => ({ get: async () => null, set: async () => {}, del: async () => {} }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('./module-edit-shell', () => ({ ModuleEditShell: ({ children, validate }: { children: ReactNode; validate: typeof captured.validate }) => { captured.validate = validate; return <div>{children}</div> } }))
vi.mock('./mobile-avatar-field', () => ({ MobileAvatarField: () => null }))
vi.mock('./custom-base-fields', () => ({ CustomBaseFields: () => null }))
vi.mock('@/features/edit/form-fields/rich-ai-textarea', () => ({ RichAiTextarea: () => null }))

beforeEach(() => {
  useDraftStore.setState({ draft: null, server: null, resumeId: null, dirtyPaths: [] })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('mobile editing parity with PC data', () => {
  it('suggests complete email addresses without changing a private domain on focus', async () => {
    act(() => useDraftStore.getState().setFromServer('mobile-base', { id: 'mobile-base', name: '李小满', baseInfo: { email: 'li@company.cn' }, sections: [] }))
    render(<BaseInfoEditPage />)
    const email = screen.getByRole('combobox', { name: '邮箱' })
    fireEvent.focus(email)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.change(email, { target: { value: 'xiaoyu@q' } })
    fireEvent.click(await screen.findByRole('option', { name: 'xiaoyu@qq.com' }))
    expect(useDraftStore.getState().draft?.baseInfo?.email).toBe('xiaoyu@qq.com')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
  it('reads PC currentLocation, writes the same field, and offers the PC work-start month', async () => {
    act(() => useDraftStore.getState().setFromServer('mobile-base', { id: 'mobile-base', name: '李小满', baseInfo: { currentLocation: '上海', location: '旧城市', workStartTime: '2025.01' }, sections: [] }))
    render(<BaseInfoEditPage />)
    const city = screen.getByRole('combobox', { name: '所在城市' }) as HTMLInputElement
    expect(city.value).toBe('上海')
    fireEvent.change(city, { target: { value: 'kunshan' } })
    fireEvent.click(await screen.findByRole('option', { name: '昆山 江苏 · 苏州' }))
    expect(useDraftStore.getState().draft?.baseInfo?.currentLocation).toBe('昆山')
    fireEvent.click(screen.getByRole('button', { name: /工作开始月份 2025年1月/ }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(useDraftStore.getState().draft?.baseInfo?.workStartTime).toBe('2025.01')
  })
  it('falls back to a legacy mobile city until the user edits it', () => {
    act(() => useDraftStore.getState().setFromServer('mobile-base', { id: 'mobile-base', name: '李小满', baseInfo: { location: '苏州' }, sections: [] }))
    render(<BaseInfoEditPage />)
    const city = screen.getByRole('combobox', { name: '所在城市' }) as HTMLInputElement
    expect(city.value).toBe('苏州')
    fireEvent.change(city, { target: { value: '用户自定义城市' } })
    expect(useDraftStore.getState().draft?.baseInfo?.currentLocation).toBe('用户自定义城市')
  })
  it.each([
    ['work', { type: 'experience', company: '公司', position: '工程师', contentHtml: '' }],
    ['intern', { type: 'experience', company: '公司', position: '实习生', contentHtml: '' }],
    ['education', { type: 'education', school: '学校', major: '专业', courseHtml: '' }],
    ['project', { type: 'project', name: '项目', contentHtml: '' }],
    ['campus', { type: 'campus', organization: '社团', position: '部长', contentHtml: '' }],
  ] as const)('blocks saving a reversed %s range', (kind, block) => {
    act(() => useDraftStore.getState().setFromServer('mobile-range', { id: 'mobile-range', name: '李小满', sections: [{ id: 'section', title: '测试经历', columns: 1,
      blocks: [{ ...block, id: 'block', startDate: '2025.06', endDate: '2025-01' } as ResumeBlock] }] }))
    render(<ExperienceDetailClient kind={kind as ExperienceKind} title="测试经历" sectionTitle="测试经历" idx={0} backRoute="/m/edit" />)
    expect(screen.getByRole('alert').textContent).toBe('结束月份不能早于开始月份')
    expect(captured.validate?.()).toEqual({ ok: false, message: '结束月份不能早于开始月份' })
  })
})
