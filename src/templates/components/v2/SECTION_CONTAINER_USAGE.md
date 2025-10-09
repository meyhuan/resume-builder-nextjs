# SectionContainer Usage Guide

## Overview

`SectionContainer` is a reusable v2 component that wraps section content with configurable hover effects and styling. It's controlled via the `TemplateStylesConfig.sectionContainer` property.

## Quick Start

### 1. Define Style Config

```typescript
// src/templates/styles/my-template-styles.ts
export const MY_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'my-template',
  
  sectionContainer: {
    spacing: 'mb-6',
    padding: 'p-4',
    borderRadius: 'rounded-lg',
    border: '2px solid transparent',
    hover: {
      enabled: true,
      shadow: 'shadow-md',
      borderColor: '{{themeColor}}20',  // Use theme color with opacity
      backgroundColor: 'rgba(249, 250, 251, 0.5)',
    },
  },
  
  // ... other configs
}
```

### 2. Use in Template

```tsx
import { SectionContainer } from '@/templates/components/v2'
import { MY_TEMPLATE_STYLES } from '@/templates/styles/my-template-styles'

function MySection(props) {
  return (
    <SectionContainer 
      themeColor={props.themeColor} 
      styles={MY_TEMPLATE_STYLES.sectionContainer}
    >
      {/* Your section content */}
      <SectionHeader {...headerProps} />
      <div>{children}</div>
    </SectionContainer>
  )
}
```

## Configuration Options

### SectionContainerStyles

```typescript
interface SectionContainerStyles {
  container?: string           // Base className
  spacing?: string            // Margin (e.g., 'mb-6')
  border?: string             // Border style (e.g., '2px solid transparent')
  borderRadius?: string       // Border radius (e.g., 'rounded-lg')
  padding?: string            // Padding (e.g., 'p-4')
  background?: string         // Background color
  hover?: {
    enabled?: boolean         // Enable/disable hover (default: true)
    shadow?: string           // Tailwind shadow class (e.g., 'shadow-md')
    borderColor?: string      // Border color on hover, supports {{themeColor}}
    backgroundColor?: string  // Background color on hover
    scale?: string            // Scale transform (e.g., '1.02')
  }
}
```

## Examples

### Example 1: Hover with Shadow (Clean Professional)

```typescript
sectionContainer: {
  spacing: 'mb-6',
  padding: 'p-4',
  borderRadius: 'rounded-lg',
  border: '2px solid transparent',
  hover: {
    enabled: true,
    shadow: 'shadow-sm',
    borderColor: '{{themeColor}}20',
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
  },
}
```

### Example 2: No Hover (Simple Template)

```typescript
sectionContainer: {
  hover: {
    enabled: false,
  },
}
```

### Example 3: Hover with Scale

```typescript
sectionContainer: {
  padding: 'p-6',
  borderRadius: 'rounded-xl',
  border: '1px solid #e5e7eb',
  hover: {
    enabled: true,
    shadow: 'shadow-lg',
    borderColor: '{{themeColor}}40',
    backgroundColor: 'white',
    scale: '1.02',
  },
}
```

### Example 4: Card Style with Background

```typescript
sectionContainer: {
  spacing: 'mb-4',
  padding: 'p-5',
  borderRadius: 'rounded-lg',
  background: 'linear-gradient(to right, #f9fafb, #ffffff)',
  border: '1px solid #e5e7eb',
  hover: {
    enabled: true,
    shadow: 'shadow-md',
    scale: '1.01',
  },
}
```

## Dynamic Theme Color

Use the `{{themeColor}}` placeholder in `borderColor` to automatically inject the current theme color:

```typescript
borderColor: '{{themeColor}}20'  // Becomes: #3b82f620 (blue-500 with 20% opacity)
```

The component replaces `{{themeColor}}` with the actual `themeColor` prop value.

## Template Examples

### Clean Professional (Enabled)
✅ Hover effect with subtle shadow and border
```typescript
hover: { enabled: true, shadow: 'shadow-sm' }
```

### Simple & Professional (Disabled)
❌ No hover effects for traditional look
```typescript
hover: { enabled: false }
```

## Benefits

- ✅ **Centralized styling** - Change hover effects in one config file
- ✅ **Consistent behavior** - All sections use same hover logic
- ✅ **Easy to customize** - Per-template hover effects
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Theme-aware** - Automatic theme color integration

## Migration from Inline Styles

**Before (Inline):**
```tsx
<section
  className="mb-6 p-4 rounded-lg hover:shadow-sm"
  style={{ border: '2px solid transparent' }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = `${themeColor}20`
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = 'transparent'
  }}
>
  {children}
</section>
```

**After (v2):**
```tsx
<SectionContainer themeColor={themeColor} styles={TEMPLATE_STYLES.sectionContainer}>
  {children}
</SectionContainer>
```
