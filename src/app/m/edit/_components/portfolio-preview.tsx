'use client'

import type { ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Images } from 'lucide-react'
import type { ResumePortfolio } from '@/entities/resume/portfolio'

export function PortfolioPreview(props: { readonly portfolio?: ResumePortfolio }): ReactElement {
  const router = useRouter()
  const count = props.portfolio?.images.length ?? 0
  return (
    <div className="mt-2 px-3">
      <button
        type="button"
        onClick={(): void => router.push('/m/edit/portfolio')}
        className="grid w-full grid-cols-[32px_1fr_auto_16px] items-center gap-2 rounded-[18px] border border-[#edf0f5] bg-white p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.045)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1efff] text-[#6c47ff]">
          <Images size={18} strokeWidth={2.1} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold leading-5 text-slate-950">图片作品集</span>
          <span className="mt-0.5 block truncate text-[12px] leading-4 text-slate-500">
            {count > 0 ? `${count} 张图片，将附在 PDF 简历后` : '上传作品图片，随 PDF 简历一起投递'}
          </span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {count > 0 ? '已添加' : '未添加'}
        </span>
        <ChevronRight size={16} className="text-slate-300" />
      </button>
    </div>
  )
}
