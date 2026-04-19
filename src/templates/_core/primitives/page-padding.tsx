import type { CSSProperties } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/** Convert mm to CSS px (96 DPI, 1mm ≈ 3.78px). */
export function mmToPx(mm: number): number {
  return Math.round(mm * 3.78)
}

/**
 * Build inline padding styles from theme page padding settings.
 * Honor user preferences while ensuring minimum breathing room for readability.
 *
 * ⚠️ IMPORTANT: New templates MUST use this instead of hardcoded padding
 * (e.g., `padding: '44px 56px'`). Hardcoded values ignore user's theme-panel
 * settings for pagePaddingVertical / pagePaddingHorizontal.
 *
 * @example
 * const pagePad = usePagePadding(theme, 24, 32)
 * return <main style={pagePad}>...</main>
 */
export function usePagePadding(
  theme: ThemeTokens,
  minVertical = 24,
  minHorizontal = 32
): CSSProperties {
  const v = Math.max(minVertical, mmToPx(theme.pagePaddingVertical))
  const h = Math.max(minHorizontal, mmToPx(theme.pagePaddingHorizontal))
  return { paddingTop: v, paddingBottom: v, paddingLeft: h, paddingRight: h }
}

/**
 * Convenience: horizontal padding only (for inner containers that shouldn't
 * double-pad against the outer page frame).
 */
export function usePagePaddingHorizontal(theme: ThemeTokens, min = 32): CSSProperties {
  const h = Math.max(min, mmToPx(theme.pagePaddingHorizontal))
  return { paddingLeft: h, paddingRight: h }
}
