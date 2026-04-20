/**
 * Theme tokens controlling visual style.
 */
export interface ThemeTokens {
  readonly primaryColor: string;
  readonly textColor: string;
  readonly fontFamily: string;
  readonly fontSize: number; // px
  readonly lineHeight: number; // unitless
  readonly spacingScale: number; // multiplier
  readonly pagePaddingVertical: number; // mm
  readonly pagePaddingHorizontal: number; // mm
  /** Multiplier applied to section-heading font sizes. Defaults to 1. */
  readonly titleScale?: number;
  /** First-line indent for block paragraph content, in em. Defaults to 0. */
  readonly paragraphIndent?: number;
  /** When true, the preview attempts to fit the resume into a single page. Placeholder for future auto-fit logic. */
  readonly onePageFit?: boolean;
}
