/**
 * SectionContainer - V2 Reusable Section Wrapper
 * Provides consistent hover effects for all sections
 */
import { useState } from 'react'
import type { ReactElement, ReactNode, CSSProperties } from 'react'

interface SectionContainerProps {
  readonly children: ReactNode
  readonly themeColor: string
}

/**
 * Wraps section content with consistent hover effects.
 * All templates use the same hover behavior for consistency.
 */
export default function SectionContainer(props: SectionContainerProps): ReactElement {
  const { children, themeColor } = props
  const [isHovered, setIsHovered] = useState(false)

  const baseClassName = [
    'mb-1',
    'p-1',
    'rounded-lg',
    'transition-all duration-200 group',
    isHovered ? 'shadow-sm' : '',
  ].filter(Boolean).join(' ')

  const dynamicStyle: CSSProperties = {
    border: isHovered ? `1px solid ${themeColor}20` : '1px solid transparent',
    background: isHovered ? 'rgba(249, 250, 251, 0.5)' : 'transparent',
  }

  function handleMouseEnter(): void {
    setIsHovered(true)
  }

  function handleMouseLeave(): void {
    setIsHovered(false)
  }

  return (
    <section
      className={baseClassName}
      style={dynamicStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </section>
  )
}
