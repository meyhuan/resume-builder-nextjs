/**
 * InlineEditor is a lightweight Lexical rich-text editor for inline editing.
 */
import { useRef, useEffect } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListNode, ListItemNode } from '@lexical/list'
import { $getRoot, $isElementNode } from 'lexical'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import type { EditorState, LexicalEditor } from 'lexical'
import type { ReactElement, ReactNode } from 'react'
import React from 'react'
import InlineToolbar from './inline-toolbar'

interface InlineEditorProps {
  readonly initialHtml: string
  readonly onChange: (html: string) => void
  readonly className?: string
  readonly floatingToolbar?: boolean
  readonly onClickOutside?: () => void
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
  
  useEffect(() => {
    if (!props.onClickOutside) return

    function handleClickOutside(event: MouseEvent): void {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
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

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div ref={editorRef} className={props.className ?? ''}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="outline-none min-h-[20px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:ml-0" />
          }
          placeholder={<div className="text-gray-400">Start typing…</div>}
          ErrorBoundary={RichTextErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InlineToolbar 
          className={props.floatingToolbar ? 'absolute -bottom-10 left-0 z-20' : 'mt-2'}
        />
      </div>
    </LexicalComposer>
  )
}
