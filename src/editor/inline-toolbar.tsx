/**
 * InlineToolbar renders formatting actions for the active Lexical editor.
 */
import { useCallback } from 'react'
import type { ReactElement } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND } from 'lexical'
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list'
import clsx from 'clsx'

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
      {/* 加粗 */}
      <button 
        type="button" 
        onClick={onBold} 
        className="p-1.5 text-sm rounded hover:bg-gray-100 transition-colors font-bold"
        title="加粗 (Ctrl+B)"
      >
        B
      </button>

      {/* 斜体 */}
      <button 
        type="button" 
        onClick={onItalic} 
        className="p-1.5 text-sm rounded hover:bg-gray-100 transition-colors italic"
        title="斜体 (Ctrl+I)"
      >
        I
      </button>

      {/* 下划线 */}
      <button 
        type="button" 
        onClick={onUnderline} 
        className="p-1.5 text-sm rounded hover:bg-gray-100 transition-colors underline"
        title="下划线 (Ctrl+U)"
      >
        U
      </button>

      <div className="w-px h-4 bg-gray-300 mx-0.5" />

      {/* 无序列表 */}
      <button 
        type="button" 
        onClick={onBulletList} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="无序列表"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <circle cx="4" cy="6" r="1" fill="currentColor"/>
          <circle cx="4" cy="12" r="1" fill="currentColor"/>
          <circle cx="4" cy="18" r="1" fill="currentColor"/>
        </svg>
      </button>

      {/* 有序列表 */}
      <button 
        type="button" 
        onClick={onNumberList} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="有序列表"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="6" x2="21" y2="6"/>
          <line x1="10" y1="12" x2="21" y2="12"/>
          <line x1="10" y1="18" x2="21" y2="18"/>
          <text x="3" y="8" fontSize="8" fill="currentColor" fontFamily="sans-serif">1.</text>
          <text x="3" y="14" fontSize="8" fill="currentColor" fontFamily="sans-serif">2.</text>
          <text x="3" y="20" fontSize="8" fill="currentColor" fontFamily="sans-serif">3.</text>
        </svg>
      </button>

      <div className="w-px h-4 bg-gray-300 mx-0.5" />

      {/* 减少缩进 */}
      <button 
        type="button" 
        onClick={onOutdent} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="减少缩进"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <polyline points="5,12 2,9 5,6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* 增加缩进 */}
      <button 
        type="button" 
        onClick={onIndent} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="增加缩进"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <polyline points="2,12 5,15 2,18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="w-px h-4 bg-gray-300 mx-0.5" />

      {/* 左对齐 */}
      <button 
        type="button" 
        onClick={onAlignLeft} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="左对齐"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="15" y2="12"/>
          <line x1="3" y1="18" x2="18" y2="18"/>
        </svg>
      </button>

      {/* 居中对齐 */}
      <button 
        type="button" 
        onClick={onAlignCenter} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="居中对齐"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="6" y1="12" x2="18" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>

      {/* 右对齐 */}
      <button 
        type="button" 
        onClick={onAlignRight} 
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="右对齐"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="9" y1="12" x2="21" y2="12"/>
          <line x1="6" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
