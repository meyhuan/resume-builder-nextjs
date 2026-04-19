/**
 * Kernel Template Schema
 *
 * A resume template is declared as a single config object that is consumed by
 * `TemplateRuntime` to render the whole resume. All heavy lifting (DnD, base
 * info edit modal, block editors, section drag, AI actions, pagination) is
 * reused from existing atoms — the kernel just orchestrates them.
 *
 * Extending the kernel:
 * - A new header look → add a `HeaderSpec` case + a render branch in `headers.tsx`.
 * - A new section header look → add a `SectionHeaderSpec` case + a branch in `section-headers.tsx`.
 * - A new block layout → add a `BlockSpec` case + a branch in `block-views.tsx`.
 * - A new decoration (skill bars, rings, dot pattern) → add to `decorations.tsx`
 *   and reference it through `SidebarSpec.skillStyle` etc.
 */

/** Two-column sidebar side. */
export type SidebarSide = 'left' | 'right'

/** Avatar shape presets. */
export type AvatarShape = 'square' | 'rounded' | 'circle' | 'rounded-bottom'

// ---------------------------------------------------------------------------
// Header variants
// ---------------------------------------------------------------------------

export interface HeaderAvatarLeftInline {
  readonly variant: 'avatar-left-inline'
  readonly avatarShape?: AvatarShape
  readonly avatarSize?: { width: number; height: number }
  /** Separator string between inline info fields, e.g. `|`, `·`, `、`. */
  readonly separator?: string
  /** Number of fields per inline row (wraps automatically if more). */
  readonly fieldsPerRow?: number
  /** Tagline (English sub-title) shown next to the name. */
  readonly tagline?: string
}

export interface HeaderBannerGradient {
  readonly variant: 'banner-gradient'
  readonly from: string
  readonly to: string
  readonly direction?: 'to-right' | 'to-bottom' | 'diagonal'
  readonly avatarShape?: AvatarShape
  readonly avatarPosition?: 'overlap-left' | 'inline-left' | 'hidden'
  readonly nameColor?: string
  readonly fieldColor?: string
  readonly separator?: string
}

export interface HeaderDarkBar {
  readonly variant: 'dark-bar'
  readonly backgroundColor: string
  readonly accentStripe?: boolean
  readonly tagline?: string
  readonly avatarShape?: AvatarShape
}

export interface HeaderSidebarAvatar {
  readonly variant: 'sidebar-avatar'
  readonly avatarShape?: AvatarShape
  readonly avatarSize?: { width: number; height: number }
  /** Whether to show the name block inside the sidebar. */
  readonly showName?: boolean
  /** Optional decorative blob behind the avatar. */
  readonly decorBlob?: { color: string; offsetX?: number; offsetY?: number }
  /** Optional quote mark decoration below avatar. */
  readonly quoteMark?: boolean
}

export interface HeaderCentered {
  readonly variant: 'centered'
  readonly avatarShape?: AvatarShape
}

export type HeaderSpec =
  | HeaderAvatarLeftInline
  | HeaderBannerGradient
  | HeaderDarkBar
  | HeaderSidebarAvatar
  | HeaderCentered

// ---------------------------------------------------------------------------
// Section header variants
// ---------------------------------------------------------------------------

export interface SectionHeaderUnderline {
  readonly variant: 'underline'
  readonly color?: string
  readonly thickness?: number
}

export interface SectionHeaderLeftBar {
  readonly variant: 'left-bar'
  readonly color?: string
  readonly fillGradient?: boolean
}

export interface SectionHeaderRibbonBanner {
  readonly variant: 'ribbon-banner'
  readonly from: string
  readonly to: string
  readonly angleTail?: boolean
  readonly height?: number
}

export interface SectionHeaderDotBefore {
  readonly variant: 'dot-before'
  readonly dotColor?: string
}

export interface SectionHeaderPlainBold {
  readonly variant: 'plain-bold'
}

export type SectionHeaderSpec =
  | SectionHeaderUnderline
  | SectionHeaderLeftBar
  | SectionHeaderRibbonBanner
  | SectionHeaderDotBefore
  | SectionHeaderPlainBold

// ---------------------------------------------------------------------------
// Block layout variants
// ---------------------------------------------------------------------------

export interface BlockDefault {
  readonly variant: 'default'
}

export interface BlockTimelineLeftDate {
  readonly variant: 'timeline-left-date'
  readonly dotColor?: string
  readonly axisColor?: string
  readonly dateWidth?: number
}

export interface BlockCompact {
  readonly variant: 'compact'
}

export type BlockSpec = BlockDefault | BlockTimelineLeftDate | BlockCompact

// ---------------------------------------------------------------------------
// Sidebar / decorations
// ---------------------------------------------------------------------------

export type SkillRenderStyle = 'text' | 'bars' | 'rings' | 'dots'

export interface SidebarSpec {
  /** Side the sidebar lives on. */
  readonly side: SidebarSide
  /** Width in percent (e.g. 32). */
  readonly widthPercent: number
  /** Background color of the sidebar column. */
  readonly backgroundColor?: string
  /** Padding override for sidebar (in mm). */
  readonly padding?: { vertical: number; horizontal: number }
  /** Section title keywords that should default to the sidebar. */
  readonly defaultSectionKeywords?: readonly string[]
  /** How to render "技能/skills"-like sections inside the sidebar. */
  readonly skillStyle?: SkillRenderStyle
  /** Accent color used by decorations (skill bars / rings). */
  readonly skillAccentColor?: string
}

// ---------------------------------------------------------------------------
// Top-level config
// ---------------------------------------------------------------------------

export interface PageSpec {
  readonly backgroundColor?: string
  readonly mainBackgroundColor?: string
  /** If true, header bleeds to the page edges (no resume padding above). */
  readonly bleed?: boolean
  /** Padding override in mm (else use theme.pagePaddingVertical/Horizontal). */
  readonly paddingOverride?: { vertical?: number; horizontal?: number }
}

export interface JobIntentionPlacement {
  readonly placement: 'header-row' | 'body-top' | 'sidebar' | 'hidden'
}

export interface KernelTemplateConfig {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly preview?: string
  readonly tags?: readonly string[]
  readonly layout: 'single-column' | 'two-column'
  /** Required when layout === 'two-column'. */
  readonly sidebar?: SidebarSpec
  readonly page?: PageSpec
  readonly header: HeaderSpec
  readonly jobIntention?: JobIntentionPlacement
  readonly sectionHeader: SectionHeaderSpec
  readonly block: BlockSpec
  readonly accents?: {
    readonly primary?: string
    readonly secondary?: string
  }
  /** Optional Google font / remote font URL to inject. */
  readonly fontFaceUrl?: string
}
