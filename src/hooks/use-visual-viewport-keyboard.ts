'use client'

import { useEffect, useRef, useState } from 'react'

const KEYBOARD_OPEN_THRESHOLD = 80
const KEYBOARD_SETTLE_DELAYS = [80, 180, 360, 700] as const

interface VisualViewportKeyboardState {
  readonly canMeasure: boolean
  /** Approximate keyboard height, including browsers that shrink the layout viewport. */
  readonly keyboardHeight: number
  readonly keyboardOpen: boolean
  /**
   * Offset needed by `position: fixed; bottom: ...` UI.
   *
   * Some mobile browsers shrink the layout viewport when the keyboard opens,
   * so `bottom: 0` is already above the keyboard. In those browsers this stays
   * at 0 even while `keyboardOpen` is true.
   */
  readonly fixedBottomOffset: number
}

const INITIAL_STATE: VisualViewportKeyboardState = {
  canMeasure: false,
  keyboardHeight: 0,
  keyboardOpen: false,
  fixedBottomOffset: 0,
}

/**
 * Tracks the on-screen keyboard from VisualViewport changes.
 *
 * Mobile browsers can keep the focused element active after the keyboard is
 * dismissed, so focus alone is not reliable for fixed keyboard-adjacent UI.
 */
export function useVisualViewportKeyboard(): VisualViewportKeyboardState {
  const [state, setState] = useState<VisualViewportKeyboardState>(INITIAL_STATE)
  const baselineHeightRef = useRef<number>(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) {
      return
    }

    let frameId: number | null = null
    const timeoutIds = new Set<number>()

    const update = (options?: { readonly resetBaseline?: boolean }): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)

      frameId = window.requestAnimationFrame(() => {
        frameId = null

        if (options?.resetBaseline) baselineHeightRef.current = 0

        const layoutHeight: number = Math.round(window.innerHeight)
        const visualBottom: number = Math.round(vv.height + vv.offsetTop)
        const currentViewportHeight: number = Math.max(layoutHeight, visualBottom)

        baselineHeightRef.current = Math.max(baselineHeightRef.current, currentViewportHeight)

        const fixedBottomOffset: number = Math.max(0, layoutHeight - visualBottom)
        const compressedViewportHeight: number = Math.max(0, baselineHeightRef.current - currentViewportHeight)
        const keyboardHeight: number = Math.max(fixedBottomOffset, compressedViewportHeight)
        const keyboardOpen: boolean = keyboardHeight > KEYBOARD_OPEN_THRESHOLD
        const nextFixedBottomOffset: number = keyboardOpen && fixedBottomOffset > KEYBOARD_OPEN_THRESHOLD
          ? fixedBottomOffset
          : 0

        setState((prev) => {
          if (
            prev.canMeasure &&
            prev.keyboardHeight === keyboardHeight &&
            prev.keyboardOpen === keyboardOpen &&
            prev.fixedBottomOffset === nextFixedBottomOffset
          ) {
            return prev
          }

          return {
            canMeasure: true,
            keyboardHeight,
            keyboardOpen,
            fixedBottomOffset: nextFixedBottomOffset,
          }
        })
      })
    }

    const updateAfterKeyboardSettles = (): void => {
      update()
      for (const delay of KEYBOARD_SETTLE_DELAYS) {
        const timeoutId = window.setTimeout(() => {
          timeoutIds.delete(timeoutId)
          update()
        }, delay)
        timeoutIds.add(timeoutId)
      }
    }

    const resetBaselineAndUpdate = (): void => {
      update({ resetBaseline: true })
      updateAfterKeyboardSettles()
    }

    const handleViewportChange = (): void => update()

    update()
    vv.addEventListener('resize', handleViewportChange)
    vv.addEventListener('scroll', handleViewportChange)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('focusin', updateAfterKeyboardSettles)
    window.addEventListener('focusout', updateAfterKeyboardSettles)
    window.addEventListener('orientationchange', resetBaselineAndUpdate)

    return (): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      for (const timeoutId of timeoutIds) window.clearTimeout(timeoutId)
      vv.removeEventListener('resize', handleViewportChange)
      vv.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('focusin', updateAfterKeyboardSettles)
      window.removeEventListener('focusout', updateAfterKeyboardSettles)
      window.removeEventListener('orientationchange', resetBaselineAndUpdate)
    }
  }, [])

  return state
}
