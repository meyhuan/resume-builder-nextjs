'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'

type PreviewIssue = 'viewer_unsupported' | 'iframe_error' | 'load_timeout' | 'user_reported_blank'

const messages: Record<PreviewIssue, string> = {
  viewer_unsupported: '当前浏览器提示不支持内嵌 PDF 预览。',
  iframe_error: 'PDF 预览加载失败。',
  load_timeout: 'PDF 预览加载时间较长，暂未确认加载完成。',
  user_reported_blank: '已记录预览空白问题。',
}

interface Props {
  pdfUrl: string
  onPreviewImage?: () => void
}

export function PdfIframePreview(props: Props) {
  const [attempt, setAttempt] = useState(0)
  return <PdfPreviewAttempt key={`${props.pdfUrl}:${attempt}`} {...props} onRetry={() => setAttempt(value => value + 1)} />
}

function PdfPreviewAttempt({ pdfUrl, onPreviewImage, onRetry }: Props & { onRetry: () => void }) {
  const [issue, setIssue] = useState<PreviewIssue | null>(null)
  const [reportedBlank, setReportedBlank] = useState(false)
  const startedAt = useRef(Date.now())
  const attemptId = useRef(`pdf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`)
  const reported = useRef(new Set<PreviewIssue>())
  const loaded = useRef(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reportIssue = useCallback((reason: PreviewIssue) => {
    setIssue(reason)
    if (reported.current.has(reason)) return
    reported.current.add(reason)
    // Reuse the supported app_error event so this is visible in the existing
    // error dashboard, without counting a preview issue as a failed download.
    track('app_error', {
      source: 'pdf_preview',
      entry: 'pc_export_preview',
      stage: 'native_pdf_viewer',
      exportType: 'pdf',
      errorType: `PdfPreview_${reason}`,
      errorMessage: messages[reason],
      failureReason: reason,
      previewAttemptId: attemptId.current,
      elapsedMs: Date.now() - startedAt.current,
      iframeLoadObserved: loaded.current,
      pdfViewerEnabled: typeof navigator.pdfViewerEnabled === 'boolean' ? navigator.pdfViewerEnabled : 'unknown',
      userAgent: navigator.userAgent.slice(0, 500),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      visibilityState: document.visibilityState,
    })
  }, [])

  useEffect(() => {
    const element = frame.current
    const handleError = () => {
      clearTimeout(timer.current)
      reportIssue('iframe_error')
    }
    // iframe error events do not bubble; listen directly on the element.
    element?.addEventListener('error', handleError)
    if (navigator.pdfViewerEnabled === false) reportIssue('viewer_unsupported')
    else if (!loaded.current) {
      timer.current = setTimeout(() => reportIssue('load_timeout'), 15000)
    }
    return () => {
      clearTimeout(timer.current)
      element?.removeEventListener('error', handleError)
    }
  }, [reportIssue])

  return (
    <>
      <div className="mb-2 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
        {issue && <p role="status" className="font-medium text-amber-800">{messages[issue]}</p>}
        <p>若预览空白，可直接确认下载 PDF 后查看，或切换图片预览。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {issue && <Button size="sm" variant="outline" onClick={onRetry}>重试预览</Button>}
          {issue && onPreviewImage && <Button size="sm" variant="outline" onClick={onPreviewImage}>切换图片预览</Button>}
          <Button size="sm" variant="ghost" disabled={reportedBlank} onClick={() => {
            setReportedBlank(true)
            clearTimeout(timer.current)
            reportIssue('user_reported_blank')
          }}>{reportedBlank ? '已记录空白问题' : '预览仍为空白？反馈问题'}</Button>
        </div>
      </div>
      <iframe
        ref={frame}
        src={pdfUrl + '#toolbar=0'}
        onLoad={() => {
          // This only confirms the frame load event, not visible PDF rendering.
          loaded.current = true
          clearTimeout(timer.current)
          setIssue(previous => previous === 'load_timeout' ? null : previous)
        }}
        className="min-h-64 w-full flex-1 border-0"
        title="PDF 预览"
      />
    </>
  )
}
