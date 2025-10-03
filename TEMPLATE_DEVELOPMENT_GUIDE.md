# 模板开发指南 📖

**版本：** 2.0  
**更新时间：** 2025-10-02

---

## 核心原则 🎯

### 1. 使用统一的基础组件
**❌ 不要：** 每个模板独立实现容器和 Section
**✅ 要：** 使用 `TemplateContainer` 和 `TemplateSection`

### 2. 避免硬编码样式
**❌ 不要：** `fontSize: '13px'`, `lineHeight: '1.6'`, `className="gap-6"`
**✅ 要：** 使用 `theme.fontSize`, `theme.lineHeight`, `theme.spacingScale`

### 3. 保持布局一致性
**❌ 不要：** 使用 `flex-1` 让装饰元素占据主要空间
**✅ 要：** 让 SectionHeader 占据全宽或剩余空间

---

## 快速开始 🚀

### 最小化模板示例

```typescript
import type { ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import TemplateContainer from '@/templates/components/template-container'
import TemplateSection from '@/templates/components/template-section'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { useAppStore } from '@/state/store'

interface MyTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

export default function MyTemplate(props: MyTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <TemplateContainer theme={theme}>
      {/* 头部信息 */}
      <header>
        <h1>{resume.name}</h1>
        {/* 添加你的头部内容 */}
      </header>

      {/* 拖拽容器 */}
      <DragDropProvider
        resume={resume}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
      >
        <main style={{ display: 'flex', flexDirection: 'column', gap: `${24 * theme.spacingScale}px` }}>
          {resume.sections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <TemplateSection
                  sectionId={section.id}
                  title={section.title}
                  theme={theme}
                  blockIds={section.blocks.map((b) => b.id)}
                  decorator="line"  // 或 "gradient-bar" 或 "none"
                  dragHandleAttributes={dragProps.attributes}
                  dragHandleListeners={dragProps.listeners}
                  dragHandleRef={dragProps.ref}
                >
                  {section.blocks.map((block) => (
                    <div key={block.id}>
                      {/* 渲染你的 Block 内容 */}
                    </div>
                  ))}
                </TemplateSection>
              )}
            </SortableSectionWrapper>
          ))}
        </main>
      </DragDropProvider>
    </TemplateContainer>
  )
}
```

---

## 基础组件 API 📚

### TemplateContainer
统一的模板容器，自动处理主题设置。

```typescript
<TemplateContainer
  theme={theme}              // 必需：主题对象
  className="custom-class"   // 可选：额外类名
  style={{ maxWidth: '210mm' }}  // 可选：额外样式
>
  {children}
</TemplateContainer>
```

**自动处理：**
- ✅ `fontSize` - 基础字号
- ✅ `lineHeight` - 行间距
- ✅ `fontFamily` - 字体
- ✅ `textColor` - 文字颜色
- ✅ `.resume-container` 类名 - 启用字号覆盖样式

---

### TemplateSection
统一的 Section 组件，处理标题、拖拽、装饰。

```typescript
<TemplateSection
  sectionId={section.id}
  title={section.title}
  theme={theme}
  blockIds={section.blocks.map((b) => b.id)}
  decorator="line"           // 装饰类型：'line' | 'gradient-bar' | 'none'
  decoratorPosition="bottom" // 装饰位置：'top' | 'bottom'
  dragHandleAttributes={dragProps.attributes}
  dragHandleListeners={dragProps.listeners}
  dragHandleRef={dragProps.ref}
>
  {/* Block 内容 */}
</TemplateSection>
```

**装饰选项：**
- `decorator="none"` - 无装饰
- `decorator="line"` - 主题色横线（Professional 风格）
- `decorator="gradient-bar"` - 渐变竖线（Creative 风格）

---

## 开发规范 ✅

### 1. 必须使用的组件
- ✅ `TemplateContainer` - 作为根容器
- ✅ `TemplateSection` - 替代自定义 SectionView
- ✅ `DragDropProvider` - 启用拖拽
- ✅ `SortableSectionWrapper` - Section 排序

### 2. 间距设置规范
```typescript
// ✅ 正确：使用 spacingScale
<main style={{ gap: `${24 * theme.spacingScale}px` }}>

// ❌ 错误：硬编码间距
<main className="space-y-6">
```

### 3. 字号设置规范
```typescript
// ✅ 正确：使用 em 单位（会被 theme-override.css 处理）
<h1 className="text-2xl">标题</h1>

// ✅ 正确：或使用内联样式
<h1 style={{ fontSize: '1.5em' }}>标题</h1>

// ❌ 错误：硬编码 px
<h1 style={{ fontSize: '24px' }}>标题</h1>
```

### 4. 颜色使用规范
```typescript
// ✅ 正确：使用 theme 颜色
<h2 style={{ color: theme.primaryColor }}>标题</h2>

// ❌ 错误：硬编码颜色
<h2 className="text-blue-600">标题</h2>
```

---

## 模板检查清单 ☑️

创建新模板后，请检查：

### 功能检查
- [ ] 使用 `TemplateContainer` 作为根容器
- [ ] 使用 `TemplateSection` 渲染 Section
- [ ] 集成 `DragDropProvider`
- [ ] Section 可以拖拽排序
- [ ] Block 可以拖拽排序
- [ ] Block 可以跨 Section 拖拽

### 主题检查
- [ ] 字号调整生效（10px ~ 24px）
- [ ] 行间距调整生效（1.2 ~ 2.0）
- [ ] 模块间距调整生效（0.8x ~ 1.6x）
- [ ] 字体切换生效
- [ ] 主题色生效
- [ ] 文字色生效

### 布局检查
- [ ] Hover Section 标题时，工具栏显示在**右侧**
- [ ] 装饰元素不影响 SectionHeader 宽度
- [ ] 响应式布局正常
- [ ] 打印样式正常

### 代码质量
- [ ] 无硬编码样式值
- [ ] 无未使用的参数
- [ ] 类型定义完整
- [ ] 组件命名规范
- [ ] 遵循项目代码风格

---

## 常见问题 ❓

### Q: 字号不生效怎么办？
A: 确保使用了 `TemplateContainer`，它会自动添加 `.resume-container` 类名。

### Q: 如何自定义装饰样式？
A: 使用 `decorator="none"`，然后自己添加装饰元素：
```typescript
<TemplateSection decorator="none" ...>
  {/* 自定义装饰 */}
  <div className="custom-decorator" />
</TemplateSection>
```

### Q: 如何添加自定义 Block 渲染？
A: 在 `TemplateSection` 的 children 中自定义渲染：
```typescript
<TemplateSection ...>
  {section.blocks.map((block) => (
    <MyCustomBlockRenderer key={block.id} block={block} />
  ))}
</TemplateSection>
```

---

## 最佳实践示例 💡

### 简洁模板（推荐新模板使用）

```typescript
export default function MinimalTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <TemplateContainer theme={theme}>
      <h1 className="text-2xl font-bold">{resume.name}</h1>
      
      <DragDropProvider {...dragProps}>
        <main style={{ gap: `${24 * theme.spacingScale}px` }}>
          {resume.sections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(drag) => (
                <TemplateSection
                  sectionId={section.id}
                  title={section.title}
                  theme={theme}
                  blockIds={section.blocks.map((b) => b.id)}
                  {...drag}
                >
                  {/* Blocks */}
                </TemplateSection>
              )}
            </SortableSectionWrapper>
          ))}
        </main>
      </DragDropProvider>
    </TemplateContainer>
  )
}
```

---

## 总结 🎉

### 新架构的优势
- ✅ **统一性** - 所有模板使用相同的基础组件
- ✅ **可维护性** - 修复一次，所有模板受益
- ✅ **一致性** - 主题功能自动生效
- ✅ **快速开发** - 复制模板示例，10分钟创建新模板

### 迁移建议
现有模板可以逐步迁移：
1. 先用 `TemplateContainer` 替换根容器
2. 再用 `TemplateSection` 替换 SectionView
3. 测试确认功能正常

---

**开始创建你的第一个模板吧！** 🚀
