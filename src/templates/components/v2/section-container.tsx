/**
 * SectionContainer - V2 Reusable Section Wrapper
 * Provides configurable hover effects and styling for sections
 */
import { useState } from 'react'
import type { ReactElement, ReactNode, CSSProperties } from 'react'
import type { SectionContainerStyles } from './types'

interface SectionContainerProps {
  readonly children: ReactNode
  readonly themeColor: string
  readonly styles?: SectionContainerStyles
}

/**
 * Wraps section content with configurable styling and hover effects.
 * Supports dynamic border color, background color, shadow, and scale on hover.
 */
export default function SectionContainer(props: SectionContainerProps): ReactElement {
  const { children, themeColor, styles } = props
  const [isHovered, setIsHovered] = useState(false)

  const baseClassName = [
    styles?.container || '',
    styles?.spacing !== undefined ? styles.spacing : 'mb-5',
    styles?.padding !== undefined ? styles.padding : 'p-4',
    styles?.borderRadius !== undefined ? styles.borderRadius : 'rounded-lg',
    styles?.hover?.enabled !== false ? 'transition-all duration-200 group' : '',
  ].filter(Boolean).join(' ')

  const baseStyle: CSSProperties = {
    border: styles?.border !== undefined ? styles.border : '2px solid transparent',
    background: styles?.background || 'transparent',
  }

  const hoverStyle: CSSProperties = {}
  
  if (styles?.hover?.enabled !== false && isHovered) {
    if (styles?.hover?.borderColor) {
      hoverStyle.borderColor = styles.hover.borderColor.replace('{{themeColor}}', themeColor)
    } else {
      hoverStyle.borderColor = `${themeColor}20`
    }
    
    if (styles?.hover?.backgroundColor) {
      hoverStyle.backgroundColor = styles.hover.backgroundColor
    } else {
      hoverStyle.backgroundColor = 'rgba(249, 250, 251, 0.5)'
    }

    if (styles?.hover?.scale) {
      hoverStyle.transform = `scale(${styles.hover.scale})`
    }
  }

  const mergedStyle = { ...baseStyle, ...hoverStyle }

  const hoverClassName = styles?.hover?.enabled !== false && isHovered
    ? styles?.hover?.shadow || 'shadow-sm'
    : ''

  const finalClassName = `${baseClassName} ${hoverClassName}`.trim()

  function handleMouseEnter(): void {
    if (styles?.hover?.enabled !== false) {
      setIsHovered(true)
    }
  }

  function handleMouseLeave(): void {
    if (styles?.hover?.enabled !== false) {
      setIsHovered(false)
    }
  }

  return (
    <section
      className={finalClassName}
      style={mergedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </section>
  )
}
