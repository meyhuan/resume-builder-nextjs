/**
 * InlineEditor is a lightweight Lexical rich-text editor for inline editing.
 */
import { useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListNode, ListItemNode } from '@lexical/list'
import { $getRoot, $isElementNode, $getNearestNodeFromDOMNode, $isTextNode, $createRangeSelection, $setSelection } from 'lexical'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import type { EditorState, LexicalEditor } from 'lexical'
import type { ReactElement, ReactNode } from 'react'
import React from 'react'
import InlineToolbar from './inline-toolbar'
import { useBlockEditingActions } from '@/components/blocks/resume-action-dock'
import { useAnchoredToolbar } from './use-anchored-toolbar'
import { Button } from '@/components/ui/button'
import { Sparkles, Wand2 } from 'lucide-react'
import { findInlineTextPosition, type InlineTextSelection } from './inline-selection'

export interface InlineFocusPoint { readonly x: number; readonly y: number }

interface InlineEditorProps {
  readonly initialHtml: string
  readonly onChange: (html: string) => void
  readonly className?: string
  readonly floatingToolbar?: boolean
  readonly onClickOutside?: () => void
  readonly onEscape?: () => void
  readonly initialFocusPoint?: InlineFocusPoint | null
  readonly initialSelection?: InlineTextSelection | null
}

/** Resolve the original click against the mounted editor, including formatted text. */
function InitialFocus({ point, selection }: { readonly point?: InlineFocusPoint | null; readonly selection?: InlineTextSelection | null }): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    let active = true
    editor.focus(() => {
      if (!active) return
      const root = editor.getRootElement()
      if (!root) return
      if (selection) {
        const anchor = findInlineTextPosition(root, selection.anchor)
        const focus = findInlineTextPosition(root, selection.focus)
        if (anchor && focus) editor.update(() => {
          const anchorNode = $getNearestNodeFromDOMNode(anchor.node)
          const focusNode = $getNearestNodeFromDOMNode(focus.node)
          if (!$isTextNode(anchorNode) || !$isTextNode(focusNode)) return
          const range = $createRangeSelection()
          range.anchor.set(anchorNode.getKey(), anchor.offset, 'text')
          range.focus.set(focusNode.getKey(), focus.offset, 'text')
          $setSelection(range)
        })
        return
      }
      if (!point) return
      const doc = root.ownerDocument as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
        caretRangeFromPoint?: (x: number, y: number) => Range | null
      }
      const position = doc.caretPositionFromPoint?.(point.x, point.y)
      const range = position ? null : doc.caretRangeFromPoint?.(point.x, point.y)
      const node = position?.offsetNode ?? range?.startContainer
      const offset = position?.offset ?? range?.startOffset ?? 0
      if (!node || !root.contains(node)) return
      editor.update(() => {
        const text = $getNearestNodeFromDOMNode(node)
        if ($isTextNode(text)) {
          const caretOffset = Math.min(offset, text.getTextContentSize())
          text.select(caretOffset, caretOffset)
        }
      })
    }, { defaultSelection: 'rootStart' })
    return () => { active = false }
  }, [editor, point, selection])
  return null
}

interface ErrorBoundaryProps {
  children: ReactElement
  onError: (error: Error) => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

class RichTextErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error): void {
    this.props.onError(error)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <div className="text-red-600 text-sm">Editor crashed. Please reload.</div>
    }
    return this.props.children
  }
}

export default function InlineEditor(props: InlineEditorProps): ReactElement {
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const pendingToolbarFocus = useRef(false)
  const floating = Boolean(props.floatingToolbar)
  const toolbarStyle = useAnchoredToolbar(editorRef, toolbarRef, floating)
  const { onPolish, onGenerate } = useBlockEditingActions()

  useLayoutEffect(() => {
    if (!pendingToolbarFocus.current || toolbarStyle.visibility !== 'visible') return
    pendingToolbarFocus.current = false
    // Wait for the positioning update to commit; hidden buttons cannot receive focus.
    toolbarRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [toolbarStyle])
  
  useEffect(() => {
    if (!props.onClickOutside) return

    function handleInteractionOutside(event: MouseEvent | FocusEvent): void {
      if (editorRef.current && !editorRef.current.contains(event.target as Node) && !toolbarRef.current?.contains(event.target as Node)) {
        props.onClickOutside?.()
      }
    }

    document.addEventListener('mousedown', handleInteractionOutside)
    document.addEventListener('focusin', handleInteractionOutside)
    return () => {
      document.removeEventListener('mousedown', handleInteractionOutside)
      document.removeEventListener('focusin', handleInteractionOutside)
    }
  }, [props])

  const theme = {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'line-through',
    },
  }

  const initialConfig: InitialConfigType = {
    namespace: 'resume-inline-editor',
    theme,
    nodes: [ListNode, ListItemNode],
    onError(error: Error): void {
      // surface lexical errors for visibility
      console.error(error)
      throw error
    },
    editorState: (editor: LexicalEditor): void => {
      if (!props.initialHtml) {
        return
      }
      const parser: DOMParser = new DOMParser()
      const dom: Document = parser.parseFromString(props.initialHtml, 'text/html')
      editor.update(() => {
        const nodes = $generateNodesFromDOM(editor, dom)
        const root = $getRoot()
        root.clear()
        // Filter to only append element nodes (not text nodes)
        const elementNodes = nodes.filter((node) => $isElementNode(node))
        if (elementNodes.length > 0) {
          root.append(...elementNodes)
        }
      })
    },
  }

  function handleChange(editorState: EditorState, editor: LexicalEditor): void {
    editorState.read(() => {
      const html: string = $generateHtmlFromNodes(editor)
      props.onChange(html)
    })
  }

  const toolbar = <div ref={toolbarRef} data-resume-inline-toolbar="true" data-export-hide="true"
    className={floating ? 'resume-context-format-toolbar' : 'mt-2 print:hidden'}
    style={floating ? toolbarStyle : undefined}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        editorRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true })
      }
    }}>
    <InlineToolbar docked={floating} className="resume-inline-toolbar-buttons" />
    {(onPolish || onGenerate) ? <Button variant="ghost" size="sm"
      className="resume-context-ai-button" aria-label={onPolish ? 'AI润色' : 'AI帮我写'}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => { props.onClickOutside?.(); (onPolish ?? onGenerate)?.() }}>
      {onPolish ? <Sparkles className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
      {onPolish ? 'AI润色' : 'AI帮我写'}
    </Button> : null}
  </div>

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div ref={editorRef} className={props.className ?? ''}
        onKeyDown={(event) => {
          if (event.altKey && event.key === 'F10' && floating) {
            event.preventDefault()
            event.stopPropagation()
            const focusFormats = (): void => {
              toolbarRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
            }
            if (toolbarRef.current && getComputedStyle(toolbarRef.current).visibility === 'hidden') {
              pendingToolbarFocus.current = true
              editorRef.current?.scrollIntoView({ block: 'center' })
            } else focusFormats()
          }
          if (props.onEscape && event.key === 'Escape' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault()
            event.stopPropagation()
            props.onEscape()
          }
        }}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable aria-label="经历正文" className="outline-none min-h-[20px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:ml-0" />
          }
          placeholder={<div className="text-gray-400">点击填写内容</div>}
          ErrorBoundary={RichTextErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitialFocus point={props.initialFocusPoint} selection={props.initialSelection} />
        {floating && typeof document !== 'undefined' ? createPortal(toolbar, document.body) : toolbar}
      </div>
    </LexicalComposer>
  )
}
