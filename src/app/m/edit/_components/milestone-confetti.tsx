'use client'

import { useEffect, type ReactElement } from 'react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { celebrateMilestone, detectNewMilestones } from '@/features/edit/celebration/milestone'

interface MilestoneConfettiProps {
  readonly progress: number
}

/**
 * Watches progress and fires confetti when crossing new milestones.
 * Keeps celebrated milestones in the draft store to prevent re-firing.
 */
export function MilestoneConfetti({ progress }: MilestoneConfettiProps): ReactElement | null {
  const celebrated = useDraftStore((s) => s.celebratedMilestones)
  const mark = useDraftStore((s) => s.markMilestoneCelebrated)
  useEffect((): void => {
    const hits = detectNewMilestones(progress, celebrated)
    if (hits.length === 0) return
    // Fire the highest one to avoid stacking bursts on first load.
    const top: number = hits[hits.length - 1]
    celebrateMilestone(top)
    for (const m of hits) mark(m)
  }, [progress, celebrated, mark])
  return null
}
