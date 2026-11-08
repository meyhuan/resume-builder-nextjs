'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2 } from 'lucide-react'
import { useExportPreview } from '@/hooks/use-export-preview'
import { ExportAssetPreview } from '@/components/export-asset-preview'
import { PdfIframePreview } from '@/components/pdf-iframe-preview'
import { ResumeLoading } from '@/components/resume-loading'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import type { ExportProgressListener } from '@/lib/export-progress'
import {
  ExportFormatOptions,
  type ExportFormat,
  EXPORT_FORMATS,
  WORD_EXPORT_UNSUPPORTED_MESSAGE,
} from './export-format-options'

interface ExportPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pdfUrl: string
  readonly pdfPageCount?: number | null
  readonly onConfirmExport: () => void
  readonly onExportPng?: (previewUrl: string) => void
  readonly onExportMarkdown?: () => void
  readonly onExportDocx?: (asset: ExportPreviewAsset) => void
  readonly confirmedWordIds?: ReadonlySet<string>
  readonly onPreviewDocx?: (
    progress?: ExportProgressListener,
  ) => Promise<ExportPreviewAsset>
  readonly previewRevision?: string
  readonly onUpgradeClick?: (format: ExportFormat) => void
  readonly onPreviewPdf?: () => void
  readonly onPreviewImage?: () => Promise<string | void>
  readonly isGenerating?: boolean
  readonly pdfGenerationFailed?: boolean
  readonly markdownContent?: string
  readonly remainingQuota?: number | 'unlimited'
  readonly isVip?: boolean
  readonly isConfirming?: boolean
  readonly placeholderCount?: number
}

export default function ExportPreviewDialog(
  props: ExportPreviewDialogProps,
): ReactElement {
  const {
    open,
    onOpenChange,
    pdfUrl,
    pdfPageCount,
    onConfirmExport,
    onExportPng,
    onExportMarkdown,
    onExportDocx,
    onUpgradeClick,
    onPreviewPdf,
    onPreviewImage,
    isGenerating,
    pdfGenerationFailed,
    markdownContent,
    remainingQuota,
    isVip,
    isConfirming,
    placeholderCount,
  } = props
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const imageRequestRef = useRef(0)
  const [imageUrl, setImageUrl] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [wordReady, setWordReady] = useState(false)
  useEffect(() => {
    imageRequestRef.current += 1
    setImageUrl('')
    setImageReady(false)
    setImageLoading(false)
    setImageError(false)
  }, [props.previewRevision])
  const word = useExportPreview(
    'docx',
    props.previewRevision || '',
    open && format === 'docx' && Boolean(onExportDocx),
    async (_format, progress) => {
      if (!props.onPreviewDocx) throw new Error('Word 预览暂不可用')
      return props.onPreviewDocx(progress)
    },
  )
  const label = EXPORT_FORMATS.find((f) => f.id === format)!.label
  const wordConfirmed = word.asset && (word.asset.confirmed || props.confirmedWordIds?.has(word.asset.id))
  const quotaDepleted = format !== 'markdown' && !isVip && remainingQuota === 0 && !(format === 'docx' && wordConfirmed)
  const needsTemplate = format === 'docx' && !onExportDocx
  const loadImage = async (): Promise<void> => {
    if (!onPreviewImage || imageLoading) return
    const requestId = ++imageRequestRef.current
    setImageLoading(true)
    setImageReady(false)
    setImageError(false)
    try {
      const url = await onPreviewImage()
      if (requestId !== imageRequestRef.current) return
      if (url) setImageUrl(url)
      else setImageError(true)
    } catch {
      if (requestId === imageRequestRef.current) setImageError(true)
    } finally {
      if (requestId === imageRequestRef.current) setImageLoading(false)
    }
  }
  const selectFormat = (next: ExportFormat): void => {
    setFormat(next)
    if (next === 'pdf' && !pdfUrl && !isGenerating) onPreviewPdf?.()
    if (next === 'image' && !imageUrl) void loadImage()
  }
  const exportSelected = (): void => {
    if (needsTemplate) {
      return
    }
    if (quotaDepleted) {
      onUpgradeClick?.(format)
      return
    }
    if (format === 'pdf') onConfirmExport()
    else if (format === 'docx' && word.asset && wordReady)
      onExportDocx?.(word.asset)
    else if (format === 'image' && imageReady) onExportPng?.(imageUrl)
    else onExportMarkdown?.()
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isConfirming) onOpenChange(next)
      }}
    >
      <DialogContent
        overlayClassName="bg-black/35"
        className="flex h-[90dvh] w-[1000px] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:max-w-[95vw]"
        onEscapeKeyDown={(e) => {
          if (isConfirming) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (isConfirming) e.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4">
          <DialogTitle>导出简历</DialogTitle>
          <DialogDescription>
            同一份简历，投递、修改、分享、内容复用都方便。
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            className="order-2 min-h-48 flex-1 overflow-auto bg-slate-100 p-3 md:order-1"
            aria-label="导出预览"
          >
            {format === 'pdf' ? (
              pdfUrl ? (
                <div className="flex h-full min-h-64 flex-col">
                  <p className="mb-2 text-xs text-slate-500">
                    实际 PDF 预览
                    {pdfPageCount != null
                      ? ' · 共 ' + pdfPageCount + ' 页'
                      : ''}
                  </p>
                  {open && <PdfIframePreview
                    key={pdfUrl}
                    pdfUrl={pdfUrl}
                    onPreviewImage={onPreviewImage ? () => selectFormat('image') : undefined}
                  />}
                </div>
              ) : (
                <div className="flex min-h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  {isGenerating ? (
                    <ResumeLoading variant="progress" title="正在生成 PDF 预览" description="正在准备导出文件，你也可以先选择其他格式" className="w-full" />
                  ) : (
                    <>
                      {pdfGenerationFailed ? (
                        <p role="alert" className="px-4 text-center text-amber-800">PDF 预览生成失败，请检查网络后重试，也可以切换图片预览。</p>
                      ) : <span>PDF 预览尚未生成</span>}
                      <Button variant="outline" onClick={onPreviewPdf}>
                        {pdfGenerationFailed ? '重试 PDF 预览' : '生成 PDF 预览'}
                      </Button>
                    </>
                  )}
                </div>
              )
            ) : format === 'image' ? (
              imageUrl ? (
                <div className="relative w-full">
                  {!imageReady && <ResumeLoading title="正在加载图片预览" description="正在显示生成的简历图片，请稍候" />}
                  <img
                    src={imageUrl}
                    onLoad={() => setImageReady(true)}
                    onError={() => {
                      setImageReady(false)
                      setImageUrl('')
                      setImageError(true)
                    }}
                    alt="实际 PNG 导出预览"
                    className={imageReady ? 'block w-full' : 'absolute inset-x-0 top-0 block w-full opacity-0'}
                  />
                </div>
              ) : imageLoading ? (
                <ResumeLoading title="正在生成图片预览" description="正在将简历排版转换为图片，请稍候" />
              ) : (
                <div className="flex min-h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  {imageError ? (
                    <p role="alert" className="px-4 text-center text-amber-800">图片预览加载失败，请检查网络后重试，也可以切换 PDF 预览。</p>
                  ) : '可将当前简历保存为 PNG 图片'}
                  {!imageLoading && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        void loadImage()
                      }}
                    >
                      {imageError ? '重试图片预览' : '生成图片预览'}
                    </Button>
                  )}
                </div>
              )
            ) : format === 'markdown' ? (
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">
                {markdownContent || '导出简历的文本内容，不包含模板视觉排版。'}
              </pre>
            ) : !needsTemplate ? (
              <ExportAssetPreview
                progress={word.progress}
                key={word.asset?.id || 'loading'}
                asset={word.asset}
                error={word.error}
                onRetry={word.retry}
                onReady={setWordReady}
              />
            ) : (
              <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl bg-white p-6 text-center">
                <FileText className="h-12 w-12 text-violet-500" />
                <h3 className="font-semibold">当前模板不支持 Word 导出</h3>
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  {WORD_EXPORT_UNSUPPORTED_MESSAGE}
                </p>
              </div>
            )}
          </div>
          <div className="order-1 flex shrink-0 flex-col gap-4 overflow-y-auto border-b border-slate-200 bg-white p-4 md:order-2 md:w-[380px] md:border-b-0 md:border-l">
            <ExportFormatOptions
              value={format}
              onChange={selectFormat}
              disabled={isConfirming}
              wordSupported={Boolean(onExportDocx)}
            />
            {!!placeholderCount && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                简历中尚有 {placeholderCount} 处 [X] 待填数据，请核对后再投递。
              </p>
            )}
            {needsTemplate ? (
              <p className="text-sm leading-6 text-slate-600">
                想保留当前排版？请选择 PDF 或图片。
              </p>
            ) : (
              <p className="text-xs leading-5 text-slate-500">
                {format === 'markdown'
                  ? 'Markdown 免费导出，不消耗导出次数。'
                  : format === 'docx' && wordConfirmed
                    ? '该 Word 文件已确认，可再次下载，不会重复扣次。'
                  : isVip
                    ? '会员权益：PDF、Word 和图片不限次导出。'
                    : quotaDepleted
                      ? '免费导出次数已用完，预览不受影响；开通会员后可导出。'
                      : typeof remainingQuota === 'number'
                        ? '剩余导出次数：' + remainingQuota + ' 次。'
                        : '预览不消耗次数，确认导出时核验额度。'}
                {format === 'docx' && ' Word 与 PDF 共用导出额度。'}
              </p>
            )}
            <Button
              className="mt-auto h-11 w-full"
              disabled={
                isConfirming ||
                needsTemplate ||
                (!needsTemplate &&
                  !quotaDepleted &&
                  // Embedded PDF support varies by browser; the generated file
                  // remains downloadable even when the iframe never loads.
                  ((format === 'pdf' && !pdfUrl) ||
                    (format === 'image' && !imageReady) ||
                    (format === 'docx' && (!word.asset || !wordReady))))
              }
              onClick={exportSelected}
            >
              {isConfirming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isConfirming
                ? '正在导出…'
                : needsTemplate
                  ? '当前模板不支持 Word'
                  : quotaDepleted
                    ? '开通会员，导出 ' + label
                    : '确认下载 ' + label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
