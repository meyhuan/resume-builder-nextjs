/**
 * InlineToolbar renders formatting actions for the active Lexical editor.
 * Tracks selection state to show active formatting and provide consistent UX.
 */
import { Fragment, useCallback, useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, $getSelection, $isRangeSelection, UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL } from 'lexical'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode, ListNode } from '@lexical/list'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bold, Italic, Underline, List, ListOrdered, IndentIncrease, IndentDecrease, Undo2, Redo2 } from 'lucide-react'

interface InlineToolbarProps {
  readonly className?: string
  readonly docked?: boolean
}

/**
 * Toolbar state tracking for active formats and block types.
 */
interface ToolbarState {
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  blockType: 'paragraph' | 'bullet' | 'number'
  canUndo: boolean
  canRedo: boolean
}

type ToolbarAction = 'bold' | 'italic' | 'underline' | 'bullet' | 'number' | 'outdent' | 'indent' | 'undo' | 'redo'
const controls = [
  { action: 'bold', label: '加粗', title: '加粗 (Ctrl+B)', Icon: Bold },
  { action: 'italic', label: '斜体', title: '斜体 (Ctrl+I)', Icon: Italic },
  { action: 'underline', label: '下划线', title: '下划线 (Ctrl+U)', Icon: Underline },
  { action: 'bullet', label: '无序列表', title: '无序列表', Icon: List },
  { action: 'number', label: '有序列表', title: '有序列表', Icon: ListOrdered },
  { action: 'outdent', label: '减少缩进', title: '减少缩进', Icon: IndentDecrease },
  { action: 'indent', label: '增加缩进', title: '增加缩进', Icon: IndentIncrease },
  { action: 'undo', label: '撤销', title: '撤销 (Ctrl+Z)', Icon: Undo2 },
  { action: 'redo', label: '重做', title: '重做 (Ctrl+Y / Ctrl+Shift+Z)', Icon: Redo2 },
] as const

/** The same controls reserve a stable position before an editor is active. */
export function InlineToolbarControls(props: InlineToolbarProps & {
  readonly state?: ToolbarState
  readonly onAction?: (action: ToolbarAction, event: React.MouseEvent) => void
}): ReactElement {
  const active = { bold: props.state?.isBold, italic: props.state?.isItalic, underline: props.state?.isUnderline,
    bullet: props.state?.blockType === 'bullet', number: props.state?.blockType === 'number' }
  return <div role="toolbar" aria-label="正文格式" className={clsx(
    'flex items-center gap-0.5 print:hidden',
    props.docked ? 'py-1' : 'bg-white shadow-sm rounded px-1.5 py-1 border border-gray-200', props.className
  )} onKeyDown={(event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    if (index < 0 || !buttons.length) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next].focus()
  }}>
    {controls.map(({ action, label, title, Icon }, index) => {
      const pressed = action in active ? active[action as keyof typeof active] : undefined
      return <Fragment key={action}>
        {[3, 5, 7].includes(index) ? <Separator orientation="vertical" className="h-4 mx-0.5" /> : null}
        <Button variant="ghost" size="icon" aria-label={label} title={title}
          aria-pressed={pressed}
          disabled={!props.onAction || (action === 'undo' && !props.state?.canUndo) || (action === 'redo' && !props.state?.canRedo)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => props.onAction?.(action, event)}
          className={clsx('h-7 w-7 disabled:opacity-50', pressed && 'bg-accent text-accent-foreground')}>
          <Icon className="h-4 w-4" />
        </Button>
      </Fragment>
    })}
  </div>
}

export default function InlineToolbar(props: InlineToolbarProps): ReactElement {
  const [editor] = useLexicalComposerContext()

  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    blockType: 'paragraph',
    canUndo: false,
    canRedo: false,
  })

  // Track editor state changes to update toolbar UI
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return

          // Check inline formats
          const isBold = selection.hasFormat('bold')
          const isItalic = selection.hasFormat('italic')
          const isUnderline = selection.hasFormat('underline')

          // Check block type and alignment
          const anchorNode = selection.anchor.getNode()
          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : anchorNode.getTopLevelElementOrThrow()

          let blockType: 'paragraph' | 'bullet' | 'number' = 'paragraph'
          if ($isListNode(element)) {
            const parentList = $findMatchingParent(anchorNode, $isListNode) as ListNode | null
            blockType = parentList ? (parentList.getListType() === 'bullet' ? 'bullet' : 'number') : 'paragraph'
          }

          setToolbarState((prev) => ({
            ...prev,
            isBold,
            isItalic,
            isUnderline,
            blockType,
          }))
        })
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setToolbarState((prev) => ({ ...prev, canUndo: payload }))
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setToolbarState((prev) => ({ ...prev, canRedo: payload }))
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      )
    )
  }, [editor])

  const withFocus = useCallback((action: () => void) => {
    return (e: React.MouseEvent): void => {
      e.preventDefault()
      editor.focus()
      action()
    }
  }, [editor])

  const onBold = useCallback((): void => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
  }, [editor])

  const onItalic = useCallback((): void => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
  }, [editor])

  const onUnderline = useCallback((): void => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  }, [editor])

  const onBulletList = useCallback((): void => {
    if (toolbarState.blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }, [editor, toolbarState.blockType])

  const onNumberList = useCallback((): void => {
    if (toolbarState.blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    }
  }, [editor, toolbarState.blockType])

  const onIndent = useCallback((): void => {
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
  }, [editor])

  const onOutdent = useCallback((): void => {
    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
  }, [editor])

  const actions: Record<ToolbarAction, () => void> = {
    bold: onBold, italic: onItalic, underline: onUnderline, bullet: onBulletList, number: onNumberList,
    indent: onIndent, outdent: onOutdent,
    undo: () => editor.dispatchCommand(UNDO_COMMAND, undefined),
    redo: () => editor.dispatchCommand(REDO_COMMAND, undefined),
  }
  return <InlineToolbarControls {...props} state={toolbarState}
    onAction={(action, event) => withFocus(actions[action])(event)} />
}
