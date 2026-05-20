'use client'

import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode } from '@lexical/list'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import type { EditorState, LexicalEditor } from 'lexical'
import { Bold, Italic, List, ListOrdered, Redo2, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MobileRichTextareaProps {
  readonly label: string
  readonly html: string
  readonly onHtmlChange: (next: string) => void
  readonly placeholder?: string
  readonly tip?: string
  readonly required?: boolean
  readonly error?: string
  readonly minHeight?: number
  /** Extra toolbar content rendered on the right-hand side (e.g. AI polish). */
  readonly extraToolbar?: ReactNode
}

const theme = {
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
  list: {
    ul: 'list-disc pl-5 space-y-0.5',
    ol: 'list-decimal pl-5 space-y-0.5',
    listitem: 'ml-0',
  },
  paragraph: 'mb-1.5',
}

/**
 * Lightweight Lexical-based rich text editor tuned for mobile editing.
 *
 * Supports: bold, italic, bullet/ordered lists, undo/redo. Emits HTML on change.
 */
export function MobileRichTextarea(props: MobileRichTextareaProps): ReactElement {
  const { label, html, onHtmlChange, placeholder, tip, required, error, minHeight = 120, extraToolbar } = props
  const hasContent: boolean = html.trim().length > 0
  const initialHtmlRef = useRef<string>(html)
  const [focused, setFocused] = useState<boolean>(false)
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = (): void => {
      const offset = window.innerHeight - vv.height - vv.offsetTop
      setKeyboardOffset(Math.max(0, offset))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return (): void => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const initialConfig: InitialConfigType = {
    namespace: 'mobile-rich-textarea',
    theme,
    nodes: [ListNode, ListItemNode],
    onError: (err: Error): void => {
      console.error('[mobile-rich-textarea]', err)
    },
    editorState: (editor: LexicalEditor): void => {
      const initial: string = initialHtmlRef.current
      if (!initial) return
      const dom: Document = new DOMParser().parseFromString(initial, 'text/html')
      editor.update(() => {
        const nodes = $generateNodesFromDOM(editor, dom)
        const root = $getRoot()
        root.clear()
        const elementNodes = nodes.filter((n) => $isElementNode(n))
        if (elementNodes.length > 0) root.append(...elementNodes)
      })
    },
  }

  const lastEmittedHtmlRef = useRef<string>(html)

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor): void => {
      editorState.read(() => {
        const nextHtml: string = $generateHtmlFromNodes(editor)
        lastEmittedHtmlRef.current = nextHtml
        if (nextHtml !== html) onHtmlChange(nextHtml)
      })
    },
    [html, onHtmlChange],
  )

  return (
    <div className="block">
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
        <button
          type="button"
          onClick={(): void => onHtmlChange('')}
          disabled={!hasContent}
          className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-rose-50 text-rose-500 border-rose-200 active:bg-rose-100"
          aria-label="清除内容"
        >
          <Trash2 size={11} />
          一键清空
        </button>
      </div>
      <LexicalComposer initialConfig={initialConfig}>
        <ExternalHtmlSync html={html} lastEmittedHtmlRef={lastEmittedHtmlRef} />
        <div
          className={cn(
            'rounded-xl border bg-white transition-all',
            'focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100',
            error ? 'border-rose-400' : 'border-slate-200',
          )}
        >
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="outline-none px-3.5 py-3 text-[15px] text-slate-900 leading-relaxed"
                  style={{ minHeight }}
                  aria-label={label}
                />
              }
              placeholder={
                <div className="pointer-events-none absolute top-0 left-0 px-3.5 py-3 text-[15px] text-slate-400 whitespace-pre-wrap">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          {/* Spacer keeps layout space when toolbar is fixed */}
          {focused && <div className="h-10" />}
          <FocusPlugin onFocus={(): void => setFocused(true)} onBlur={(): void => setFocused(false)} />
          <div
            className={cn(
              'border-t border-slate-100 px-1.5 py-1 flex flex-col gap-1 bg-white',
              focused && 'fixed left-0 right-0 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]',
            )}
            style={focused ? { bottom: keyboardOffset } : undefined}
          >
            <div className="flex items-center gap-1 overflow-x-auto">
              <FormatToolbar />
            </div>
            {extraToolbar && (
              <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
                {extraToolbar}
              </div>
            )}
          </div>
        </div>
      </LexicalComposer>
      {error && <div className="mt-1 px-1 text-xs text-rose-500">{error}</div>}
      {!error && tip && <div className="mt-1 px-1 text-xs text-slate-400">💡 {tip}</div>}
    </div>
  )
}

/**
 * Keeps the Lexical editor in sync when the `html` prop changes from outside
 * the component (e.g. quick-add buttons that append content programmatically).
 *
 * Uses `lastEmittedHtmlRef` (written by the editor's own onChange) to know
 * whether the change originated inside the editor. If so, skip to avoid loops.
 */
function FocusPlugin({ onFocus, onBlur }: { readonly onFocus: () => void; readonly onBlur: () => void }): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    return mergeRegister(
      editor.registerRootListener((rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener('focus', onFocus)
        prevRootElement?.removeEventListener('blur', onBlur)
        rootElement?.addEventListener('focus', onFocus)
        rootElement?.addEventListener('blur', onBlur)
      }),
    )
  }, [editor, onFocus, onBlur])
  return null
}

function ExternalHtmlSync({
  html,
  lastEmittedHtmlRef,
}: {
  readonly html: string
  readonly lastEmittedHtmlRef: React.MutableRefObject<string>
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (html === lastEmittedHtmlRef.current) return

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      if (!html) {
        lastEmittedHtmlRef.current = html
        return
      }
      const dom: Document = new DOMParser().parseFromString(html, 'text/html')
      const nodes = $generateNodesFromDOM(editor, dom)
      const elementNodes = nodes.filter((n) => $isElementNode(n))
      if (elementNodes.length > 0) root.append(...elementNodes)
      lastEmittedHtmlRef.current = html
    })
  }, [html, editor, lastEmittedHtmlRef])

  return null
}

interface ToolbarState {
  readonly isBold: boolean
  readonly isItalic: boolean
  readonly blockType: 'paragraph' | 'bullet' | 'number'
  readonly canUndo: boolean
  readonly canRedo: boolean
}

const INITIAL_STATE: ToolbarState = {
  isBold: false,
  isItalic: false,
  blockType: 'paragraph',
  canUndo: false,
  canRedo: false,
}

/**
 * Inline toolbar with formatting actions. Kept compact for phone width.
 */
function FormatToolbar(): ReactElement {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<ToolbarState>(INITIAL_STATE)

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return
          const isBold: boolean = selection.hasFormat('bold')
          const isItalic: boolean = selection.hasFormat('italic')
          const anchor = selection.anchor.getNode()
          const element = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow()
          let blockType: ToolbarState['blockType'] = 'paragraph'
          if ($isListNode(element)) {
            const parent = $findMatchingParent(anchor, $isListNode) as ListNode | null
            blockType = parent?.getListType() === 'number' ? 'number' : 'bullet'
          }
          setState((prev) => ({ ...prev, isBold, isItalic, blockType }))
        })
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setState((prev) => ({ ...prev, canUndo: payload }))
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setState((prev) => ({ ...prev, canRedo: payload }))
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  }, [editor])

  const btnCls = (active: boolean): string =>
    cn(
      'h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-colors',
      active ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100',
    )

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => void editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={btnCls(state.isBold)}
        aria-label="加粗"
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => void editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={btnCls(state.isItalic)}
        aria-label="斜体"
      >
        <Italic size={14} />
      </button>
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => {
          if (state.blockType === 'bullet') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
          else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }}
        className={btnCls(state.blockType === 'bullet')}
        aria-label="项目符号"
      >
        <List size={14} />
      </button>
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => {
          if (state.blockType === 'number') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
          else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }}
        className={btnCls(state.blockType === 'number')}
        aria-label="编号列表"
      >
        <ListOrdered size={14} />
      </button>
      <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => void editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!state.canUndo}
        className={cn(btnCls(false), 'disabled:opacity-40')}
        aria-label="撤销"
      >
        <Undo2 size={14} />
      </button>
      <button
        type="button"
        onMouseDown={(e): void => e.preventDefault()}
        onClick={(): void => void editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!state.canRedo}
        className={cn(btnCls(false), 'disabled:opacity-40')}
        aria-label="重做"
      >
        <Redo2 size={14} />
      </button>
    </div>
  )
}
