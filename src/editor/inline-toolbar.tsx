/**
 * InlineToolbar renders formatting actions for the active Lexical editor.
 * Tracks selection state to show active formatting and provide consistent UX.
 */
import { useCallback, useState, useEffect } from 'react'
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

export default function InlineToolbar(props: InlineToolbarProps): ReactElement {
  const [editor] = useLexicalComposerContext()
  const isFloating = props.className?.includes('absolute')

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

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 print:hidden',
        isFloating ? 'bg-white shadow-md rounded px-1.5 py-1 border border-gray-200' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity',
        props.className
      )}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onBold)} 
        className={clsx('h-7 w-7', toolbarState.isBold && 'bg-accent text-accent-foreground')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onItalic)} 
        className={clsx('h-7 w-7', toolbarState.isItalic && 'bg-accent text-accent-foreground')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onUnderline)} 
        className={clsx('h-7 w-7', toolbarState.isUnderline && 'bg-accent text-accent-foreground')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onBulletList)} 
        className={clsx('h-7 w-7', toolbarState.blockType === 'bullet' && 'bg-accent text-accent-foreground')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onNumberList)} 
        className={clsx('h-7 w-7', toolbarState.blockType === 'number' && 'bg-accent text-accent-foreground')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onOutdent)} 
        className="h-7 w-7"
        title="Decrease Indent"
      >
        <IndentDecrease className="h-4 w-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(onIndent)} 
        className="h-7 w-7"
        title="Increase Indent"
      >
        <IndentIncrease className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(() => editor.dispatchCommand(UNDO_COMMAND, undefined))} 
        disabled={!toolbarState.canUndo}
        className="h-7 w-7 disabled:opacity-50"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onMouseDown={withFocus(() => editor.dispatchCommand(REDO_COMMAND, undefined))} 
        disabled={!toolbarState.canRedo}
        className="h-7 w-7 disabled:opacity-50"
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

    </div>
  )
}
