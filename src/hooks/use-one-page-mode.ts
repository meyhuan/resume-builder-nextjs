import { ONE_PAGE_READABILITY } from '@/lib/resume-page-metrics'
/**
 * useOnePageMode — auto-adjusts theme settings so the resume fits on one A4 page.
 *
 * The snapshot is **externalized**: the caller owns it so it can be persisted
 * to the database alongside resume data (via EditorMeta).
 *
 * When enabled the hook:
 *  1. Captures the current lineHeight / spacingScale / fontSize into the
 *     caller-provided snapshot setter (only if no snapshot exists yet).
 *  2. Measures the rendered content height via ResizeObserver.
 *  3. Progressively reduces spacingScale → lineHeight → fontSize until the
 *     content fits within one A4 page (297 mm).
 *  4. Exposes adjustment status and warns once when the selected strategy cannot fit.
 *
 * When disabled it restores from the caller-provided snapshot.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { DEFAULT_ONE_PAGE_STRATEGY, type AdjustableTokens, type OnePageStrategy } from '@/entities/editor/editor-meta'

export type OnePageStatus = 'idle' | 'fitting' | 'fit' | 'overflow'

export interface UseOnePageModeOptions {
  /** Ref to the resume container element (printRef). */
  contentRef: RefObject<HTMLDivElement | null>
  /** Current theme tokens (read-only). */
  theme: ThemeTokens
  /** Callback to apply a partial theme update. */
  patchTheme: (patch: Partial<ThemeTokens>) => void
  /** Whether one-page mode is currently on. */
  enabled: boolean
  /** Externalized snapshot — persisted by the caller. */
  snapshot: AdjustableTokens | null
  /** Setter for the externalized snapshot. */
  setSnapshot: (s: AdjustableTokens | null) => void
  /** User-selected goal for fitting. Defaults to the one-page-first strategy. */
  strategy?: OnePageStrategy
}

export interface UseOnePageModeReturn {
  readonly status: OnePageStatus
  /** Restore snapshot & disable — intended for template-switch scenarios. */
  readonly reset: () => void
}

/** Minimum values the auto-fit algorithm will reduce to. */
const ONE_PAGE_LIMITS = {
  readability: ONE_PAGE_READABILITY,
  'one-page': { lineHeight: 1, fontSize: 12, spacingScale: 0 },
  manual: { lineHeight: 1, fontSize: 12, spacingScale: 0 },
} as const
const STEP_SPACING = 0.1
const STEP_LINE_HEIGHT = 0.1
const STEP_FONT_SIZE = 1
const DEBOUNCE_MS = 200

/**
 * Convert mm to px at the current screen resolution.
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
 */
export function useOnePageMode(opts: UseOnePageModeOptions): UseOnePageModeReturn {
  const { contentRef, theme, patchTheme, enabled, snapshot, setSnapshot, strategy = DEFAULT_ONE_PAGE_STRATEGY } = opts
  const [status, setStatus] = useState<OnePageStatus>(enabled ? 'fitting' : 'idle')

  // Track whether we are currently running the fit algorithm to avoid re-entry.
  const fittingRef = useRef(false)

  // A4 target height in px (computed once and cached).
  const targetHeightRef = useRef<number>(0)

  const overflowToastShown = useRef(false)

  // Debounce timer id.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Compute A4 target height ──────────────────────────────────────────
  useEffect(() => {
    targetHeightRef.current = mmToPx(297)
  }, [])

  // ── Save snapshot on enable (only if no snapshot yet) ─────────────────
  useEffect(() => {
    if (enabled && !snapshot) {
      setSnapshot({
        lineHeight: theme.lineHeight,
        spacingScale: theme.spacingScale,
        fontSize: theme.fontSize,
      })
    }
    if (enabled) {
      overflowToastShown.current = false
      setStatus('fitting')
    }
    // Snapshot capture is intentionally tied to mode/strategy changes, not every theme patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, strategy])

  // ── Restore helper (used by toggle-off and by reset) ──────────────────
  const restoreSnapshot = useCallback(() => {
    if (!snapshot) return
    patchTheme({
      lineHeight: snapshot.lineHeight,
      spacingScale: snapshot.spacingScale,
      fontSize: snapshot.fontSize,
    })
    setSnapshot(null)
    setStatus('idle')
  }, [snapshot, patchTheme, setSnapshot])

  // ── Handle disable ────────────────────────────────────────────────────
  const prevEnabled = useRef(enabled)
  useEffect(() => {
    if (prevEnabled.current && !enabled) {
      restoreSnapshot()
      toast.info('已关闭一页模式，已恢复原始设置')
    }
    prevEnabled.current = enabled
  }, [enabled, restoreSnapshot])

  // ── Reset (for template switch) ───────────────────────────────────────
  const reset = useCallback(() => {
    if (snapshot) {
      restoreSnapshot()
    }
    setStatus('idle')
  }, [snapshot, restoreSnapshot])

  // ── Auto-fit algorithm ────────────────────────────────────────────────
  const runFit = useCallback(() => {
    const el = contentRef.current
    if (!el || !enabled || targetHeightRef.current === 0) return
    if (fittingRef.current) return
    fittingRef.current = true

    const limits = ONE_PAGE_LIMITS[strategy]

    // Manual mode reports the actual fit without changing the user's values.
    if (strategy === 'manual') {
      setStatus(el.scrollHeight <= targetHeightRef.current ? 'fit' : 'overflow')
      fittingRef.current = false
      return
    }

    // Readability mode may raise an existing theme to its recommended floor.
    // One-page-first mode intentionally preserves legacy compact values so
    // enabling the feature cannot silently reflow an existing resume.
    if (strategy === 'readability' && (theme.lineHeight < limits.lineHeight || theme.fontSize < limits.fontSize || theme.spacingScale < limits.spacingScale)) {
      setStatus('fitting')
      patchTheme({
        lineHeight: Math.max(limits.lineHeight, theme.lineHeight),
        fontSize: Math.max(limits.fontSize, theme.fontSize),
        spacingScale: Math.max(limits.spacingScale, theme.spacingScale),
      })
      fittingRef.current = false
      return
    }

    const targetH = targetHeightRef.current
    const contentH = el.scrollHeight

    if (contentH <= targetH) {
      setStatus('fit')
      overflowToastShown.current = false
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
    if (spacingScale > limits.spacingScale + STEP_SPACING / 2) {
      spacingScale = Math.max(limits.spacingScale, +(spacingScale - STEP_SPACING).toFixed(1))
      adjusted = true
    }
    // Priority 2: reduce lineHeight
    else if (lineHeight > limits.lineHeight + STEP_LINE_HEIGHT / 2) {
      lineHeight = Math.max(limits.lineHeight, +(lineHeight - STEP_LINE_HEIGHT).toFixed(1))
      adjusted = true
    }
    // Priority 3: reduce fontSize
    else if (fontSize > limits.fontSize) {
      fontSize = Math.max(limits.fontSize, fontSize - STEP_FONT_SIZE)
      adjusted = true
    }

    if (adjusted) {
      setStatus('fitting')
      patchTheme({ spacingScale, lineHeight, fontSize })
    } else {
      setStatus('overflow')
      if (!overflowToastShown.current) {
        toast.warning('已达到可读性下限，建议精简内容或保留分页')
        overflowToastShown.current = true
      }
    }

    fittingRef.current = false
  }, [contentRef, enabled, strategy, theme.spacingScale, theme.lineHeight, theme.fontSize, patchTheme])

  // ── ResizeObserver: watch content height ──────────────────────────────
  useEffect(() => {
    const el = contentRef.current
    if (!el || !enabled) return

    const observer = new ResizeObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        runFit()
      }, DEBOUNCE_MS)
    })

    observer.observe(el)

    // Run immediately in case the element is already rendered.
    const initialTimer = setTimeout(() => runFit(), DEBOUNCE_MS)

    return () => {
      observer.disconnect()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      clearTimeout(initialTimer)
    }
  }, [contentRef, enabled, runFit])

  return { status, reset }
}
