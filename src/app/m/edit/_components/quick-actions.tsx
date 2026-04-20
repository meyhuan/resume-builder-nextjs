'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, FileUp } from 'lucide-react'

/**
 * Two highlighted shortcuts: AI generate and import.
 */
export function QuickActions(): ReactElement {
  const router = useRouter()
  return (
    <div className="mx-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={(): void => router.push('/m/edit/ai-generate')}
        className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-violet-200/60 text-left active:scale-[0.98] transition-transform"
      >
        <div className="h-9 w-9 rounded-xl bg-violet-600 text-white flex items-center justify-center mb-2">
          <Wand2 size={16} />
        </div>
        <div className="text-sm font-semibold text-slate-900">AI 一键生成</div>
        <div className="mt-0.5 text-[11px] text-slate-500">几句话描述，自动成稿</div>
      </button>
      <button
        type="button"
        onClick={(): void => router.push('/m/edit/import')}
        className="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 text-left active:scale-[0.98] transition-transform"
      >
        <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2">
          <FileUp size={16} />
        </div>
        <div className="text-sm font-semibold text-slate-900">导入旧简历</div>
        <div className="mt-0.5 text-[11px] text-slate-500">PDF / Word / 粘贴</div>
      </button>
    </div>
  )
}
