'use client'

import confetti from 'canvas-confetti'

export const MILESTONES: readonly number[] = [50, 80, 100]

export interface MilestoneConfig {
  readonly emoji: string
  readonly title: string
  readonly subtitle: string
  readonly colors: readonly string[]
  readonly particleCount: number
}

export const MILESTONE_CONFIGS: Readonly<Record<number, MilestoneConfig>> = {
  50: {
    emoji: '🎯',
    title: '完成一半了！',
    subtitle: '继续加油，你已经超过大多数人',
    colors: ['#8b5cf6', '#ec4899', '#3b82f6'],
    particleCount: 80,
  },
  80: {
    emoji: '🚀',
    title: '完成 80%！',
    subtitle: '快完成了，再填几项就完美了',
    colors: ['#8b5cf6', '#ec4899', '#3b82f6'],
    particleCount: 100,
  },
  100: {
    emoji: '🏆',
    title: '简历填写完整了！',
    subtitle: '仔细检查一遍，满意后就可以导出啦',
    colors: ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981'],
    particleCount: 160,
  },
}

/**
 * Fire a confetti burst originating from the center of the viewport,
 * synchronized with the celebration card.
 */
export function fireCelebrationConfetti(milestone: number): void {
  const cfg = MILESTONE_CONFIGS[milestone]
  if (!cfg) return
  const colors = [...cfg.colors]
  confetti({
    particleCount: cfg.particleCount,
    spread: 80,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.5 },
    colors,
    ticks: 220,
  })
  if (milestone === 100) {
    setTimeout((): void => {
      confetti({
        particleCount: 120,
        spread: 120,
        startVelocity: 36,
        origin: { x: 0.2, y: 0.5 },
        colors,
      })
      confetti({
        particleCount: 120,
        spread: 120,
        startVelocity: 36,
        origin: { x: 0.8, y: 0.5 },
        colors,
      })
    }, 280)
  }
}

/**
 * Given the current progress and already-celebrated milestones, return
 * the milestones that have just been crossed for the first time.
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
