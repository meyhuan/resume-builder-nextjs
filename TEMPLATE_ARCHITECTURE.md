# 模板架构设计文档

## 概述

本文档描述了简历构建器的模板系统架构，确保编辑功能在多个模板之间的可复用性和可维护性。

## 架构原则

### 1. 关注点分离 (Separation of Concerns)

```
┌─────────────────────────────────────────────────┐
│          Template Layer (模板层)                 │
│  - 只关注布局和视觉样式                           │
│  - 定义组件的排列方式                             │
│  - 使用纯展示组件                                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│       Editing Layer (编辑逻辑层)                 │
│  - EditableBlockWrapper: 内容编辑                │
│  - EditableFieldWrapper: 字段编辑                │
│  - 统一的编辑状态管理                             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│      Display Layer (展示组件层)                  │
│  - 纯展示组件，不包含编辑逻辑                      │
│  - 接收数据和样式props                            │
│  - 可被多个模板复用                                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         Data Layer (数据层)                      │
│  - Zustand Store                                │
│  - Resume Data Model                            │
└─────────────────────────────────────────────────┘
```

## 核心组件

### 1. EditableBlockWrapper

**用途：** 为内容块（如工作描述、项目描述）添加编辑功能

**特点：**
- ✅ 独立的编辑状态管理
- ✅ 统一的编辑UI（浮动工具栏）
- ✅ 可配置内容字段和样式大小
- ✅ 自动保存到 Store

**使用示例：**
```tsx
<EditableBlockWrapper 
  blockId={block.id} 
  contentField="contentHtml"
  contentSize="xs"
>
  {({ isEditing, onStartEdit }) => (
    // 可选：自定义渲染逻辑
    // 默认情况下，wrapper 会自动处理显示和编辑
  )}
</EditableBlockWrapper>
```

### 2. EditableFieldWrapper

**用途：** 为单行文本字段（如公司名称、职位）添加编辑功能

**特点：**
- ✅ 点击即可编辑
- ✅ 支持 Enter 保存、Esc 取消
- ✅ 失焦自动保存
- ✅ 可自定义样式

**使用示例：**
```tsx
<EditableFieldWrapper
  blockId={block.id}
  fieldName="company"
  value={block.company}
  onUpdate={(value) => updateBlock({ company: value })}
  className="font-semibold text-base"
  title="点击编辑公司名称"
/>
```

### 3. 纯展示组件（待创建）

**命名规范：** `*Display.tsx` (例如 `ExperienceDisplay.tsx`)

**特点：**
- ✅ 只接收数据props
- ✅ 不包含任何编辑逻辑
- ✅ 不依赖 Store
- ✅ 可被多个模板使用

**示例结构：**
```tsx
interface ExperienceDisplayProps {
  readonly company: string
  readonly position: string
  readonly startDate: string
  readonly endDate: string
  readonly industry?: string
  readonly contentHtml: string
  readonly themeColor?: string
  readonly layout?: 'horizontal' | 'vertical'
}

export function ExperienceDisplay(props: ExperienceDisplayProps) {
  // 只负责渲染，不包含编辑逻辑
  return (
    <div>
      <h3>{props.company}</h3>
      <p>{props.position}</p>
      {/* ... */}
    </div>
  )
}
```

## 模板开发指南

### 创建新模板的步骤

#### 1. 创建模板目录结构

```
src/templates/
├── simple/              # 简约模板
│   └── index.tsx
├── modern/              # 现代模板（新增）
│   └── index.tsx
└── professional/        # 专业模板（新增）
    └── index.tsx
```

#### 2. 在新模板中使用编辑组件

```tsx
// src/templates/modern/index.tsx
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { ExperienceDisplay } from '@/components/displays/experience-display'

export default function ModernTemplate() {
  return (
    <div className="modern-template-layout">
      {sections.map(section => (
        section.blocks.map(block => {
          if (block.type === 'experience') {
            return (
              <div key={block.id} className="experience-card">
                {/* 字段编辑 */}
                <h3>
                  <EditableFieldWrapper
                    blockId={block.id}
                    fieldName="company"
                    value={block.company}
                    className="text-2xl font-bold"
                  />
                </h3>
                
                <p>
                  <EditableFieldWrapper
                    blockId={block.id}
                    fieldName="position"
                    value={block.position}
                    className="text-lg text-gray-600"
                  />
                </p>
                
                {/* 内容编辑 */}
                <EditableBlockWrapper
                  blockId={block.id}
                  contentField="contentHtml"
                  contentSize="xs"
                />
              </div>
            )
          }
          return null
        })
      ))}
    </div>
  )
}
```

#### 3. 模板配置

```tsx
// src/templates/template-config.ts
export interface TemplateConfig {
  readonly id: string
  readonly name: string
  readonly preview: string
  readonly component: React.ComponentType
}

export const templates: TemplateConfig[] = [
  {
    id: 'simple',
    name: '简约模板',
    preview: '/previews/simple.png',
    component: SimpleTemplate,
  },
  {
    id: 'modern',
    name: '现代模板',
    preview: '/previews/modern.png',
    component: ModernTemplate,
  },
  // ... 可以添加几十个模板
]
```

## 样式系统

### 共享样式常量

所有编辑相关的样式都在 `src/editor/editor-styles.ts` 中定义：

```typescript
// 内容显示样式
export const CONTENT_DISPLAY_STYLES_XS
export const CONTENT_DISPLAY_STYLES_SM

// 内容编辑样式
export const CONTENT_EDITING_STYLES_XS
export const CONTENT_EDITING_STYLES_SM
```

### 模板自定义样式

模板可以添加自己的样式类，但应该：
- ✅ 使用 Tailwind CSS utility classes
- ✅ 不覆盖编辑功能的交互样式
- ✅ 使用主题色变量（通过 props 传递）

## 最佳实践

### ✅ DO (推荐做法)

1. **使用 EditableBlockWrapper 和 EditableFieldWrapper**
   - 所有编辑功能通过这两个组件实现
   - 不要在模板中重复编辑逻辑

2. **创建纯展示组件**
   - 如果需要自定义布局，创建纯展示组件
   - 展示组件应该是无状态的

3. **使用共享样式**
   - 从 `editor-styles.ts` 导入样式常量
   - 保持编辑体验一致

4. **模板只关注布局**
   - 使用 CSS Grid/Flexbox 定义布局
   - 使用 Tailwind classes 定义样式
   - 不包含业务逻辑

### ❌ DON'T (避免做法)

1. **不要在模板中重复编辑逻辑**
   ```tsx
   // ❌ 错误示例
   const [isEditing, setIsEditing] = useState(false)
   // ... 重复的编辑状态管理
   ```

2. **不要直接操作 Store**
   ```tsx
   // ❌ 错误示例
   const setResume = useAppStore(s => s.setResume)
   setResume(draft => { /* ... */ })
   ```

3. **不要硬编码样式类**
   ```tsx
   // ❌ 错误示例
   className="text-xs leading-relaxed text-gray-800 ..."
   
   // ✅ 正确示例
   className={CONTENT_DISPLAY_STYLES_XS}
   ```

## 扩展性

### 添加新的编辑功能

如果需要添加新的编辑功能（如图片上传、颜色选择器），应该：

1. 在 `src/editor/` 下创建新的 wrapper 组件
2. 组件应该是通用的，可被所有模板使用
3. 更新本文档说明新组件的用法

### 添加新的 Block 类型

1. 在 `src/entities/` 下定义新的 block 类型
2. 创建对应的纯展示组件
3. 更新 `EditableBlockWrapper` 支持新的字段（如需要）
4. 所有模板自动获得编辑能力

## 性能优化

### 建议

1. **使用 React.memo** 包装纯展示组件
2. **避免不必要的重渲染** - 使用 `useCallback` 和 `useMemo`
3. **虚拟化长列表** - 如果简历很长，考虑使用虚拟滚动

## 总结

这个架构的核心优势：

✅ **高度可复用** - 编辑功能一次实现，所有模板共享
✅ **易于维护** - 编辑逻辑集中管理
✅ **快速开发** - 新模板只需关注布局和样式
✅ **一致体验** - 所有模板的编辑体验完全一致
✅ **类型安全** - 完整的 TypeScript 类型支持

无论添加多少个模板，编辑功能都不需要重复实现！
