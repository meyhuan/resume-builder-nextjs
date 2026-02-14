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
  { id: 'sections', label: '模块管理', icon: <LayoutList className="h-3.5 w-3.5" /> },
  { id: 'layout', label: '排版美化', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'examples', label: '参考案例', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'photo', label: '证件照', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'analysis', label: '智能分析', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'ai', label: 'AI一键优化', icon: <Wand2 className="h-3.5 w-3.5" /> },
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
    <nav className="flex items-center gap-0.5">
      {TOOLBAR_ACTIONS.map((action) => {
        const isActive: boolean = activePanel === action.id
        return (
          <button
            key={action.id}
            type="button"
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
              transition-all duration-150 whitespace-nowrap
              ${isActive
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
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
