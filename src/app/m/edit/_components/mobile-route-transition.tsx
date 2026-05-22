'use client'

import { type ReactElement, type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'

type Direction = 'forward' | 'back'

interface MobileRouteTransitionProps {
  readonly children: ReactNode
}

function getEditDepth(pathname: string): number {
  const normalized = pathname.replace(/\/$/, '')
  if (normalized === '/m/edit') return 0
  if (!normalized.startsWith('/m/edit/')) return 0
  return normalized
    .slice('/m/edit/'.length)
    .split('/')
    .filter(Boolean).length
}

function getRouteKey(pathname: string, query: string): string {
  const id = new URLSearchParams(query).get('id')
  return id && pathname === '/m/edit' ? `${pathname}?id=${id}` : pathname
}

export function MobileRouteTransition({ children }: MobileRouteTransitionProps): ReactElement {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reduceMotion = useReducedMotion()
  const query = searchParams.toString()
  const routeKey = useMemo(() => getRouteKey(pathname, query), [pathname, query])
  const previousRoute = useRef<{ key: string; depth: number } | null>(null)
  const [direction, setDirection] = useState<Direction>('forward')

  useLayoutEffect(() => {
    const current = { key: routeKey, depth: getEditDepth(pathname) }
    const previous = previousRoute.current
    if (previous && previous.key !== current.key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirection(current.depth < previous.depth ? 'back' : 'forward')
    }
    previousRoute.current = current
  }, [pathname, routeKey])

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={routeKey}
          custom={direction}
          variants={{
            enter: (dir: Direction) => ({ x: dir === 'forward' ? '100%' : '-24%', opacity: 1 }),
            center: { x: 0, opacity: 1 },
            exit: (dir: Direction) => ({ x: dir === 'forward' ? '-24%' : '100%', opacity: 1 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
          className="min-h-screen bg-slate-100"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
