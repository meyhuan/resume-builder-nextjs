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
}
