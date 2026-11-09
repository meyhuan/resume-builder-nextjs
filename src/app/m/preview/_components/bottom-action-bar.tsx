'use client'

import type { ExportRetention } from '@/hooks/use-export-retention'
import { ExportRetentionCard } from '@/components/vip/export-retention-card'

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { ArrowLeft, FileDown, Loader2, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useExportPreview } from '@/hooks/use-export-preview'
import { useExportPreviewNavigation } from '@/hooks/use-export-preview-navigation'
import { ExportAssetPreview } from '@/components/export-asset-preview'
import type { ExportPreviewAsset } from '@/lib/export-preview'
import type { ExportProgressListener } from '@/lib/export-progress'
import { Button } from '@/components/ui/button'
import {
  ExportFormatOptions,
  EXPORT_FORMATS,
  WORD_EXPORT_UNSUPPORTED_MESSAGE,
  type ExportFormat,
} from '@/components/export-format-options'

interface BottomActionBarProps {
  readonly retention?: ExportRetention
  readonly loadingContent?: ReactNode
  readonly onOpenSettings: () => void
  readonly onPrepareExport: (
    format: ExportFormat,
    progress?: ExportProgressListener,
  ) => Promise<ExportPreviewAsset>
  readonly onConfirmExport: (asset: ExportPreviewAsset) => Promise<void>
  readonly onRequestMembership?: () => void
  readonly previewRevision: string
  readonly wordSupported: boolean
  readonly wordClientSupported: boolean
  readonly showMarkdownExport?: boolean
  readonly isExporting: boolean
  readonly inMiniProgram?: boolean
  readonly exportQuota?: Pick<ExportPreviewAsset, 'remaining' | 'isVip'>
  readonly confirmedExportIds?: ReadonlySet<string>
  readonly onRefreshQuota?: () => void
}

export function BottomActionBar(props: BottomActionBarProps): ReactElement {
  const {
    onOpenSettings,
    onPrepareExport,
    onConfirmExport,
    previewRevision,
    wordSupported,
    wordClientSupported,
    showMarkdownExport = true,
    isExporting,
    inMiniProgram = false,
  } = props
  const { open, openPreview, closePreview } = useExportPreviewNavigation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const unsupportedClient =
    (format === 'docx' && !wordClientSupported) ||
    (format === 'markdown' && !showMarkdownExport)
  const needsTemplate = format === 'docx' && !wordSupported
  const [ready, setReady] = useState(false)
  const preview = useExportPreview(
    format,
    previewRevision,
    open && !unsupportedClient && !needsTemplate,
    onPrepareExport,
  )
  const selectedFormat = EXPORT_FORMATS.find((f) => f.id === format)!
  const label = selectedFormat.label
  const exportQuota = props.exportQuota ?? preview.asset
  const confirmed = preview.asset && (preview.asset.confirmed || props.confirmedExportIds?.has(preview.asset.id))
  const quotaDepleted = format !== 'markdown' && !exportQuota?.isVip && exportQuota?.remaining === 0 && !confirmed
  const canOpenMembership = quotaDepleted && Boolean(props.onRequestMembership)
  const retention = props.retention
  const retentionEligible = quotaDepleted && !needsTemplate && !unsupportedClient
  const setPreviewContext = retention?.setPreviewContext
  useEffect(() => { setPreviewContext?.(open, retentionEligible, format) }, [open, retentionEligible, format, setPreviewContext])
  useEffect(() => () => { setPreviewContext?.(false, false, '') }, [setPreviewContext])
  const showRetention = retention?.enabled && retention.status === 'visible' && retentionEligible
  const submit = async (): Promise<void> => {
    if (unsupportedClient) return
    if (needsTemplate) {
      return
    }
    if (quotaDepleted && props.onRequestMembership) {
      props.onRequestMembership()
      return
    }
    if (preview.asset && ready) await onConfirmExport(preview.asset)
  }
  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-sm backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={isExporting}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-medium text-slate-700"
          >
            <Settings2 size={18} />
            样式
          </button>
          <button
            type="button"
            onClick={() => {
              openPreview()
              props.onRefreshQuota?.()
              setFormat('pdf')
              setReady(false)
            }}
            disabled={isExporting}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileDown size={18} />
            )}
            导出简历
          </button>
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isExporting) {
            if (next) openPreview()
            else closePreview()
          }
        }}
      >
        <DialogContent
          ref={dialogRef}
          tabIndex={-1}
          onOpenAutoFocus={event => {
            event.preventDefault()
            dialogRef.current?.focus()
          }}
          hideCloseButton
          className="left-0 top-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 outline-none"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
          onEscapeKeyDown={(e) => {
            if (isExporting) e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            // This dialog is a full-screen page. A touch on the sibling payment
            // sheet must not dismiss it when Radix defers outside-touch handling
            // until the click (after that sheet may already have closed).
            e.preventDefault()
          }}
        >
          <div
            className={
              inMiniProgram
                ? 'contents'
                : 'relative flex h-13 shrink-0 items-center justify-center border-b border-slate-100 px-14'
            }
          >
            {!inMiniProgram && (
              <button
                type="button"
                aria-label="返回简历"
                disabled={isExporting}
                onClick={closePreview}
                className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <DialogTitle className={inMiniProgram ? 'sr-only' : 'text-base'}>
              导出预览
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            选择适合投递、修改或分享的格式。
          </DialogDescription>
          <>
            {!unsupportedClient && !needsTemplate && (
              <div
                className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 p-2"
                aria-label="导出预览"
              >
                <ExportAssetPreview
                  fillHeight
                  loadingContent={props.loadingContent}
                  canOpenMembership={canOpenMembership}
                  progress={preview.progress}
                  key={preview.asset?.id || 'loading'}
                  asset={preview.asset}
                  error={preview.error}
                  onRetry={preview.retry}
                  onReady={setReady}
                />
              </div>
            )}
            {(unsupportedClient || needsTemplate) && (
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-slate-50 px-8 py-6 text-center text-sm leading-7 text-slate-600">
                {unsupportedClient ? (
                  '当前小程序版本暂不支持此格式，请更新小程序后重试。'
                ) : (
                  <p>{WORD_EXPORT_UNSUPPORTED_MESSAGE}</p>
                )}
              </div>
            )}
            <div
              className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 pt-2"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              {showRetention && retention ? <ExportRetentionCard retention={retention} /> : preview.asset &&
                !unsupportedClient &&
                !needsTemplate &&
                format !== 'markdown' && (
                  <p className="shrink-0 text-xs text-slate-500">
                      {confirmed
                        ? '该文件已确认，可继续导出，不会重复扣次。'
                        : exportQuota?.isVip
                      ? '会员不限次导出'
                      : quotaDepleted
                        ? '免费导出次数已用完，预览不受影响；开通会员后可导出。'
                        : typeof exportQuota?.remaining === 'number'
                          ? `剩余 ${exportQuota.remaining} 次，确认后扣除 1 次`
                          : '预览不消耗次数，确认导出时核验额度。'}
                  </p>
                )}
              <ExportFormatOptions
                compact
                value={format}
                onChange={(next) => {
                  if (next !== format) {
                    setReady(false)
                    setFormat(next)
                  }
                }}
                disabled={isExporting}
                wordSupported={wordSupported}
                wordClientSupported={wordClientSupported}
                markdownSupported={showMarkdownExport}
              />
              <Button
                className="h-12 w-full shrink-0"
                disabled={
                  isExporting ||
                  needsTemplate ||
                  unsupportedClient ||
                  (!canOpenMembership && (!preview.asset || !ready))
                }
                onClick={() => {
                  void submit()
                }}
              >
                {isExporting
                  ? '正在准备…'
                  : unsupportedClient
                    ? '请更新小程序'
                    : needsTemplate
                      ? '当前模板不支持 Word'
                      : quotaDepleted
                        ? '开通会员，导出 ' + label
                        : '确认导出 ' + label}
              </Button>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </>
  )
}
