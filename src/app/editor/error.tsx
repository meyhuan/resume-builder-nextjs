'use client'

import { Button } from '@/components/ui/button'

export default function EditorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <div role="alert">
        <h1 className="text-lg font-semibold text-slate-900">简历加载失败</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">请检查网络连接后重试。如果仍无法打开，请稍后再试。</p>
      </div>
      <Button onClick={reset}>重新加载简历</Button>
    </main>
  )
}
