/**
 * SectionContainer - V2 Reusable Section Wrapper
 * Provides consistent hover effects for all sections
 */
import type { ReactElement, ReactNode } from 'react'

interface SectionContainerProps {
  readonly children: ReactNode
  readonly themeColor: string
  /** The template owns vertical spacing; hover decoration must not affect flow. */
  readonly flush?: boolean
}

/**
 * Wraps section content with consistent hover effects.
 * All templates use the same hover behavior for consistency.
 */
export default function SectionContainer(props: SectionContainerProps): ReactElement {
  const { children, flush = false } = props

  const baseClassName = [
    flush ? 'px-1 flow-root' : 'mb-1 p-1',
    'rounded-lg',
    'group group/section-edit',
  ].filter(Boolean).join(' ')

  return (
    <section
      className={baseClassName}
      style={{ border: flush ? undefined : '1px solid transparent' }}
    >
      {children}
    </section>
  )
}
