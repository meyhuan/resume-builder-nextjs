'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { pickExportJobTips } from '@/lib/export-job-tips'
import styles from './export-loading-content.module.css'

/** Fixed editorial tips only; no resume data, personalization or extra request. */
export function ExportLoadingContent() {
  const [tips] = useState(() => pickExportJobTips())
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const tip = tips[index]
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const preference = () => { if (motion?.matches) setPaused(true) }
    preference()
    motion?.addEventListener('change', preference)
    return () => { document.removeEventListener('visibilitychange', visibility); motion?.removeEventListener('change', preference) }
  }, [])
  useEffect(() => {
    if (paused || hovered || hidden) return
    const timer = window.setInterval(() => setIndex(current => (current + 1) % tips.length), 10_000)
    return () => window.clearInterval(timer)
  }, [paused, hovered, hidden, tips.length])
  const move = (delta: number) => { setPaused(true); setIndex(current => (current + tips.length + delta) % tips.length) }
  return (
    <section aria-label="求职小提示" aria-roledescription="轮播" data-tip-id={tip.id} data-tip-position={index + 1} className={styles.card}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-autoplay-control]')) setPaused(true) }}
      onTouchStart={event => {
        if (!(event.target as HTMLElement).closest('[data-autoplay-control]')) setPaused(true)
        const point = event.touches[0]; touch.current = point ? { x: point.clientX, y: point.clientY } : null
      }}
      onTouchCancel={() => { touch.current = null }}
      onTouchEnd={event => {
        const start = touch.current, end = event.changedTouches[0]
        touch.current = null
        if (!start || !end) return
        const dx = end.clientX - start.x, dy = end.clientY - start.y
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
      }}>
      <div className={styles.copy} aria-live={paused ? 'polite' : 'off'} aria-atomic="true">
        <p className="sr-only">{tip.audience}</p>
        <h3 className={styles.title}>{tip.title}</h3>
        <p className={styles.description}>{tip.content}</p>
      </div>
      <div className={styles.controls}>
        <button type="button" aria-label="上一条求职提示" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        <span className="text-xs tabular-nums text-slate-400">{index + 1} / {tips.length}</span>
        <button type="button" data-autoplay-control aria-label={paused ? '继续自动轮播' : '暂停自动轮播'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
        <button type="button" aria-label="下一条求职提示" onClick={() => move(1)}><ChevronRight size={18} /></button>
      </div>
    </section>
  )
}
