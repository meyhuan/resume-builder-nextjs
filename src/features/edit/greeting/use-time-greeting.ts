'use client'

import { useEffect, useState } from 'react'

export interface Greeting {
  readonly text: string
  readonly emoji: string
}

/**
 * Pick a greeting based on the current local hour.
 */
function pickGreeting(hour: number): Greeting {
  if (hour >= 5 && hour < 11) return { text: '早上好，新的一天加油', emoji: '☀️' }
  if (hour >= 11 && hour < 13) return { text: '中午好，记得吃饭哦', emoji: '🍱' }
  if (hour >= 13 && hour < 18) return { text: '下午好，再加把劲', emoji: '✨' }
  if (hour >= 18 && hour < 23) return { text: '晚上好，今天辛苦了', emoji: '🌙' }
  return { text: '深夜还在改简历，别太累', emoji: '💤' }
}

/**
 * React hook that returns the current time-based greeting, updated every minute.
 */
export function useTimeGreeting(): Greeting {
  const [greeting, setGreeting] = useState<Greeting>(() => pickGreeting(new Date().getHours()))
  useEffect(() => {
    const timer = setInterval((): void => {
      setGreeting(pickGreeting(new Date().getHours()))
    }, 60_000)
    return (): void => clearInterval(timer)
  }, [])
  return greeting
}

/**
 * Encouragement text based on current progress percentage.
 */
export function getEncouragement(progress: number): string {
  if (progress >= 100) return '完美简历，祝你 offer 到手 🎉'
  if (progress >= 80) return '已经超越 85% 求职者，冲！'
  if (progress >= 50) return '你比一半的人更用心 ✨'
  if (progress >= 30) return '已经超过 32% 求职者了'
  return '开个好头，加油 💪'
}
