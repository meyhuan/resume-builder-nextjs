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
import { Download, Eye } from 'lucide-react'

interface ExportPreviewDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly pdfUrl: string
  readonly onConfirmExport: () => void
}

export default function ExportPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  onConfirmExport,
}: ExportPreviewDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[90vw] w-[900px] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            <DialogTitle className="text-base">Export Preview</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 mt-1">
            Preview of the generated PDF. Confirm before exporting.
          </DialogDescription>
        </DialogHeader>

        {/* PDF viewer iframe */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-slate-200 shrink-0 bg-white/80 flex-row items-center">
          <p className="text-[11px] text-slate-400 mr-auto hidden sm:block">
            Tip: Please review the PDF carefully before exporting.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 shadow-sm"
            onClick={onConfirmExport}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
