# Design System & Style Guide 🎨

## Core Philosophy
**Style Name:** AI Cyberpunk / Modern SaaS
**Keywords:** Futuristic, Clean, vibrant, Glassmorphism, Motion
**Visual Identity:** A blend of professional clean layouts with vibrant, glowing accents (Violet/Fuchsia) to signify "AI Magic".

## 1. Color Palette

### Primary Colors (Brand)
- **Violet (Primary):** `violet-600` (#7c3aed) - Used for primary actions, active states, and branding.
- **Fuchsia (Secondary):** `fuchsia-500` (#d946ef) - Used for gradients and accents.
- **Gradient:** Linear gradient from `violet-600` to `fuchsia-500`.

### Neutral Colors
- **Background:** `white` (#ffffff)
- **Foreground (Text):** `slate-900` (#0f172a) - Headings, strong text.
- **Muted Text:** `slate-600` (#475569) - Body text.
- **Border:** `slate-200` (#e2e8f0) or `white/20` (on dark/glass backgrounds).

### Semantic Colors
- **Success:** `green-500`
- **Warning:** `amber-400`
- **Error:** `rose-500`
- **Info:** `cyan-400`

## 2. Typography

### Font Family
- **English:** Inter, system-ui, sans-serif
- **Chinese:** Noto Sans SC, Microsoft YaHei, sans-serif

### Scale
- **H1 (Hero):** 5xl - 7xl, Bold, Tracking-tight
- **H2 (Section):** 3xl - 4xl, Bold
- **H3 (Card):** xl - 2xl, Semibold
- **Body:** base (16px) or lg (18px), Relaxed line-height

## 3. UI Components

### Buttons
**Rounded:** Full pill shape (`rounded-full`) or `rounded-lg` for utilitarian buttons.

- **Primary:** 
  - Background: Gradient `bg-gradient-to-r from-violet-600 to-fuchsia-500`
  - Text: White
  - Shadow: `shadow-[0_0_20px_rgba(124,58,237,0.3)]`
  - Hover: Scale 1.05, Shadow increase

- **Glass (Special):**
  - Background: `bg-white/70`
  - Blur: `backdrop-blur-lg`
  - Border: `border-white/50`
  - Text: `violet-900`

- **Ghost:**
  - Text: `gray-600`
  - Hover: `bg-violet-50` text `violet-600`

### Cards & Containers
- **Shape:** `rounded-2xl` or `rounded-3xl`
- **Style:** Clean white with subtle shadows for standard cards.
- **Glass Card:** `bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl`
- **Hover:** Lift effect (`-translate-y-1`) and shadow increase.

## 4. Visual Effects

### Glassmorphism
Used heavily in headers, floating elements, and overlays.
- Class: `bg-white/60 backdrop-blur-xl border-b border-white/20`

### Gradients
- **Text:** `bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500`
- **Blobs/Backgrounds:** Soft, blurred orbs in background (`blur-[120px]`).

### Animations
- **Hover:** `transition-all duration-300 hover:scale-105`
- **Entrance:** `animate-in slide-in-from-bottom duration-700`
- **Ambient:** Floating elements (`animate-float`), Pulsing glows (`animate-pulse-slow`).

## 5. Tailwind Configuration Reference

```css
@theme {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-primary: #7c3aed;
  --color-secondary: #d946ef;
  --radius: 0.75rem;
}
```

## 6. Implementation Examples

### Hero Title
```tsx
<h1 className="text-5xl font-bold tracking-tight">
  Make Resume <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">Magic</span>
</h1>
```

### Primary Button
```tsx
<button className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 hover:scale-105 transition-transform">
  Get Started
</button>
```
