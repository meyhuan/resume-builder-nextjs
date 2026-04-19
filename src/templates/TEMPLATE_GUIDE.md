# 模板开发规范

## 间距设置必须响应主题

所有新模板**必须**使用 `usePagePadding` 钩子来处理页边距，确保 `theme-panel.tsx` 中的以下设置对用户生效：

- `pagePaddingVertical` — 上下边距
- `pagePaddingHorizontal` — 左右边距

### 正确示例

```tsx
import { ResumeFrame, usePagePadding } from '@/templates/_core'

export default function MyTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const pagePad = usePagePadding(theme, 24, 32) // minVertical, minHorizontal

  return (
    <ResumeFrame resume={resume} theme={theme}>
      {/* 主内容区使用动态 padding */}
      <main style={pagePad}>
        {/* ... */}
      </main>
    </ResumeFrame>
  )
}
```

### 禁止做法

```tsx
// ❌ 硬编码 padding 会导致 theme-panel 设置失效
<div style={{ padding: '44px 56px' }}>
```

## 检查清单（Code Review 必检项）

新模板提交前必须确认：

- [ ] 使用了 `usePagePadding(theme)` 而非硬编码 padding
- [ ] 字号/行高未硬编码（继承自 `ResumeFrame` 的 CSS vars）
- [ ] `spacingScale` 正确传递给 `BlockList` 组件
- [ ] 如果是旗舰模板，设置 `locksPrimaryColor: true` 并禁用主题色
