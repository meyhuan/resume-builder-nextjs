/**
 * EditorToolbar — Horizontal action bar above the resume canvas.
 *
 * Each button toggles a corresponding panel in the right sidebar.
 * The active button is visually highlighted.
 */
import type { ReactElement } from 'react'
import {
  LayoutList,
  Sparkles,
  BookOpen,
  ImageIcon,
  BarChart3,
  Wand2,
} from 'lucide-react'

/** All possible panel identifiers. */
export type PanelId =
  | 'sections'
  | 'layout'
  | 'examples'
  | 'photo'
  | 'analysis'
  | 'ai'

interface ToolbarAction {
  readonly id: PanelId
  readonly label: string
  readonly icon: ReactElement
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: 'sections', label: 'Sections', icon: <LayoutList className="h-3.5 w-3.5" /> },
  { id: 'layout', label: 'Layout', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'examples', label: 'Examples', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'photo', label: 'Photo', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'ai', label: 'AI Optimize', icon: <Wand2 className="h-3.5 w-3.5" /> },
]

export interface EditorToolbarProps {
  readonly activePanel: PanelId | null
  readonly onPanelChange: (panel: PanelId | null) => void
}

export default function EditorToolbar(props: EditorToolbarProps): ReactElement {
  const { activePanel, onPanelChange } = props

  function handleClick(id: PanelId): void {
    onPanelChange(activePanel === id ? null : id)
  }

  return (
    <nav className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md rounded-xl border border-white shadow-sm">
      {TOOLBAR_ACTIONS.map((action) => {
        const isActive: boolean = activePanel === action.id
        return (
          <button
            key={action.id}
            type="button"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 whitespace-nowrap
              ${isActive
                ? 'text-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.1)]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
              }
            `}
            onClick={() => handleClick(action.id)}
          >
            {action.icon}
            {action.label}
          </button>
        )
      })}
    </nav>
  )
}
