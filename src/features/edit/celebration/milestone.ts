'use client'

import confetti from 'canvas-confetti'

export const MILESTONES: readonly number[] = [50, 80, 100]

/**
 * Fire a festive confetti burst anchored at the bottom-center of the viewport.
 */
export function celebrateMilestone(milestone: number): void {
  const colors: readonly string[] = milestone === 100
    ? ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981']
    : ['#8b5cf6', '#ec4899', '#3b82f6']
  confetti({
    particleCount: milestone === 100 ? 160 : 90,
    spread: 80,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.7 },
    colors: [...colors],
    ticks: 200,
  })
  if (milestone === 100) {
    setTimeout((): void => {
      confetti({
        particleCount: 120,
        spread: 120,
        startVelocity: 36,
        origin: { x: 0.2, y: 0.6 },
        colors: [...colors],
      })
      confetti({
        particleCount: 120,
        spread: 120,
        startVelocity: 36,
        origin: { x: 0.8, y: 0.6 },
        colors: [...colors],
      })
    }, 250)
  }
}

/**
 * Given the previous and current progress, return the milestones that
 * have just been crossed and haven't been celebrated yet.
 */
export function detectNewMilestones(
  progress: number,
  celebrated: readonly number[],
): readonly number[] {
  const hit: number[] = []
  for (const m of MILESTONES) {
    if (progress >= m && !celebrated.includes(m)) hit.push(m)
  }
  return hit
}
