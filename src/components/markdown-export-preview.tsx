'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import styles from './markdown-export-preview.module.css'

/** Both views use the exact export content; switching never regenerates the file. */
export function MarkdownExportPreview({ content }: { content: string }) {
  return (
    <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <TabsList aria-label="Markdown 查看方式">
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="source">源码</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-auto overscroll-contain p-4" aria-label="Markdown 预览">
        <div className={styles.content}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
            a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            table: ({ node: _node, ...props }) => <div className={styles.tableScroll}><table {...props} /></div>,
          }}>{content}</ReactMarkdown>
        </div>
      </TabsContent>
      <TabsContent value="source" className="m-0 min-h-0 flex-1 overflow-auto overscroll-contain p-4" aria-label="Markdown 源码">
        <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-normal text-slate-700">{content}</pre>
      </TabsContent>
    </Tabs>
  )
}
