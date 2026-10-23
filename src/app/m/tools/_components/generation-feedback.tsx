'use client'

import { useEffect, useRef } from 'react'

/** Abort both transport and stale UI updates when cancelling or leaving a tool. */
export function useGenerationRequest() {
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  return {
    begin() {
      active.current?.abort()
      const controller = new AbortController()
      active.current = controller
      return controller
    },
    cancel() {
      active.current?.abort()
    },
  }
}

export function GenerationFeedback({ label, onCancel, progress }: {
  label: string
  onCancel: () => void
  progress?: { current: number; total: number }
}) {
  return (
    <section aria-busy="true" className="rounded-2xl border border-violet-100 bg-white p-4">
      <p role="status" className="text-sm font-medium text-violet-800">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">正在生成，请稍候。取消后会保留已填写内容。</p>
      {progress && progress.total > 0 && <div className="mt-4">
        <p className="mb-2 text-xs text-slate-500">已处理 {progress.current} / {progress.total} 个模块</p>
        <progress aria-label="翻译进度" className="h-2 w-full accent-violet-600" value={progress.current} max={progress.total} />
      </div>}
      <div aria-hidden="true" className="my-5 space-y-3 motion-safe:animate-pulse">
        <div className="h-3 w-2/3 rounded bg-violet-100" />
        <div className="h-3 rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
      <button type="button" onClick={onCancel} className="min-h-11 rounded-lg px-3 text-sm font-medium text-violet-700">取消生成</button>
    </section>
  )
}
