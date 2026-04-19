/**
 * Internal type definitions used by _kernel implementation modules that are
 * still imported by `_core/` (notably `block-views.tsx`).
 *
 * Everything else (old HeaderSpec / SectionHeaderSpec / SidebarSpec / PageSpec /
 * KernelTemplateConfig) was removed together with the legacy config-driven
 * templates. Only the block variants remain because `_core/primitives/block-list.tsx`
 * still delegates row rendering to `KernelBlockRow`.
 */

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
