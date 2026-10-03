import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import ZhangxuTemplate from '@/templates/zhangxu'

const state = vi.hoisted(() => ({ readOnly: false, openHeader: vi.fn(), openJob: vi.fn(), commitName: vi.fn(), add: vi.fn(), remove: vi.fn() }))
vi.mock('@/state/store', () => ({ useAppStore: (select: (value: typeof state) => unknown) => select(state) }))
vi.mock('@/templates/_core', async () => {
  const { contrastingInk } = await import('@/templates/_core/contrast')
  return {
    contrastingInk,
    mmToPx: (value: number) => value * 96 / 25.4,
    ResumeFrame: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
    AvatarSlot: () => null,
    EditableText: ({ value, onCommit }: { value: string; onCommit?: (value: string) => void }) => <span data-editable={Boolean(onCommit)}>{value}</span>,
    FieldChip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    BlockList: () => <div />,
    DeleteSectionDialog: () => null,
    SortableSection: ({ children }: { children: (drag: object) => ReactNode }) => <>{children({ attributes: {}, listeners: {}, ref: vi.fn() })}</>,
    useEditableHeader: (name: string, baseInfo: ResumeData['baseInfo']) => ({ name, fields: baseInfo?.email ? [{ key: 'email', label: '邮箱', value: baseInfo.email }] : [], onCommitName: state.commitName, openEditModal: state.openHeader, modals: null }),
    useEditableJobIntention: (job: ResumeData['jobIntention']) => ({ fields: job?.position ? [{ key: 'position', label: '职位', value: job.position }] : [], openEditModal: state.openJob, setHoveredField: vi.fn(), hoveredField: 'position', deleteField: vi.fn(), modals: null }),
    useEditableSection: (section: ResumeData['sections'][number]) => ({ displayTitle: section.title, canEditTitle: !state.readOnly, isHovered: true, setHovered: vi.fn(), isTextOnly: false, onAddBlock: state.add, onRequestDelete: state.remove }),
  }
})

const resume: ResumeData = { id: 'qa-resume', name: '陈一', baseInfo: { email: 'chenyi@example.com', showAvatar: false }, jobIntention: { position: '前端工程师' }, sections: [{ id: 'education', title: '教育经历', columns: 1, blocks: [] }, { id: 'projects', title: '项目经历', columns: 1, blocks: [] }] }
const theme: ThemeTokens = { primaryColor: '#343434', textColor: '#171717', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, spacingScale: 1, pagePaddingVertical: 16, pagePaddingHorizontal: 16 }
beforeEach(() => { state.readOnly = false; vi.clearAllMocks() })
afterEach(cleanup)

describe('章序 release regressions', () => {
  it('recomputes chapter numbers from the saved order, without fixed section names', () => {
    const { container, rerender } = render(<ZhangxuTemplate resume={resume} theme={theme} />)
    expect(Array.from(container.querySelectorAll('.zhangxu-section')).map((section) => [section.getAttribute('data-template-section-title'), section.querySelector('.zhangxu-number')?.textContent])).toEqual([['教育经历', '01'], ['项目经历', '02']])
    rerender(<ZhangxuTemplate resume={{ ...resume, sections: [resume.sections[1]] }} theme={theme} />)
    expect(container.querySelector('.zhangxu-number')?.textContent).toBe('01')
    expect(container.querySelector('.zhangxu-section')?.getAttribute('data-template-section-title')).toBe('项目经历')
  })
  it('opens header and intention with Enter and Space, and keeps section actions wired', () => {
    const { container } = render(<ZhangxuTemplate resume={resume} theme={theme} />)
    fireEvent.keyDown(container.querySelector('.zhangxu-fields')!, { key: ' ' })
    fireEvent.keyDown(container.querySelector('.zhangxu-job')!, { key: 'Enter' })
    fireEvent.click(screen.getAllByLabelText('添加内容')[0])
    fireEvent.click(screen.getAllByLabelText('删除区块')[0])
    expect(state.openHeader).toHaveBeenCalledOnce()
    expect(state.openJob).toHaveBeenCalledOnce()
    expect(state.add).toHaveBeenCalledOnce()
    expect(state.remove).toHaveBeenCalledOnce()
  })
  it('has no mutating triggers or fixture hints in read-only preview', () => {
    state.readOnly = true
    const { container } = render(<ZhangxuTemplate resume={{ ...resume, baseInfo: {} }} theme={theme} />)
    fireEvent.click(container.querySelector('.zhangxu-fields')!)
    fireEvent.keyDown(container.querySelector('.zhangxu-job')!, { key: ' ' })
    expect(state.openHeader).not.toHaveBeenCalled()
    expect(state.openJob).not.toHaveBeenCalled()
    expect(container.querySelector('.zhangxu-actions')).toBeNull()
    expect(container.querySelector('.zhangxu-fields')?.hasAttribute('tabindex')).toBe(false)
    expect(screen.queryByText('＋ 编辑基本信息')).toBeNull()
    expect(screen.queryByLabelText('删除 职位')).toBeNull()
  })
  it('respects hidden intention and uses legible icons on a light accent', () => {
    const { container } = render(<ZhangxuTemplate resume={{ ...resume, jobIntentionVisible: false }} theme={{ ...theme, primaryColor: '#e9eef5' }} />)
    expect(container.querySelector('.zhangxu-job')).toBeNull()
    expect(container.querySelector('.zhangxu-resume')?.getAttribute('style')).toContain('--zhangxu-on-accent: #000000')
  })
})
