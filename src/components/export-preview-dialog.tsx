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
import { Download, Eye, AlertCircle, Crown, Loader2 } from 'lucide-react'

interface ExportPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pdfUrl: string
  readonly onConfirmExport: () => void
  readonly onUpgradeClick?: () => void
  readonly remainingQuota?: number | 'unlimited'
  readonly isVip?: boolean
  readonly isConfirming?: boolean
}

export default function ExportPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  onConfirmExport,
  onUpgradeClick,
  remainingQuota,
  isVip,
  isConfirming,
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
        className="max-w-[90vw] w-[900px] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50"
      >
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            <DialogTitle className="text-base">导出效果预览</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            以下为实际生成的 PDF，确认无误后继续导出
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="PDF 预览"
            />
          ) : null}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-200 shrink-0 bg-white/80 flex-row items-center">
          <div className="mr-auto flex items-center gap-3">
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
            <p className="text-[11px] text-slate-400">{helperText}</p>
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
            className={isQuotaDepleted
              ? 'h-8 px-4 text-xs font-medium bg-gradient-to-r from-amber-500 to-fuchsia-500 text-white hover:from-amber-600 hover:to-fuchsia-600 shadow-sm'
              : 'h-8 px-4 text-xs font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 shadow-sm'}
            disabled={isConfirming}
            onClick={handlePrimaryAction}
          >
            {isConfirming ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : isQuotaDepleted ? (
              <Crown className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isConfirming ? '处理中...' : isQuotaDepleted ? '开通会员，导出 PDF' : '确认导出 PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
