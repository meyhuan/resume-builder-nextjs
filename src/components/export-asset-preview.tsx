'use client'

import { useEffect, useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import { Button } from '@/components/ui/button'
import {
  EXPORT_PROGRESS,
  type ExportProgressStage,
} from '@/lib/export-progress'

interface ExportAssetPreviewProps {
  asset?: ExportPreviewAsset
  error?: string
  onRetry: () => void
  onReady: (ready: boolean) => void
  progress?: ExportProgressStage
  fillHeight?: boolean
}

export function ExportAssetPreview(props: ExportAssetPreviewProps) {
  // Each file (or new attempt after an error) owns its readiness and timer.
  return <ExportAssetPreviewContent key={props.asset ? `asset:${props.asset.id}` : `loading:${props.error || ''}`} {...props} />
}

function ExportAssetPreviewContent({ asset, error, onRetry, onReady, progress = 'preparing', fillHeight = false }: ExportAssetPreviewProps) {
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [loaded, setLoaded] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (asset || error) return
    const start = Date.now()
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    )
    return () => clearInterval(timer)
  }, [asset, error])
  const urls =
    asset?.type === 'image'
      ? [asset.downloadUrl + '?inline=1']
      : asset?.previewImages || []
  const textReady =
    asset?.type === 'markdown' && typeof asset.markdownContent === 'string'
  useEffect(() => {
    onReady(
      Boolean(
        asset &&
          !failed &&
          !error &&
          (textReady || (urls.length > 0 && loaded.size === urls.length)),
      ),
    )
  }, [asset, failed, error, textReady, urls.length, loaded, onReady])
  const missing = asset && !textReady && urls.length === 0
  if (error || failed || missing)
    return (
      <div role="alert" className="p-5 text-center text-sm text-slate-600">
        <p>{error || '预览加载失败，请重试'}</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          重新生成预览
        </Button>
      </div>
    )
  if (!asset)
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-2 p-8 text-center text-sm text-slate-500"
      >
        <p className="font-medium text-slate-700">
          {EXPORT_PROGRESS[progress]}
        </p>
        <p>已等待 {elapsed} 秒 · 预览不扣除导出次数</p>
        {elapsed >= 15 && (
          <p className="text-xs">
            首次启动或内容较多时需要更久，请稍候。你也可以切换其他格式。
          </p>
        )}
      </div>
    )
  if (textReady)
    return (
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-4 text-xs leading-6">
        {asset.markdownContent}
      </pre>
    )
  return (
    <div className={`relative ${fillHeight ? 'h-full min-h-0' : ''}`}>
      <Button
        className={`absolute right-3 z-10 h-11 w-11 rounded-full border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur md:hidden [&_svg]:size-5 ${fillHeight ? 'bottom-3' : 'top-3'}`}
        variant="outline"
        size="icon"
        aria-label={zoomed ? '适应宽度' : '放大预览'}
        title={zoomed ? '适应宽度' : '放大预览'}
        aria-pressed={zoomed}
        onClick={() => setZoomed((value) => !value)}
      >
        {zoomed ? (
          <ZoomOut aria-hidden="true" />
        ) : (
          <ZoomIn aria-hidden="true" />
        )}
      </Button>
      <div
        data-export-preview-pages
        className={`flex flex-col gap-3 ${fillHeight ? 'h-full overflow-auto overscroll-contain' : ''}`}
      >
        {!textReady && loaded.size < urls.length && (
          <p role="status" className="text-center text-xs text-slate-500">
            {EXPORT_PROGRESS.loading}
          </p>
        )}
        {asset.type === 'docx' && (
          <p className="order-last text-xs leading-5 text-slate-500 md:order-first">
            由本次 Word 文件生成的分页预览。不同版本 Word / WPS
            的字体和分页可能略有差异。
          </p>
        )}
        {urls.map((url, index) => (
          <figure key={url}>
            <img
              src={url}
              alt={`${asset.type === 'docx' ? 'Word' : asset.type === 'pdf' ? 'PDF' : 'PNG'} 预览第 ${index + 1} 页`}
              className={`w-full bg-white shadow-sm ${zoomed ? 'min-w-[720px] max-w-none' : ''}`}
              onLoad={() =>
                setLoaded((previous) => new Set(previous).add(index))
              }
              onError={() => setFailed(true)}
            />
            <figcaption className="mt-1 text-center text-xs text-slate-500">
              {index + 1} / {urls.length}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
