'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type TeleprompterProps = {
  text: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Teleprompter(props: TeleprompterProps) {
  return props.open ? <TeleprompterContent key={props.text} {...props} /> : null
}

function TeleprompterContent({ text, open, onOpenChange }: TeleprompterProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(24)
  const [fontSize, setFontSize] = useState(28)
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pause)
    return () => document.removeEventListener('visibilitychange', pause)
  }, [])
  useEffect(() => {
    if (!open || !playing) return
    let frame = 0
    let last = 0
    let position = viewport.current?.scrollTop ?? 0
    const tick = (time: number) => {
      const node = viewport.current
      if (!node) return
      if (last) position += Math.min(time - last, 100) * speed / 1000
      last = time
      node.scrollTop = position
      if (node.scrollTop + node.clientHeight >= node.scrollHeight - 1) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [open, playing, speed])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-[#171421] p-0 text-[#f4f0fa]">
        <header className="flex items-center justify-between border-b border-white/10 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
          <DialogTitle className="text-base">面试提词</DialogTitle>
          <button type="button" className="min-h-11 px-3 text-sm" onClick={() => onOpenChange(false)}>退出</button>
        </header>
        <DialogDescription className="px-6 pt-3 text-xs text-white/60">按自己的节奏练习，手动滑动会暂停滚动。</DialogDescription>
        <div ref={viewport} onWheel={() => setPlaying(false)} onTouchStart={() => setPlaying(false)}
          className="min-h-0 flex-1 overflow-y-auto px-6 pt-8 pb-[35vh] leading-[1.95] whitespace-pre-wrap"
          style={{ fontSize }}>{text}</div>
        <footer className="space-y-3 border-t border-white/10 bg-[#211c2d] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-5 text-xs">
            <label>速度 {speed}<input aria-label="滚动速度" className="mt-3 w-full accent-violet-400" type="range" min="12" max="48" value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label>
            <label>字号 {fontSize}<input aria-label="提词字号" className="mt-3 w-full accent-violet-400" type="range" min="22" max="38" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} /></label>
          </div>
          <div className="flex gap-3">
            <button type="button" className="min-h-12 rounded-xl bg-white/10 px-5 text-sm" onClick={() => { setPlaying(false); if (viewport.current) viewport.current.scrollTop = 0 }}>重新开始</button>
            <button type="button" className="min-h-12 flex-1 rounded-xl bg-violet-600 text-sm font-semibold" onClick={() => setPlaying(v => !v)}>{playing ? '暂停滚动' : '开始滚动'}</button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
