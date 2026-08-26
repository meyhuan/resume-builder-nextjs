'use client'

import { CheckCircle2, Copy, QrCode } from 'lucide-react'
import { MINI_PROGRAM_NAME } from '@/components/landing/MiniProgramEntry'

interface MiniProgramSaveReminderProps {
  readonly onViewQr: () => void
  readonly onCopyName: () => void
  readonly onDismiss: () => void
}

export function MiniProgramSaveReminder({
  onViewQr,
  onCopyName,
  onDismiss,
}: MiniProgramSaveReminderProps): React.ReactElement {
  return (
    <div className="relative w-[min(390px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-4 top-4 rounded-md px-1.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        我知道了
      </button>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 pr-16">
          <p className="text-sm font-semibold text-slate-900">简历已保存</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            手机上也能编辑。打开微信，搜索「<span className="font-semibold text-slate-900">{MINI_PROGRAM_NAME}</span>」，登录后即可找到这份简历。
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 pl-11">
        <button
          type="button"
          onClick={onViewQr}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <QrCode className="h-3.5 w-3.5" />
          查看二维码
        </button>
        <button
          type="button"
          onClick={onCopyName}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Copy className="h-3.5 w-3.5" />
          复制小程序名称
        </button>
      </div>
    </div>
  )
}
