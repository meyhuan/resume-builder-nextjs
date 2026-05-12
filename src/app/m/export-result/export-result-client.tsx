'use client'

import { type ReactElement, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Copy, ExternalLink, Mail, MessageCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'
import { useInMiniProgram } from '../_components/use-mini-program'

const log = createLogger('m/export-result')

type ExportType = 'pdf' | 'image'

interface ExportResultState {
  readonly id: string
  readonly type: ExportType
  readonly fileName: string
  readonly downloadUrl: string
  readonly expiresAt: string
}

function getAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path
  if (/^https?:\/\//i.test(path)) return path
  return `${window.location.origin}${path}`
}

export default function ExportResultClient(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inMiniProgram = useInMiniProgram()
  const state = useMemo<ExportResultState | null>(() => {
    const type = searchParams.get('type')
    const downloadUrl = searchParams.get('url')
    if ((type !== 'pdf' && type !== 'image') || !downloadUrl) return null
    return {
      id: searchParams.get('id') || '',
      type,
      fileName: searchParams.get('fileName') || 'resume',
      downloadUrl,
      expiresAt: searchParams.get('expiresAt') || '',
    }
  }, [searchParams])

  const absoluteUrl = state ? getAbsoluteUrl(state.downloadUrl) : ''
  const expiresText = state?.expiresAt ? new Date(state.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '稍后'

  const handleBrowserDownload = (): void => {
    if (!state) return
    log.info('browser download clicked', { type: state.type, id: state.id, url: absoluteUrl })
    const a = document.createElement('a')
    a.href = absoluteUrl
    a.download = `${state.fileName}.${state.type === 'pdf' ? 'pdf' : 'png'}`
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

  const handleMiniProgramOpen = (): void => {
    if (!state) return
    const page = `/pages/exportResult/exportResult?type=${encodeURIComponent(state.type)}&url=${encodeURIComponent(absoluteUrl)}&fileName=${encodeURIComponent(state.fileName)}`
    const canNavigateTo = typeof window.wx?.miniProgram?.navigateTo === 'function'
    log.info('mini program export destination clicked', { canNavigateTo, page, id: state.id })
    if (!canNavigateTo) {
      toast.error('小程序环境未就绪，请使用复制链接')
      return
    }
    window.wx?.miniProgram?.navigateTo({ url: page })
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
      {!inMiniProgram && (
        <div className="sticky top-0 z-30 h-12 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-3">
          <button type="button" className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600" onClick={(): void => router.back()} aria-label="返回">
            <ArrowLeft size={18} />
          </button>
          <div className="text-sm font-semibold text-slate-800">选择导出方式</div>
          <div className="w-9" />
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-40">
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900">{state.type === 'pdf' ? 'PDF 简历已生成' : '图片简历已生成'}</div>
            <div className="text-xs text-slate-500 mt-1">链接预计 {expiresText} 失效，请尽快保存</div>
          </div>
          <div className="bg-slate-50 p-3">
            {state.type === 'pdf' ? (
              <iframe src={absoluteUrl} title="PDF 预览" className="w-full h-[62vh] rounded-2xl bg-white border border-slate-200" />
            ) : (
              <img src={absoluteUrl} alt="导出图片预览" className="w-full rounded-2xl bg-white border border-slate-200" />
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" className="h-12 rounded-xl" onClick={handleMiniProgramOpen}>
            <MessageCircle size={17} />
            微信好友/文件助手
          </Button>
          <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={handleBrowserDownload}>
            <Download size={17} />
            浏览器下载
          </Button>
          <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={(): void => { void handleCopyLink() }}>
            <Copy size={17} />
            复制下载链接
          </Button>
          <Button type="button" variant="outline" className="h-12 rounded-xl opacity-60" disabled>
            <Mail size={17} />
            发送到邮箱
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
