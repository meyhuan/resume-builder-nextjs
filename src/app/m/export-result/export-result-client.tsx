'use client'

import { type ReactElement, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Copy, ExternalLink, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import JobSprintOffer from '@/components/vip/job-sprint-offer'
import { createLogger } from '@/lib/logger'
import { sanitizeExportFileName } from '@/lib/export-file-name'

const log = createLogger('m/export-result')

type ExportType = 'pdf' | 'image'

interface ExportResultState {
  readonly id: string
  readonly type: ExportType
  readonly fileName: string
  readonly downloadUrl: string
  readonly expiresAt: string
  readonly previewImages: readonly string[]
}

function getAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path
  if (/^https?:\/\//i.test(path)) return path
  return `${window.location.origin}${path}`
}

export default function ExportResultClient(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()

  const state = useMemo<ExportResultState | null>(() => {
    const type = searchParams.get('type')
    const downloadUrl = searchParams.get('url')
    if ((type !== 'pdf' && type !== 'image') || !downloadUrl) return null
    let previewImages: string[] = []
    try {
      const raw = searchParams.get('previewImages')
      if (raw) previewImages = JSON.parse(raw) as string[]
    } catch { /* ignore parse error */ }
    return {
      id: searchParams.get('id') || '',
      type,
      fileName: searchParams.get('fileName') || 'resume',
      downloadUrl,
      expiresAt: searchParams.get('expiresAt') || '',
      previewImages,
    }
  }, [searchParams])

  const absoluteUrl = state ? getAbsoluteUrl(state.downloadUrl) : ''
  const expiresText = state?.expiresAt ? new Date(state.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '稍后'

  const handleBrowserDownload = (): void => {
    if (!state) return
    log.info('browser download clicked', { type: state.type, id: state.id, url: absoluteUrl })
    const a = document.createElement('a')
    a.href = absoluteUrl
    a.download = `${sanitizeExportFileName(state.fileName)}.${state.type === 'pdf' ? 'pdf' : 'png'}`
    a.click()
  }

  const handleCopyLink = async (): Promise<void> => {
    if (!state) return
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      log.info('copy link success', { type: state.type, id: state.id })
      toast.success('下载链接已复制')
    } catch (error: unknown) {
      log.error('copy link failed', { error: error instanceof Error ? error.message : String(error) })
      toast.error('复制失败，请手动复制')
    }
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-base font-semibold text-slate-900">导出信息已失效</div>
          <Button className="mt-5 w-full" onClick={(): void => router.back()}>返回重新导出</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="sticky top-0 z-30 h-12 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-3">
        <button type="button" className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600" onClick={(): void => router.back()} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">导出结果</div>
        <div className="w-9" />
      </div>

      <main className="flex-1 px-4 py-4 pb-40">
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900">{state.type === 'pdf' ? 'PDF 简历已生成' : '图片简历已生成'}</div>
            <div className="text-xs text-slate-500 mt-1">链接预计 {expiresText} 失效，请尽快保存</div>
          </div>
          <div className="bg-slate-50 p-3 space-y-3">
            {state.type === 'pdf' ? (
              state.previewImages.length > 0 ? (
                state.previewImages.map((url, i) => (
                  <img
                    key={url}
                    src={getAbsoluteUrl(url)}
                    alt={`简历第 ${i + 1} 页`}
                    className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm"
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-[62vh] rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm">
                  预览不可用，请直接下载文件
                </div>
              )
            ) : (
              <img src={absoluteUrl} alt="导出图片预览" className="w-full rounded-2xl bg-white border border-slate-200" />
            )}
          </div>
        </div>

        <div className="mt-4">
          <JobSprintOffer entry="export-result" compact />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" className="h-12 rounded-xl" onClick={handleBrowserDownload}>
            <Download size={17} />
            下载文件
          </Button>
          <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={(): void => { void handleCopyLink() }}>
            <Copy size={17} />
            复制下载链接
          </Button>
        </div>
        <button type="button" className="mt-3 w-full h-9 text-xs text-slate-500 flex items-center justify-center gap-1" onClick={(): void => { window.open(absoluteUrl, '_blank') }}>
          <ExternalLink size={14} />
          如果预览异常，点此打开文件
        </button>
      </div>
    </div>
  )
}
