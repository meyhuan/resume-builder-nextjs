import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import JingruiTemplate from '@/templates/jingrui'

const state = vi.hoisted(() => ({ readOnly: false, openHeader: vi.fn(), openJob: vi.fn(), commitName: vi.fn() }))
vi.mock('@/state/store', () => ({ useAppStore: (select: (value: { readOnly: boolean }) => unknown) => select(state) }))
vi.mock('@/templates/_core', async () => {
  const { contrastingInk } = await import('@/templates/_core/contrast')
  return {
    contrastingInk,
    mmToPx: (value: number) => value * 96 / 25.4,
    ResumeFrame: ({ children, ...props }: { children: ReactNode }) => <div {...props}>{children}</div>,
    AvatarSlot: () => <div data-testid="avatar-slot" />,
    EditableText: ({ value, onCommit }: { value: string; onCommit?: (value: string) => void }) => <span data-editable={Boolean(onCommit)}>{value}</span>,
    FieldChip: ({ children }: { children: ReactNode }) => <span data-field-chip>{children}</span>,
    BlockList: () => <div />,
    DeleteSectionDialog: () => null,
    SortableSection: ({ children }: { children: (drag: object) => ReactNode }) => <>{children({ attributes: {}, listeners: {}, ref: vi.fn() })}</>,
    useEditableHeader: (name: string, baseInfo: ResumeData['baseInfo']) => ({ name, baseInfo, fields: [{ key: 'email', label: '邮箱', value: baseInfo?.email, icon: null }], onCommitName: state.commitName, openEditModal: state.openHeader, modals: null }),
    useEditableJobIntention: (job: ResumeData['jobIntention']) => ({ fields: job?.position ? [{ key: 'position', label: '职位', value: job.position }] : [], openEditModal: state.openJob, modals: null }),
    useEditableSection: (section: ResumeData['sections'][number]) => ({ displayTitle: section.title, canEditTitle: !state.readOnly, setHovered: vi.fn(), isTextOnly: false, onAddBlock: vi.fn(), onRequestDelete: vi.fn() }),
  }
})

const resume: ResumeData = { id: 'qa-resume', name: '陈一', baseInfo: { email: 'chenyi@example.com', showAvatar: false }, jobIntention: { position: '前端工程师' }, sections: [{ id: 'qa-section', title: '教育经历', columns: 1, blocks: [] }] }
const theme: ThemeTokens = { primaryColor: '#4c47ff', textColor: '#171717', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6, spacingScale: 1, pagePaddingVertical: 16, pagePaddingHorizontal: 16 }
beforeEach(() => { state.readOnly = false; vi.clearAllMocks() })
afterEach(cleanup)

describe('蓝序 release regressions', () => {
  it('removes the gray photo panel when the avatar is hidden, keeping all personal data on the accent panel', () => {
    const { container } = render(<JingruiTemplate resume={resume} theme={theme} />)
    expect(container.querySelector('.jingrui-photo-panel')).toBeNull()
    expect(screen.queryByTestId('avatar-slot')).toBeNull()
    const content = container.querySelector('.jingrui-side-content')
    expect(content?.textContent).toContain('陈一')
    expect(content?.textContent).toContain('chenyi@example.com')
    expect(container.querySelector('.jingrui-resume')?.getAttribute('style')).toContain('--jingrui-on-accent: #ffffff')
    expect(container.querySelector('style')?.textContent).not.toContain('40%')
  })
  it('keeps the gray photo area separate and switches to black ink for light themes', () => {
    const { container } = render(<JingruiTemplate resume={{ ...resume, baseInfo: { ...resume.baseInfo, showAvatar: true } }} theme={{ ...theme, primaryColor: '#e9eef5' }} />)
    expect(screen.getByTestId('avatar-slot').closest('.jingrui-photo-panel')).not.toBeNull()
    expect(container.querySelector('.jingrui-resume')?.getAttribute('style')).toContain('--jingrui-on-accent: #000000')
    expect(container.querySelector('.jingrui-photo-panel')?.textContent).not.toContain('陈一')
  })
  it('does not open editor controls from read-only preview', () => {
    state.readOnly = true
    const { container } = render(<JingruiTemplate resume={resume} theme={theme} />)
    fireEvent.click(container.querySelector('.jingrui-sidebar')!)
    fireEvent.click(container.querySelector('.jingrui-role')!)
    fireEvent.click(container.querySelector('.jingrui-job')!)
    expect(state.openHeader).not.toHaveBeenCalled()
    expect(state.openJob).not.toHaveBeenCalled()
    expect(container.querySelector('.jingrui-name [data-editable]')?.getAttribute('data-editable')).toBe('false')
    expect(container.querySelector('.jingrui-actions')).toBeNull()
    expect(container.querySelector('.jingrui-sidebar')?.hasAttribute('tabindex')).toBe(false)
  })
  it('keeps edit entry points functional and respects the saved intention visibility', () => {
    const { container, rerender } = render(<JingruiTemplate resume={resume} theme={theme} />)
    fireEvent.keyDown(container.querySelector('.jingrui-sidebar')!, { key: 'Enter' })
    fireEvent.click(container.querySelector('.jingrui-role')!)
    expect(state.openHeader).toHaveBeenCalledOnce()
    expect(state.openJob).toHaveBeenCalledOnce()
    rerender(<JingruiTemplate resume={{ ...resume, jobIntentionVisible: false }} theme={theme} />)
    expect(container.querySelector('.jingrui-role')).toBeNull()
    expect(container.querySelector('.jingrui-job')).toBeNull()
  })
})
