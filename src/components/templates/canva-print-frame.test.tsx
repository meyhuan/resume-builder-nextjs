import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReferenceStyles } from '@/templates/_canva/styles'

describe('fragmented print frame', () => {
  it('reserves border space and does not repeat an outline over continuation text', () => {
    const css = renderToStaticMarkup(<ReferenceStyles />)
    const printRules = css.slice(css.indexOf('@media print'))
    const frame = printRules.match(/\.canva-page\.canva-outer-frame\s*\{([^}]+)\}/)?.[1]
    expect(frame).toContain('outline: none !important')
    expect(frame).toContain('border: 6px solid var(--canva-accent)')
    expect(frame).toContain('box-decoration-break: slice')
    expect(frame).not.toContain('clone')
  })
})
