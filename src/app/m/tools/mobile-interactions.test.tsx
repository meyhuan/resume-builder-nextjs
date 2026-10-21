import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { GreetingCompany } from './_components/greeting-company'
import { useGenerationRequest } from './_components/generation-feedback'
import { Teleprompter } from './_components/teleprompter'
import { resolveJdEditTarget } from '@/lib/ai/jd-edit-target'
import { applyMobileTranslationUnit, finishMobileTranslation } from '@/lib/ai/mobile-translation-stream'
import { createDefaultResume } from '@/lib/default-resume'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('mobile career tools', () => {
  it('shares the company replacement across greeting styles, rendering input as text', () => {
    function Greetings() {
      const [company, setCompany] = useState('')
      return <><GreetingCompany text="希望加入贵司" company={company} onChange={setCompany} />
        <GreetingCompany text="对贵司感兴趣" company={company} onChange={setCompany} /></>
    }
    render(<Greetings />)
    fireEvent.click(screen.getAllByRole('button', { name: '填写公司名称' })[0])
    fireEvent.change(screen.getByLabelText('公司名称'), { target: { value: '<b>测试公司</b>' } })
    fireEvent.click(screen.getByRole('button', { name: '确认替换' }))
    expect(screen.getAllByText('<b>测试公司</b>')).toHaveLength(2)
    expect(document.querySelector('b')).toBeNull()
  })

  it('aborts old requests on restart, explicit cancel and unmount', () => {
    const hook = renderHook(() => useGenerationRequest())
    const first = hook.result.current.begin()
    const second = hook.result.current.begin()
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
    act(() => hook.result.current.cancel())
    expect(second.signal.aborted).toBe(true)
    const third = hook.result.current.begin()
    hook.unmount()
    expect(third.signal.aborted).toBe(true)
  })

  it('opens a full viewport teleprompter and pauses/restarts without changing text', () => {
    const close = vi.fn()
    render(<Teleprompter text="这是测试自我介绍。" open onOpenChange={close} />)
    expect(screen.getByRole('dialog').className).toContain('h-dvh')
    fireEvent.click(screen.getByRole('button', { name: '开始滚动' }))
    expect(screen.getByRole('button', { name: '暂停滚动' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }))
    expect(screen.getByRole('button', { name: '开始滚动' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '退出' }))
    expect(close).toHaveBeenCalledWith(false)
  })

  it('targets the actual section by block and does not invent a destination', () => {
    const resume = createDefaultResume()
    resume.sections = [
      { id: 'intern', title: '实习经历', columns: 1, blocks: [{ id: 'block-1', type: 'text', html: '实习内容' }] },
      { id: 'project', title: '项目经历', columns: 1, blocks: [] },
    ]
    expect(resolveJdEditTarget(resume, 'experience', 'block-1')).toBe('intern')
    expect(resolveJdEditTarget(resume, '项目经历')).toBe('project')
    expect(resolveJdEditTarget(resume, 'sections[0]')).toBe('intern')
    expect(resolveJdEditTarget(resume, 'unknown')).toBeNull()
  })

  it('applies the actual translation progress.unit payload without mutating the original', () => {
    const resume = createDefaultResume()
    resume.name = '测试'
    resume.sections = [{ id: 's1', title: '自我评价', columns: 1, blocks: [{ id: 'b1', type: 'text', html: '擅长沟通' }] }]
    let draft = applyMobileTranslationUnit(resume, { kind: 'header', name: 'Test' })
    draft = applyMobileTranslationUnit(draft, { sectionId: 's1', title: 'Summary', blocks: [{ id: 'b1', html: 'Good communication' }] })
    expect(draft.name).toBe('Test')
    expect(draft.sections[0].title).toBe('Summary')
    expect(draft.sections[0].blocks[0]).toMatchObject({ html: 'Good communication', id: 'b1' })
    expect(resume.name).toBe('测试')
    expect(resume.sections[0].title).toBe('自我评价')
    expect(finishMobileTranslation(draft, true, 0, 'en').language).toBe('en')
    expect(() => finishMobileTranslation(draft, false, 0, 'en')).toThrow('中断')
    expect(() => finishMobileTranslation(draft, true, 1, 'en')).toThrow('未完成')
  })
})
