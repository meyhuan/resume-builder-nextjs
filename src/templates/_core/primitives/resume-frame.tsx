import type { CSSProperties, ReactElement, ReactNode } from 'react'
import DragDropProvider from '@/dnd/drag-drop-provider'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import { useAppStore } from '@/state/store'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/**
 * Outer frame that every template should wrap its visuals in.
 *
 * Responsibilities:
 *  - DnD context for section & block reordering.
 *  - Global CSS vars (font, text color, etc.) inherited from theme.
 *  - `data-page-padding-vertical` and `data-bleed` for export/print.
 *
 * It is visually invisible (no padding, no background, no layout) —
 * templates decide their own chrome.
 */
export interface ResumeFrameProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  /** Applied to the root container style. */
  readonly className?: string
  readonly style?: CSSProperties
  /** If true, pins `data-bleed=true` so export tooling skips top padding. */
  readonly bleed?: boolean
  /** Let templates with custom multi-column DnD provide their own context. */
  readonly disableDnd?: boolean
  readonly children: ReactNode
}

export function ResumeFrame(props: ResumeFrameProps): ReactElement {
  const { resume, theme, className, style, bleed, children } = props
  const onMoveSection = useAppStore((s) => s.moveSection)
  const onMoveWithinSection = useAppStore((s) => s.moveBlockInSection)
  const onMoveToSection = useAppStore((s) => s.moveBlockToSection)

  return (
    <div
      className={`resume-container bg-white text-black mx-auto ${className ?? ''}`}
      data-page-padding-vertical={theme.pagePaddingVertical}
      {...(bleed ? { 'data-bleed': 'true' } : {})}
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        ...style,
      }}
    >
      {props.disableDnd ? (
        children
      ) : (
        <DragDropProvider
          resume={resume}
          theme={theme}
          onMoveSection={onMoveSection}
          onMoveWithinSection={onMoveWithinSection}
          onMoveToSection={onMoveToSection}
        >
          {children}
        </DragDropProvider>
      )}
    </div>
  )
}

/** Re-export the delete confirm dialog as a headless primitive. */
export { DeleteSectionDialog }
