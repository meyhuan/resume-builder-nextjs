import type { ReactElement } from 'react'

/**
 * OverlaySection renders a visual ghost for a section during dragging.
 */
export default function OverlaySection(props: { title: string; themeColor: string }): ReactElement {
  return (
    <div className="bg-white/95 border-2 border-blue-300 ring-2 ring-blue-200/60 rounded shadow-2xl p-3 w-full transform scale-[0.98] pointer-events-none">
      <h2 className="text-lg font-semibold" style={{ color: props.themeColor }}>
        {props.title || 'Section'}
      </h2>
    </div>
  )
}
