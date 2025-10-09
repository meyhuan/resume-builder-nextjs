# SectionContainer Usage Guide

## Overview

`SectionContainer` is a reusable v2 component that wraps section content with **consistent hover effects** across all templates. All styling is hardcoded to ensure a uniform user experience.

## Consistent Hover Effects

All templates share the same hardcoded hover behavior:
- ✅ **Spacing**: `mb-5` (bottom margin)
- ✅ **Padding**: `p-4` (consistent padding)
- ✅ **Border**: `2px solid transparent` (base state)
- ✅ **Border on hover**: Theme color with 20% opacity (`${themeColor}20`)
- ✅ **Background on hover**: Light gray with 50% opacity (`rgba(249, 250, 251, 0.5)`)
- ✅ **Shadow on hover**: Subtle shadow (`shadow-sm`)
- ✅ **Rounded corners**: `rounded-lg` (always applied)
- ✅ **Transition**: 200ms smooth animation

## Quick Start

### Use in Template

```tsx
import { SectionContainer } from '@/templates/components/v2'

function MySection(props) {
  return (
    <SectionContainer themeColor={props.themeColor}>
      {/* Your section content */}
      <SectionHeader {...headerProps} />
      <div>{children}</div>
    </SectionContainer>
  )
```

## Props

### SectionContainerProps

```typescript
interface SectionContainerProps {
  readonly children: ReactNode   // Section content
  readonly themeColor: string    // Current theme color (e.g., '#3b82f6')
}
```

**No configuration needed!** All styling is hardcoded for consistency.

## Usage Examples

### Example 1: Simple Section

```tsx
<SectionContainer themeColor={theme.primary}>
  <SectionHeader title="Education" />
  <div className="space-y-3">
    {educationBlocks.map(block => (
      <BlockRenderer key={block.id} block={block} />
    ))}
  </div>
</SectionContainer>
```

### Example 2: With Dynamic Content

```tsx
function EducationSection({ sectionId, themeColor }) {
  const blocks = useAppStore(s => s.getBlocksBySectionId(sectionId))
  
  return (
    <SectionContainer themeColor={themeColor}>
      <SectionHeader title="Education" />
      {blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </SectionContainer>
  )
}
```

### Example 3: All Templates

All templates use the **exact same hover effect**:
- Same spacing, padding, border
- Same hover colors and shadow
- Same rounded corners
- Same transition timing

## Benefits

- ✅ **Zero configuration** - No config needed, works out of the box
- ✅ **Consistent UX** - All templates share identical hover behavior
- ✅ **Centralized logic** - All styling in one component
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Theme-aware** - Automatic theme color integration
- ✅ **Simplified codebase** - No per-template configuration files

## Migration from v1

**Before (v1 with configuration):**
```tsx
<SectionContainer 
  themeColor={themeColor} 
  styles={TEMPLATE_STYLES.sectionContainer}
>
  {children}
</SectionContainer>
```

**After (v2 - no config):**
```tsx
<SectionContainer themeColor={themeColor}>
  {children}
</SectionContainer>
```

**Even simpler!** No need to pass style configs anymore.
