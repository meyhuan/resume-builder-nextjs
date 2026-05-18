'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import {
  detectNewMilestones,
  fireCelebrationConfetti,
  MILESTONE_CONFIGS,
} from '@/features/edit/celebration/milestone'

interface MilestoneConfettiProps {
  readonly progress: number
}

const CARD_DURATION_MS = 2800

/**
 * Watches progress and fires a celebration card + confetti burst when
 * crossing a new milestone. Card and confetti originate from the same
 * center point so they feel like a single unified effect.
 */
export function MilestoneConfetti({ progress }: MilestoneConfettiProps): ReactElement | null {
  const celebrated = useDraftStore((s) => s.celebratedMilestones)
  const mark = useDraftStore((s) => s.markMilestoneCelebrated)
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)

  useEffect((): (() => void) | undefined => {
    const hits = detectNewMilestones(progress, celebrated)
    if (hits.length === 0) return undefined
    // Fire the highest milestone reached to avoid stacking bursts.
    const top: number = hits[hits.length - 1]
    for (const m of hits) mark(m)
    setActiveMilestone(top)
    fireCelebrationConfetti(top)
    const timer = setTimeout((): void => setActiveMilestone(null), CARD_DURATION_MS)
    return (): void => clearTimeout(timer)
  // celebrated intentionally excluded — we only want to re-run when progress changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress])

  const cfg = activeMilestone !== null ? MILESTONE_CONFIGS[activeMilestone] : null

  return (
    <AnimatePresence>
      {cfg && activeMilestone !== null && (
        <motion.div
          key={activeMilestone}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="mx-6 rounded-3xl bg-white shadow-2xl shadow-violet-500/25 px-8 py-7 flex flex-col items-center gap-2 text-center border border-violet-100"
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -12 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 26,
            }}
          >
            <motion.span
              className="text-5xl leading-none select-none"
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.08 }}
            >
              {cfg.emoji}
            </motion.span>
            <p className="text-lg font-bold text-slate-900 mt-1">{cfg.title}</p>
            <p className="text-sm text-slate-500 leading-snug">{cfg.subtitle}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
