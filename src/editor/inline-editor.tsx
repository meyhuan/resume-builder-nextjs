/**
 * InlineEditor is a lightweight Lexical rich-text editor for inline editing.
 */
import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListNode, ListItemNode } from '@lexical/list'
import { $getRoot, $isElementNode, $getNearestNodeFromDOMNode, $isTextNode } from 'lexical'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import type { EditorState, LexicalEditor } from 'lexical'
import type { ReactElement, ReactNode } from 'react'
import React from 'react'
import InlineToolbar from './inline-toolbar'
import { useResumeActionDock } from '@/components/blocks/resume-action-dock'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

export interface InlineFocusPoint { readonly x: number; readonly y: number }

interface InlineEditorProps {
  readonly initialHtml: string
  readonly onChange: (html: string) => void
  readonly className?: string
  readonly floatingToolbar?: boolean
  readonly onClickOutside?: () => void
  readonly onEscape?: () => void
  readonly initialFocusPoint?: InlineFocusPoint | null
}

/** Resolve the original click against the mounted editor, including formatted text. */
function InitialFocus({ point }: { readonly point?: InlineFocusPoint | null }): null {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    let active = true
    editor.focus(() => {
      if (!active || !point) return
      const root = editor.getRootElement()
      if (!root) return
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
  }, [editor, point])
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
  const dock = useResumeActionDock()
  const docked = Boolean(dock?.host && props.floatingToolbar)
  
  useEffect(() => {
    if (!props.onClickOutside) return

    function handleClickOutside(event: MouseEvent): void {
      if (editorRef.current && !editorRef.current.contains(event.target as Node) && !toolbarRef.current?.contains(event.target as Node)) {
        props.onClickOutside?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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
    className={docked ? 'resume-inline-toolbar-docked' : 'mt-2 print:hidden'}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        editorRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true })
      }
    }}>
    {docked ? <span className="resume-action-context mr-auto pr-3 text-xs font-medium text-slate-600">
      {dock?.activeLabel || '正文'} · 编辑中
    </span> : null}
    <InlineToolbar docked={docked} className="resume-inline-toolbar-buttons" />
    {props.onEscape || props.onClickOutside ? <Button type="button" variant="ghost" size="sm"
      className="h-8 gap-1 px-2 text-xs" aria-label="完成正文编辑"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => (props.onEscape ?? props.onClickOutside)?.()}>
      <Check size={14} />完成
    </Button> : null}
  </div>

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div ref={editorRef} className={props.className ?? ''}
        onKeyDown={(event) => {
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
        <InitialFocus point={props.initialFocusPoint} />
        {dock?.host && props.floatingToolbar ? createPortal(toolbar, dock.host) : toolbar}
      </div>
    </LexicalComposer>
  )
}
