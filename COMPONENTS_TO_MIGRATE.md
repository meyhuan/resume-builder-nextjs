# Components to Migrate to shadcn/ui 📋

**Analysis Date:** 2025-10-03  
**Status:** Found custom components that should use shadcn/ui  

---

## Priority 1: Main UI Components 🔴

### 1. **App.tsx** - Export Buttons
**Location:** `src/App.tsx` lines 81-94

**Current:**
```tsx
<button className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50">
  Export PDF
</button>
```

**Should be:**
```tsx
<Button variant="outline" size="sm">Export PDF</Button>
```

**Impact:** High - Main UI buttons
**Effort:** Easy - 2 buttons

---

### 2. **Section Header** - Action Buttons
**Location:** `src/components/sections/section-header.tsx`

**Current:** 3 custom buttons (Add, Delete, Drag)
```tsx
<button className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100">
  <svg>...</svg>
  <span>添加</span>
</button>
```

**Should be:**
```tsx
<Button variant="ghost" size="sm" className="h-7">
  <Plus className="h-3 w-3" />
  添加
</Button>
```

**Impact:** High - Used in every section
**Effort:** Medium - 3 buttons + icons

---

### 3. **Block Actions** - Hover Toolbar
**Location:** `src/components/blocks/block-actions.tsx`

**Current:** 5 custom buttons (Add, Polish, Delete, Move Up, Move Down)
```tsx
<button className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100">
  <svg>...</svg>
  <span>添加工作经历</span>
</button>
```

**Should be:**
```tsx
<Button variant="ghost" size="sm" className="h-7">
  <PlusCircle className="h-3 w-3" />
  添加工作经历
</Button>
```

**Impact:** High - Used on every block
**Effort:** Medium - 5 buttons + icons

---

### 4. **Inline Toolbar** - Text Formatting
**Location:** `src/editor/inline-toolbar.tsx`

**Current:** 10 custom buttons (Bold, Italic, List, Align, etc.)
```tsx
<button className="p-1.5 text-sm rounded hover:bg-gray-100 font-bold">
  B
</button>
```

**Should be:**
```tsx
<Button variant="ghost" size="icon" className="h-7 w-7">
  <Bold className="h-4 w-4" />
</Button>
```

**Impact:** Medium - Editor toolbar
**Effort:** High - 10 buttons + need Toggle component

---

## Priority 2: Color-Related Components 🟡

### 5. **Theme Panel** - Color Inputs
**Location:** `src/ui/theme-panel.tsx`

**Current:** HTML color input
```tsx
<input type="color" className="w-12 h-8 rounded cursor-pointer" />
```

**Should be:**
Consider keeping as-is OR wrap in custom ColorPicker component
**Impact:** Low - Works fine
**Effort:** N/A - Not necessary

---

## Components Already Migrated ✅

- ✅ **base-info-modal.tsx** - Full shadcn Dialog
- ✅ **job-intention-modal.tsx** - Full shadcn Dialog
- ✅ **right-sidebar.tsx** - Tabs, Badge, Button, Card
- ✅ **theme-panel.tsx** - Slider, Label, Input, Select

---

## Migration Priority Summary 🎯

### Must Migrate (User-Facing)
1. **App.tsx export buttons** - Users click these often
2. **Section Header** - Visible on hover, used frequently
3. **Block Actions** - Core editing functionality

### Should Migrate (Consistency)
4. **Inline Toolbar** - For consistent design

### Optional
5. **Color inputs** - Work fine as-is

---

## Recommended Migration Order 📝

### Step 1: App.tsx Buttons (5 min)
- Replace 2 export buttons with shadcn Button
- **Benefit:** Consistent header UI

### Step 2: Section Header (15 min)
- Replace 3 action buttons
- Use lucide-react icons
- **Benefit:** Unified section actions

### Step 3: Block Actions (15 min)
- Replace 5 action buttons
- Use lucide-react icons
- **Benefit:** Consistent hover actions

### Step 4: Inline Toolbar (30 min)
- Replace 10 formatting buttons
- Consider using Toggle component
- **Benefit:** Professional editor toolbar

**Total estimated time:** ~1 hour

---

## Icon Mapping (lucide-react) 🎨

Current SVGs → lucide-react icons:

| Current | lucide-react |
|---------|-------------|
| Plus circle SVG | `<PlusCircle />` |
| Trash SVG | `<Trash2 />` |
| Menu/Drag SVG | `<GripVertical />` |
| Star SVG | `<Sparkles />` (AI Polish) |
| Arrow up SVG | `<ArrowUp />` |
| Arrow down SVG | `<ArrowDown />` |
| Bold "B" | `<Bold />` |
| Italic "I" | `<Italic />` |
| Underline "U" | `<Underline />` |
| Bullet list | `<List />` |
| Number list | `<ListOrdered />` |
| Indent | `<IndentIncrease />` |
| Outdent | `<IndentDecrease />` |
| Align left | `<AlignLeft />` |
| Align center | `<AlignCenter />` |
| Align right | `<AlignRight />` |

---

## Benefits of Migration 🌟

### Consistency
- All buttons use same theme
- Uniform sizing and spacing
- Consistent hover states

### Purple Theme
- Focus rings match theme
- Hover colors match theme
- Pressed states match theme

### Accessibility
- Better ARIA labels
- Keyboard navigation
- Screen reader support

### Maintainability
- Less custom CSS
- Reusable components
- Single source of truth

---

## Code Size Impact 📊

### Before
- Custom button classes everywhere
- Inline SVGs (verbose)
- Manual focus states

### After
- Simple `<Button>` components
- Icon components (clean)
- Auto focus states

**Estimated code reduction:** 30-40%

---

## Next Steps 🚀

Want me to:
1. ✅ Migrate App.tsx export buttons?
2. ✅ Migrate Section Header buttons?
3. ✅ Migrate Block Actions buttons?
4. ✅ Migrate Inline Toolbar buttons?

Or pick specific components to start with!

---

Last updated: 2025-10-03 22:40
