'use client'

/**
 * ExportPreviewDialog — Displays the actual generated PDF in an iframe
 * using the browser's built-in PDF viewer. This guarantees the preview
 * is identical to the exported file (same pipeline, same blob).
 */
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
import { Download, Eye, AlertCircle } from 'lucide-react'

interface ExportPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pdfUrl: string
  readonly onConfirmExport: () => void
  readonly remainingQuota?: number | 'unlimited'
  readonly isVip?: boolean
}

export default function ExportPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  onConfirmExport,
  remainingQuota,
  isVip,
}: ExportPreviewDialogProps): ReactElement {
  const showLowQuotaWarning = !isVip && typeof remainingQuota === 'number' && remainingQuota <= 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[90vw] w-[900px] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            <DialogTitle className="text-base">导出效果预览</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            以下为实际生成的 PDF，确认无误后点击导出
          </DialogDescription>
        </DialogHeader>

        {/* PDF viewer iframe */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="PDF 预览"
            />
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-slate-200 shrink-0 bg-white/80 flex-row items-center">
          <div className="mr-auto flex items-center gap-3">
            {!isVip && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${showLowQuotaWarning ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                {showLowQuotaWarning && <AlertCircle className="w-3 h-3" />}
                <span>
                  剩余导出次数：
                  <span className={showLowQuotaWarning ? 'font-bold' : 'font-medium'}>
                    {remainingQuota === 0 ? '0' : remainingQuota ?? '1'}
                  </span>
                  次（免费限 1 次）
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {isVip ? 'VIP 会员无限导出' : '免费用户限 1 次导出'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 shadow-sm"
            onClick={onConfirmExport}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            确认导出 PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
