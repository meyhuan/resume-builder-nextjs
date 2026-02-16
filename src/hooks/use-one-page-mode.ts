/**
 * useOnePageMode — auto-adjusts theme settings so the resume fits on one A4 page.
 *
 * When enabled the hook:
 *  1. Saves the current lineHeight / spacingScale / fontSize as a snapshot.
 *  2. Measures the rendered content height via ResizeObserver.
 *  3. Progressively reduces spacingScale → lineHeight → fontSize until the
 *     content fits within one A4 page (297 mm minus vertical padding).
 *  4. Shows sonner toasts to inform the user about auto-adjustments or overflow.
 *
 * When disabled it restores the saved snapshot.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/** Subset of ThemeTokens that the hook may adjust. */
interface AdjustableTokens {
  readonly lineHeight: number
  readonly spacingScale: number
  readonly fontSize: number
}

export type OnePageStatus = 'idle' | 'fitting' | 'fit' | 'overflow'

interface UseOnePageModeReturn {
  readonly status: OnePageStatus
}

/** Minimum values the auto-fit algorithm will reduce to. */
const MIN_SPACING_SCALE = 0
const MIN_LINE_HEIGHT = 1.0
const MIN_FONT_SIZE = 12
const STEP_SPACING = 0.1
const STEP_LINE_HEIGHT = 0.1
const STEP_FONT_SIZE = 1
const DEBOUNCE_MS = 200

/**
 * Convert mm to px at the current screen resolution.
 * Creates a temporary element to let the browser do the conversion.
 */
function mmToPx(mm: number): number {
  const el = document.createElement('div')
  el.style.width = `${mm}mm`
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  document.body.appendChild(el)
  const px = el.offsetWidth
  document.body.removeChild(el)
  return px
}

/**
 * Hook that drives the one-page mode feature.
 *
 * @param contentRef   Ref to the resume container element (the printRef).
 * @param theme        Current theme tokens (read-only).
 * @param patchTheme   Callback to apply a partial theme update.
 * @param enabled      Whether one-page mode is currently on.
 */
export function useOnePageMode(
  contentRef: RefObject<HTMLDivElement | null>,
  theme: ThemeTokens,
  patchTheme: (patch: Partial<ThemeTokens>) => void,
  enabled: boolean,
): UseOnePageModeReturn {
  const [status, setStatus] = useState<OnePageStatus>('idle')

  // Snapshot of the theme tokens captured when one-page mode is turned on.
  const snapshotRef = useRef<AdjustableTokens | null>(null)

  // Track whether we are currently running the fit algorithm to avoid re-entry.
  const fittingRef = useRef(false)

  // A4 target height in px (computed once and cached).
  const targetHeightRef = useRef<number>(0)

  // Whether the hook has already shown an "adjusted" toast for this session.
  const adjustedToastShown = useRef(false)

  // Debounce timer id.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Compute A4 target height ──────────────────────────────────────────
  useEffect(() => {
    // A4 = 297mm. The template uses 22mm top + 22mm bottom padding.
    targetHeightRef.current = mmToPx(297)
  }, [])

  // ── Save / restore snapshot on toggle ─────────────────────────────────
  useEffect(() => {
    if (enabled) {
      // Save current values.
      snapshotRef.current = {
        lineHeight: theme.lineHeight,
        spacingScale: theme.spacingScale,
        fontSize: theme.fontSize,
      }
      adjustedToastShown.current = false
      setStatus('fitting')
    } else if (snapshotRef.current) {
      // Restore saved values.
      const saved = snapshotRef.current
      snapshotRef.current = null
      patchTheme({
        lineHeight: saved.lineHeight,
        spacingScale: saved.spacingScale,
        fontSize: saved.fontSize,
      })
      setStatus('idle')
      toast.info('已关闭一页模式，已恢复原始设置')
    }
    // We intentionally only react to `enabled` changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // ── Auto-fit algorithm ────────────────────────────────────────────────
  const runFit = useCallback(() => {
    const el = contentRef.current
    if (!el || !enabled || targetHeightRef.current === 0) return
    if (fittingRef.current) return
    fittingRef.current = true

    const targetH = targetHeightRef.current
    const contentH = el.scrollHeight

    if (contentH <= targetH) {
      // Already fits.
      setStatus('fit')
      if (!adjustedToastShown.current) {
        toast.success('已开启一页模式')
        adjustedToastShown.current = true
      }
      fittingRef.current = false
      return
    }

    // Content overflows — try reducing settings.
    let { spacingScale, lineHeight, fontSize } = {
      spacingScale: theme.spacingScale,
      lineHeight: theme.lineHeight,
      fontSize: theme.fontSize,
    }

    let adjusted = false

    // Priority 1: reduce spacingScale
    if (spacingScale > MIN_SPACING_SCALE + STEP_SPACING / 2) {
      spacingScale = Math.max(MIN_SPACING_SCALE, +(spacingScale - STEP_SPACING).toFixed(1))
      adjusted = true
    }
    // Priority 2: reduce lineHeight
    else if (lineHeight > MIN_LINE_HEIGHT + STEP_LINE_HEIGHT / 2) {
      lineHeight = Math.max(MIN_LINE_HEIGHT, +(lineHeight - STEP_LINE_HEIGHT).toFixed(1))
      adjusted = true
    }
    // Priority 3: reduce fontSize
    else if (fontSize > MIN_FONT_SIZE) {
      fontSize = Math.max(MIN_FONT_SIZE, fontSize - STEP_FONT_SIZE)
      adjusted = true
    }

    if (adjusted) {
      setStatus('fitting')
      patchTheme({ spacingScale, lineHeight, fontSize })
      if (!adjustedToastShown.current) {
        toast.info('正在自动调整间距以适应一页...')
        adjustedToastShown.current = true
      }
    } else {
      // All reductions exhausted.
      setStatus('overflow')
      toast.warning('内容过多，建议精简内容或减少模块以适应一页')
    }

    fittingRef.current = false
  }, [contentRef, enabled, theme.spacingScale, theme.lineHeight, theme.fontSize, patchTheme])

  // ── ResizeObserver: watch content height ──────────────────────────────
  useEffect(() => {
    const el = contentRef.current
    if (!el || !enabled) return

    const observer = new ResizeObserver(() => {
      // Debounce to let the DOM settle after theme changes.
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        runFit()
      }, DEBOUNCE_MS)
    })

    observer.observe(el)

    // Also run immediately in case the element is already rendered.
    const initialTimer = setTimeout(() => runFit(), DEBOUNCE_MS)

    return () => {
      observer.disconnect()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearTimeout(initialTimer)
    }
  }, [contentRef, enabled, runFit])

  return { status }
}
