'use client'

import { memo, useEffect, useRef, useState, type ReactElement } from 'react'

interface TemplateCoverProps {
  readonly src: string
  readonly alt: string
  readonly className?: string
}

/**
 * Template covers are already small WebP files. Load each one only when it
 * nears the visible area, and let the browser cache the static file directly.
 */
export const TemplateCover = memo(function TemplateCover({ src, alt, className }: TemplateCoverProps): ReactElement {
  const ref = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || active) return
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setActive(true), 0)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setActive(true)
        observer.disconnect()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [active])

  if (!active) {
    return <span ref={ref} className={className} aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      className={className}
    />
  )
})
