/**
 * InlineToolbar renders formatting actions for the active Lexical editor.
 */
import { useCallback } from 'react'
import type { ReactElement } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND } from 'lexical'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bold, Italic, Underline, List, ListOrdered, IndentIncrease, IndentDecrease, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface InlineToolbarProps {
  readonly className?: string
}

export default function InlineToolbar(props: InlineToolbarProps): ReactElement {
  const [editor] = useLexicalComposerContext()
  const isFloating = props.className?.includes('absolute')

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
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  }, [editor])

  const onNumberList = useCallback((): void => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }, [editor])

  const onIndent = useCallback((): void => {
    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
  }, [editor])

  const onOutdent = useCallback((): void => {
    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
  }, [editor])

  const onAlignLeft = useCallback((): void => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')
  }, [editor])

  const onAlignCenter = useCallback((): void => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')
  }, [editor])

  const onAlignRight = useCallback((): void => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')
  }, [editor])

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 print:hidden',
        isFloating ? 'bg-white shadow-md rounded px-1.5 py-1 border border-gray-200' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity',
        props.className
      )}
    >
      <Button variant="ghost" size="icon" onClick={onBold} className="h-7 w-7" title="加粗 (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onItalic} className="h-7 w-7" title="斜体 (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onUnderline} className="h-7 w-7" title="下划线 (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      <Button variant="ghost" size="icon" onClick={onBulletList} className="h-7 w-7" title="无序列表">
        <List className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onNumberList} className="h-7 w-7" title="有序列表">
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      <Button variant="ghost" size="icon" onClick={onOutdent} className="h-7 w-7" title="减少缩进">
        <IndentDecrease className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onIndent} className="h-7 w-7" title="增加缩进">
        <IndentIncrease className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      <Button variant="ghost" size="icon" onClick={onAlignLeft} className="h-7 w-7" title="左对齐">
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onAlignCenter} className="h-7 w-7" title="居中对齐">
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onAlignRight} className="h-7 w-7" title="右对齐">
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
