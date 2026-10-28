'use client'

import type { ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Eye, AlertCircle, Crown, Image as ImageIcon, FileText } from 'lucide-react'

interface ExportPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pdfUrl: string
  readonly pdfPageCount?: number | null
  readonly onConfirmExport: () => void
  readonly onExportPng?: () => void
  readonly onExportMarkdown?: () => void
  readonly onExportDocx?: () => void
  readonly onUpgradeClick?: () => void
  readonly remainingQuota?: number | 'unlimited'
  readonly isVip?: boolean
  readonly isConfirming?: boolean
  readonly placeholderCount?: number
}

export default function ExportPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  pdfPageCount,
  onConfirmExport,
  onExportPng,
  onExportMarkdown,
  onExportDocx,
  onUpgradeClick,
  remainingQuota,
  isVip,
  isConfirming,
  placeholderCount,
}: ExportPreviewDialogProps): ReactElement {
  const isQuotaDepleted = !isVip && remainingQuota === 0
  const showLowQuotaWarning = !isVip && typeof remainingQuota === 'number' && remainingQuota <= 1
  const helperText = isVip
    ? '会员权益：高清 PDF 导出'
    : isQuotaDepleted
      ? '免费导出次数已用完，开通会员后可立即导出当前 PDF'
      : '免费用户限 1 次 PDF 导出，会员可高清导出当前简历'

  const handlePrimaryAction = (): void => {
    if (isQuotaDepleted) {
      onUpgradeClick?.()
      return
    }
    onConfirmExport()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/35"
        className="max-w-[calc(100vw-1rem)] sm:max-w-[90vw] w-[900px] h-[90dvh] flex flex-col p-0 gap-0 bg-slate-50"
      >
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            <DialogTitle className="text-base">PDF 预览</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {pdfPageCount != null ? `实际 PDF 共 ${pdfPageCount} 页，确认无误后继续导出` : '以下为实际生成的 PDF，确认无误后继续导出'}
          </DialogDescription>
          {placeholderCount && placeholderCount > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>简历中尚有 <strong>{placeholderCount}</strong> 处 [X] 待填数据，请确认是否已核对后再投递。</span>
            </div>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="PDF 预览"
            />
          ) : null}
        </div>

        <DialogFooter className="px-4 sm:px-5 py-3 border-t border-slate-200 shrink-0 bg-white flex-col sm:flex-col items-stretch gap-3 sm:space-x-0 max-h-[45dvh] overflow-y-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {!isVip && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${showLowQuotaWarning ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                {showLowQuotaWarning && <AlertCircle className="w-3 h-3" />}
                <span>
                  {isQuotaDepleted ? '免费导出次数已用完' : '剩余导出次数：'}
                  {!isQuotaDepleted && (
                    <>
                      <span className={showLowQuotaWarning ? 'font-bold' : 'font-medium'}>
                        {remainingQuota ?? '1'}
                      </span>
                      次
                    </>
                  )}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500">{helperText}</p>
          </div>
          {onExportDocx && <p className="text-xs leading-5 text-slate-500">Word 为可编辑文档，排版可能与 PDF 预览不同。Word 与 PDF 共用导出额度。</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-11 sm:h-8 px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          {onExportPng ? (
            <Button variant="outline" size="sm" className="h-11 sm:h-8 px-3 text-xs" disabled={isConfirming} onClick={onExportPng}>
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              PNG
            </Button>
          ) : null}
          {onExportMarkdown ? (
            <Button variant="outline" size="sm" className="h-11 sm:h-8 px-3 text-xs" disabled={isConfirming} onClick={onExportMarkdown}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Markdown
            </Button>
          ) : null}
          {onExportDocx ? (
            <Button variant="outline" size="sm" className="h-11 sm:h-8 px-3 text-xs" disabled={isConfirming} onClick={onExportDocx}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Word
            </Button>
          ) : null}
          <Button
            size="sm"
            className={isQuotaDepleted
              ? 'h-11 sm:h-8 px-4 text-xs font-medium bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white hover:from-amber-600 hover:to-fuchsia-600 shadow-sm'
              : 'h-11 sm:h-8 px-4 text-xs font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 shadow-sm'}
            disabled={isConfirming}
            onClick={handlePrimaryAction}
          >
            {isQuotaDepleted ? (
              <Crown className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isQuotaDepleted ? '开通会员，导出 PDF' : '确认导出 PDF'}
          </Button>
          </div>
          {isConfirming && <p role="status" className="text-xs text-slate-500">正在处理导出，请稍候…</p>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
