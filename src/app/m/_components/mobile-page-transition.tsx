'use client'

import { type ReactElement, type ReactNode, useLayoutEffect, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'

type Direction = 'forward' | 'back'

interface MobilePageTransitionProps {
  readonly children: ReactNode
}

let previousMobileRoute: { key: string; depth: number } | null = null

function getPageDepth(pathname: string): number {
  const normalized = pathname.replace(/\/$/, '')
  if (normalized === '/m') return 0
  if (normalized === '/m/edit') return 1
  if (normalized.startsWith('/m/edit/')) {
    return 1 + normalized.slice('/m/edit/'.length).split('/').filter(Boolean).length
  }
  return normalized.split('/').filter(Boolean).length
}

function getRouteKey(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/m'
}

export default function MobilePageTransition({ children }: MobilePageTransitionProps): ReactElement {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const routeKey = useMemo(() => getRouteKey(pathname), [pathname])
  const currentRoute = useMemo(
    () => ({ key: routeKey, depth: getPageDepth(pathname) }),
    [pathname, routeKey],
  )
  const previous = previousMobileRoute
  const direction: Direction = previous && previous.key !== currentRoute.key && currentRoute.depth < previous.depth
    ? 'back'
    : 'forward'

  useLayoutEffect(() => {
    previousMobileRoute = currentRoute
  }, [currentRoute])

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-100">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={routeKey}
          custom={direction}
          variants={{
            enter: (dir: Direction) => ({
              x: dir === 'forward' ? '100%' : '-28%',
              zIndex: dir === 'forward' ? 2 : 1,
              boxShadow: dir === 'forward' ? '-12px 0 28px rgba(15,23,42,.12)' : 'none',
            }),
            center: {
              x: 0,
              zIndex: 2,
              boxShadow: 'none',
            },
            exit: (dir: Direction) => ({
              x: dir === 'forward' ? '-28%' : '100%',
              zIndex: dir === 'forward' ? 1 : 2,
              boxShadow: dir === 'back' ? '-12px 0 28px rgba(15,23,42,.12)' : 'none',
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.26 }}
          className="absolute inset-0 overflow-y-auto bg-slate-100"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
