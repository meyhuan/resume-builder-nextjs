'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clipboard,
} from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { useInMiniProgram } from '../../_components/use-mini-program'

interface PcGuideClientProps {
  readonly resumeId: string | null
  readonly templateId: string | null
}

const SITE_ORIGIN = 'https://aijianli.cn'
const SITE_HOST = 'aijianli.cn'
const log = createLogger('m/edit/pc-guide')

export default function PcGuideClient(
  { resumeId, templateId }: PcGuideClientProps,
): ReactElement {
  const router = useRouter()
  const inMiniProgram = useInMiniProgram()
  const [copying, setCopying] = useState<boolean>(false)

  const pcPath: string = resumeId
    ? `/editor/${encodeURIComponent(resumeId)}`
    : '/editor/new'

  const pcUrl: string = `${SITE_ORIGIN}${pcPath}`
  const displayHost: string = SITE_HOST

  const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (error: unknown) {
        log.warn('navigator clipboard failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      return document.execCommand('copy')
    } catch (error: unknown) {
      log.error('fallback clipboard failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    } finally {
      textarea.remove()
    }
  }

  const handleCopy = async (): Promise<void> => {
    if (copying) return
    log.info('copy pc link requested', { resumeId, templateId, pcPath })
    setCopying(true)
    try {
      const copied = await copyText(pcUrl)
      if (copied) {
        toast.success('电脑端链接已复制')
        return
      }
      toast.error('复制失败，请手动复制网址')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden text-slate-900"
      style={{
        background: 'linear-gradient(135deg, #d9fbff 0%, #eff3ff 34%, #f8e8ff 62%, #ffffff 100%)',
      }}
    >
      {!inMiniProgram && (
        <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between bg-white/35 px-3 backdrop-blur">
          <button
            type="button"
            onClick={(): void => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 active:bg-white/50 active:scale-95"
            aria-label="返回"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="text-[17px] font-semibold text-slate-900">PC端</div>
          <div className="w-10" />
        </header>
      )}

      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-8 pt-16">
        <section className="text-center">
          <h1 className="text-[29px] font-bold leading-[1.28] text-slate-900">
            智简简历电脑端
          </h1>
          <p className="mt-4 text-[22px] font-semibold leading-[1.45] text-slate-800">
            像 Word 一样编辑
            <br />
            保存后多端同步
          </p>
        </section>

        <div className="mt-12">
          <img
            src="/m/pc-editor-preview.png"
            alt="智简简历电脑端编辑器预览"
            className="w-full rounded-xl border border-white/70 bg-white shadow-[0_18px_44px_rgba(124,58,237,0.14)]"
            loading="eager"
            decoding="async"
          />
        </div>

        <section className="mt-12 text-center">
          <div className="break-all text-[21px] font-semibold leading-relaxed text-slate-800">
            {displayHost}
          </div>
          <div className="mt-1 text-[13px] font-medium text-violet-600">
            AI简历拼音
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            复制链接，在电脑浏览器打开
          </p>

          <button
            type="button"
            onClick={(): void => { void handleCopy() }}
            disabled={copying}
            className="mx-auto mt-7 flex h-14 w-full max-w-[320px] items-center justify-center gap-2 rounded-full bg-violet-600 text-[16px] font-semibold text-white shadow-lg shadow-violet-600/25 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {copying ? (
              <>
                <Clipboard size={18} />
                复制中
              </>
            ) : (
              <>
                <Clipboard size={18} />
                复制链接
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  )
}
