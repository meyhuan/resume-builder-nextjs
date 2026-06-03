'use client'

import { useEffect, useState } from 'react'

const KEYBOARD_OPEN_THRESHOLD = 80

interface VisualViewportKeyboardState {
  readonly canMeasure: boolean
  readonly keyboardHeight: number
  readonly keyboardOpen: boolean
}

const INITIAL_STATE: VisualViewportKeyboardState = {
  canMeasure: false,
  keyboardHeight: 0,
  keyboardOpen: false,
}

/**
 * Tracks the on-screen keyboard from VisualViewport changes.
 *
 * Mobile browsers can keep the focused element active after the keyboard is
 * dismissed, so focus alone is not reliable for fixed keyboard-adjacent UI.
 */
export function useVisualViewportKeyboard(): VisualViewportKeyboardState {
  const [state, setState] = useState<VisualViewportKeyboardState>(INITIAL_STATE)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) {
      return
    }

    let frameId: number | null = null

    const update = (): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const rawHeight: number = window.innerHeight - vv.height - vv.offsetTop
        const keyboardHeight: number = Math.max(0, Math.round(rawHeight))
        const keyboardOpen: boolean = keyboardHeight > KEYBOARD_OPEN_THRESHOLD

        setState((prev) => {
          if (
            prev.canMeasure &&
            prev.keyboardHeight === keyboardHeight &&
            prev.keyboardOpen === keyboardOpen
          ) {
            return prev
          }

          return {
            canMeasure: true,
            keyboardHeight,
            keyboardOpen,
          }
        })
      })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)

    return (): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return state
}
