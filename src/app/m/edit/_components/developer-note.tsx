'use client'

import { type ReactElement } from 'react'
import { MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Low-key feedback entry. Keeps the independent-developer voice available
 * without competing with the editing workflow.
 */
export function DeveloperNote(): ReactElement {
  const router = useRouter()

  return (
    <div className="mx-[18px] my-6 rounded-[18px] border border-[#edf0f5] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.045)]">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
          <MessageCircle size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800">反馈与建议</div>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            我会持续改进这个独立产品，让简历编辑更省心。
          </p>
        </div>
        <button
          type="button"
          onClick={(): void => router.push('/m/about')}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
        >
          告诉我
        </button>
      </div>
    </div>
  )
}
