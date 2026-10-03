import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { TimelineEducationMeta } from '@/templates/timeline/education-meta'

vi.mock('@/editor/editable-field-wrapper', () => ({ default: (props: { fieldName: string; value?: string; onUpdate: (value: string) => void }) => <span data-field={props.fieldName} onClick={() => props.onUpdate('已编辑')}>{props.value}</span> }))
afterEach(cleanup)

describe('Timeline education separators', () => {
  it.each([
    [undefined, undefined, ''],
    ['计算机', undefined, '计算机'],
    [undefined, '本科', '本科'],
    ['计算机', '本科', '计算机/本科'],
    ['  ', '本科', '  本科'],
  ])('does not print orphan separators for %s / %s', (major, degree, expected) => {
    const { container } = render(<TimelineEducationMeta blockId="edu" major={major} degree={degree} onUpdate={vi.fn()} />)
    expect(container.textContent).toBe(expected)
    expect(container.querySelectorAll('[data-field]').length).toBe(2)
  })
  it('keeps both inline editing callbacks wired for empty fields', () => {
    const onUpdate = vi.fn()
    const { container } = render(<TimelineEducationMeta blockId="edu" onUpdate={onUpdate} />)
    fireEvent.click(container.querySelector('[data-field="major"]')!)
    fireEvent.click(container.querySelector('[data-field="degree"]')!)
    expect(onUpdate.mock.calls).toEqual([['major', '已编辑'], ['degree', '已编辑']])
  })
})
