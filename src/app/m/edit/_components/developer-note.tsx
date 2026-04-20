'use client'

import { useState, type ReactElement } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Closing note at the bottom of the edit home that surfaces the developer's
 * voice and makes the product feel made-by-a-human.
 */
export function DeveloperNote(): ReactElement {
  const router = useRouter()
  const [taps, setTaps] = useState<number>(0)
  const [showEasterEgg, setShowEasterEgg] = useState<boolean>(false)

  const handleHeartTap = (): void => {
    const next: number = taps + 1
    setTaps(next)
    if (next >= 5) {
      setShowEasterEgg(true)
      setTaps(0)
      setTimeout((): void => setShowEasterEgg(false), 3000)
    }
  }

  return (
    <div className="mx-5 my-8 rounded-2xl bg-slate-50 border border-slate-100 p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleHeartTap}
          className="h-9 w-9 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          aria-label="来自开发者"
        >
          <Heart size={16} fill="currentColor" />
        </button>
        <div className="flex-1 text-sm text-slate-600 leading-relaxed">
          <p>
            嘿，我是这个产品的独立开发者。简历是一件严肃又琐碎的事，希望这里的每一个细节都能让你少点烦躁、多点自信。
          </p>
          <p className="mt-2">
            有任何想法都可以{' '}
            <button
              type="button"
              onClick={(): void => router.push('/m/about')}
              className="inline-flex items-center gap-1 text-violet-600 font-medium hover:underline"
            >
              <MessageCircle size={12} />
              告诉我
            </button>
            ，不管是建议还是吐槽，都会认真看。
          </p>
          {showEasterEgg && (
            <div className="mt-3 rounded-lg bg-gradient-to-r from-violet-100 to-pink-100 px-3 py-2 text-xs text-violet-700 animate-in fade-in slide-in-from-bottom-2">
              ✨ 感谢你这么认真，祝面试顺利！
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
