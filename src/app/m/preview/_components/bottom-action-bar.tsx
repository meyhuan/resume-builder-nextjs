'use client'

import { useState, type ReactElement } from 'react'
import { FileDown, Loader2, Settings2 } from 'lucide-react'

interface BottomActionBarProps {
  readonly onOpenSettings: () => void
  readonly onExportPdf: () => Promise<void>
  readonly onExportImage: () => Promise<void>
  readonly onExportMarkdown: () => Promise<void>
  readonly isExporting: boolean
}

/**
 * Fixed bottom action bar with thumb-zone friendly primary actions.
 */
export function BottomActionBar(props: BottomActionBarProps): ReactElement {
  const { onOpenSettings, onExportPdf, onExportImage, onExportMarkdown, isExporting } = props
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm active:scale-[0.98] transition-transform"
        >
          <Settings2 size={18} />
          <span>样式</span>
        </button>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={(): void => setShowExportMenu((v) => !v)}
            disabled={isExporting}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm shadow-md shadow-violet-600/30 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>导出中…</span>
              </>
            ) : (
              <>
                <FileDown size={18} />
                <span>导出</span>
              </>
            )}
          </button>

          {showExportMenu && !isExporting && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(): void => setShowExportMenu(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  onClick={(): void => {
                    setShowExportMenu(false)
                    void onExportPdf()
                  }}
                >
                  导出 PDF
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  onClick={(): void => {
                    setShowExportMenu(false)
                    void onExportImage()
                  }}
                >
                  导出图片
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  onClick={(): void => {
                    setShowExportMenu(false)
                    void onExportMarkdown()
                  }}
                >
                  导出 Markdown
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
