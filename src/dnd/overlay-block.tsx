import type { ReactElement } from 'react'

/**
 * OverlayBlock renders a visual ghost for a block during dragging.
 */
export default function OverlayBlock(props: { html: string }): ReactElement {
  return (
    <div className="bg-white/95 border-2 border-blue-300 ring-2 ring-blue-200/60 rounded shadow-2xl p-2 w-full transform scale-[0.98] pointer-events-none">
      <div className="max-w-none text-sm" dangerouslySetInnerHTML={{ __html: props.html }} />
    </div>
  )
}
