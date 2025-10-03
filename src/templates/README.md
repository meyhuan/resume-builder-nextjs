# 模板开发指南

## 快速开始

### 1. 创建新模板

```bash
# 在 src/templates/ 下创建新目录
mkdir src/templates/my-template
```

### 2. 使用模板骨架

```tsx
// src/templates/my-template/index.tsx
import type { ReactElement } from 'react'
import { useAppStore } from '@/state/store'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'

export default function MyTemplate(): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const theme = useAppStore((s) => s.theme)

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      {/* 基本信息 */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold" style={{ color: theme.primaryColor }}>
          {resume.baseInfo.name}
        </h1>
        <div className="text-gray-600 mt-2">
          {resume.baseInfo.phone} | {resume.baseInfo.email}
        </div>
      </header>

      {/* Section 渲染 */}
      {resume.sections.map((section) => (
        <section key={section.id} className="mb-6">
          <h2 
            className="text-2xl font-semibold mb-4 border-b-2 pb-2"
            style={{ borderColor: theme.primaryColor }}
          >
            {section.title}
          </h2>

          {section.blocks.map((block) => {
            // 根据 block 类型渲染
            if (block.type === 'experience') {
              return (
                <div key={block.id} className="mb-4">
                  {/* 公司名称 - 可编辑 */}
                  <h3 className="text-lg font-semibold">
                    <EditableFieldWrapper
                      blockId={block.id}
                      fieldName="company"
                      value={block.company}
                      onUpdate={() => {}}
                      className="font-semibold"
                      title="点击编辑公司"
                    />
                  </h3>

                  {/* 职位 - 可编辑 */}
                  <p className="text-gray-600">
                    <EditableFieldWrapper
                      blockId={block.id}
                      fieldName="position"
                      value={block.position}
                      onUpdate={() => {}}
                      title="点击编辑职位"
                    />
                  </p>

                  {/* 时间 */}
                  <p className="text-sm text-gray-500">
                    <EditableFieldWrapper
                      blockId={block.id}
                      fieldName="startDate"
                      value={block.startDate}
                      onUpdate={() => {}}
                    />
                    {' - '}
                    <EditableFieldWrapper
                      blockId={block.id}
                      fieldName="endDate"
                      value={block.endDate}
                      onUpdate={() => {}}
                    />
                  </p>

                  {/* 内容 - 可编辑 */}
                  <div className="mt-2">
                    <EditableBlockWrapper
                      blockId={block.id}
                      contentField="contentHtml"
                      contentSize="xs"
                    />
                  </div>
                </div>
              )
            }

            // 其他 block 类型...
            return null
          })}
        </section>
      ))}
    </div>
  )
}
```

### 3. 注册模板

```tsx
// src/templates/index.ts
import SimpleTemplate from './simple'
import MyTemplate from './my-template'

export const templates = [
  {
    id: 'simple',
    name: '简约模板',
    component: SimpleTemplate,
  },
  {
    id: 'my-template',
    name: '我的模板',
    component: MyTemplate,
  },
]
```

## 核心概念

### EditableFieldWrapper - 单行字段编辑

**适用于：** 公司名称、职位、日期、学校等短文本

```tsx
<EditableFieldWrapper
  blockId={block.id}           // 必需：Block ID
  fieldName="company"          // 必需：字段名
  value={block.company}        // 必需：当前值
  onUpdate={() => {}}          // 必需：更新回调
  className="font-bold"        // 可选：样式类
  title="点击编辑"              // 可选：hover 提示
  placeholder="公司名称"        // 可选：占位符
/>
```

### EditableBlockWrapper - 富文本内容编辑

**适用于：** 工作描述、项目介绍、课程描述等富文本

```tsx
<EditableBlockWrapper
  blockId={block.id}           // 必需：Block ID
  contentField="contentHtml"   // 必需：内容字段名
  contentSize="xs"             // 可选：'xs' | 'sm'
/>
```

**自动功能：**
- ✅ 点击进入编辑模式
- ✅ 显示浮动工具栏（B、I、U、列表、对齐、缩进等）
- ✅ 点击外部自动保存
- ✅ 支持列表样式

## 样式指南

### 使用主题色

```tsx
import { useAppStore } from '@/state/store'

function MyTemplate() {
  const theme = useAppStore((s) => s.theme)

  return (
    <h1 style={{ color: theme.primaryColor }}>
      标题
    </h1>
  )
}
```

### 使用共享样式

```tsx
import { CONTENT_DISPLAY_STYLES_XS } from '@/editor/editor-styles'

// 如果需要自定义内容显示（不推荐，除非特殊需求）
<div className={CONTENT_DISPLAY_STYLES_XS}>
  {/* 内容 */}
</div>
```

### Tailwind 布局

```tsx
// 使用 Grid 布局
<div className="grid grid-cols-2 gap-4">
  <div>左列</div>
  <div>右列</div>
</div>

// 使用 Flexbox
<div className="flex justify-between items-center">
  <span>标题</span>
  <span>日期</span>
</div>
```

## Block 类型参考

### ExperienceBlock
```typescript
{
  id: string
  type: 'experience'
  company: string        // 公司名称
  position: string       // 职位
  startDate: string      // 开始时间
  endDate: string        // 结束时间
  industry?: string      // 行业
  contentHtml: string    // 工作内容（富文本）
}
```

### EducationBlock
```typescript
{
  id: string
  type: 'education'
  school: string         // 学校
  major: string          // 专业
  degree: string         // 学位
  startDate: string
  endDate: string
  courseHtml?: string    // 课程描述（富文本）
}
```

### ProjectBlock
```typescript
{
  id: string
  type: 'project'
  name: string           // 项目名称
  role?: string          // 角色
  startDate: string
  endDate: string
  contentHtml: string    // 项目描述（富文本）
}
```

### CampusBlock
```typescript
{
  id: string
  type: 'campus'
  organization: string   // 组织名称
  position: string       // 职位
  startDate: string
  endDate: string
  contentHtml: string    // 经历描述（富文本）
}
```

### TextBlock
```typescript
{
  id: string
  type: 'text'
  html: string           // 纯文本内容（富文本）
}
```

## 完整示例

查看 `src/templates/simple/index.tsx` 获取完整的实现参考。

## 常见问题

### Q: 如何自定义编辑框样式？

A: EditableBlockWrapper 使用共享样式，如需自定义，修改 `src/editor/editor-styles.ts`。

### Q: 如何添加新的 Block 类型？

A: 
1. 在 `src/entities/` 定义新类型
2. 更新 `src/entities/resume-block.ts` 的联合类型
3. 在模板中处理新类型的渲染

### Q: 编辑功能不工作？

A: 确保：
1. ✅ 已安装 `@lexical/list` 包
2. ✅ `blockId` 正确传递
3. ✅ `fieldName` 与 block 的属性名匹配

### Q: 如何禁用某些字段的编辑？

A: 直接渲染值，不使用 EditableFieldWrapper：

```tsx
// 不可编辑
<span>{block.company}</span>

// 可编辑
<EditableFieldWrapper ... />
```

## 性能优化建议

1. **使用 React.memo** 包装 block 组件
2. **避免匿名函数** 作为 props（使用 useCallback）
3. **条件渲染** 隐藏的 blocks
4. **虚拟化** 处理超长简历

```tsx
import { memo, useCallback } from 'react'

const ExperienceItem = memo(({ block }) => {
  const handleUpdate = useCallback((value) => {
    // 更新逻辑
  }, [])

  return (
    <EditableFieldWrapper
      onUpdate={handleUpdate}
      // ...
    />
  )
})
```

## 下一步

- 阅读 `TEMPLATE_ARCHITECTURE.md` 了解整体架构
- 查看 `src/editor/` 目录了解编辑组件实现
- 参考 `src/templates/simple/` 查看完整示例
