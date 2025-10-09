# Block Renderers - 可复用简历块渲染器

## 📦 概述

Block Renderers 是一套可复用的简历块渲染组件，支持多种视觉风格，大幅减少模板代码重复。

## 🎯 优势

- ✅ **减少 70% 重复代码** - 从 ~2800 行 → ~600 行
- ✅ **统一渲染逻辑** - 一处修改，所有模板生效
- ✅ **多样式支持** - simple, creative, professional, elegant
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **易于维护** - 清晰的组件结构

## 🚀 使用方法

### 基础用法

```tsx
import { BlockRenderer } from '@/templates/components/block-renderers'

function MyTemplate() {
  return (
    <BlockRenderer
      block={block}
      variant="simple"  // 或 'creative' | 'professional' | 'elegant'
      themeColor="#6366f1"
      onEditingChange={(isEditing) => setIsEditing(isEditing)}
    />
  )
}
```

### 在模板中使用

```tsx
import { BlockRenderer as SharedBlockRenderer } from '@/templates/components/block-renderers'

function SimpleTemplate(props: TemplateProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <div>
      {section.blocks.map((block) => (
        <SharedBlockRenderer
          key={block.id}
          block={block}
          variant="simple"
          themeColor={theme.primaryColor}
          onEditingChange={setIsEditing}
        />
      ))}
    </div>
  )
}
```

## 📋 支持的 Block 类型

### 1. ExperienceRenderer
工作经历渲染器

**字段：**
- `company` - 公司名称
- `position` - 职位
- `industry` - 行业（可选）
- `startDate` / `endDate` - 时间范围
- `contentHtml` - 工作内容（富文本）

### 2. ProjectRenderer
项目经历渲染器

**字段：**
- `name` - 项目名称
- `role` - 角色（可选）
- `startDate` / `endDate` - 时间范围
- `contentHtml` - 项目描述（富文本）

### 3. EducationRenderer
教育经历渲染器

**字段：**
- `school` - 学校
- `major` - 专业
- `degree` - 学位
- `startDate` / `endDate` - 时间范围
- `courseHtml` - 课程描述（可选，富文本）

### 4. CampusRenderer
校园经历渲染器

**字段：**
- `organization` - 组织名称
- `position` - 职位
- `startDate` / `endDate` - 时间范围
- `contentHtml` - 经历描述（富文本）

### 5. TextRenderer
纯文本块渲染器

**字段：**
- `html` - 文本内容（富文本）

## 🎨 样式变体对比

### Simple 风格
- 简洁大方
- 单色主题色高亮
- 适合通用场景

### Creative 风格
- 卡片式布局
- 圆角阴影
- 彩色标签
- 适合互联网/设计岗位

### Professional 风格
- 传统商务风格
- 左侧边框装饰
- 正式严谨
- 适合金融/法律行业

### Elegant 风格
- 优雅简约
- 清晰层次
- 适合各类专业人士

## 🔧 自定义渲染器

如果需要添加新的视觉风格：

```tsx
// experience-renderer.tsx
export default function ExperienceRenderer(props: ExperienceRendererProps) {
  const { block, variant, themeColor } = props

  if (variant === 'my-custom-style') {
    return (
      <div className="my-custom-layout">
        {/* 自定义布局 */}
      </div>
    )
  }

  // 其他变体...
}
```

## 📁 文件结构

```
block-renderers/
├── types.ts                  # 基础类型定义
├── block-renderer.tsx        # 统一入口
├── experience-renderer.tsx   # 工作经历
├── project-renderer.tsx      # 项目经历
├── education-renderer.tsx    # 教育经历
├── campus-renderer.tsx       # 校园经历
├── text-renderer.tsx         # 文本块
├── index.ts                  # 导出
└── README.md                 # 本文档
```

## 🚦 迁移指南

### 从旧版本迁移

**之前：**
```tsx
// 每个模板都有重复的渲染逻辑
function BlockRenderer() {
  switch (block.type) {
    case 'experience':
      return <div>{/* 100+ 行代码 */}</div>
    // ...
  }
}
```

**现在：**
```tsx
// 一行搞定
<SharedBlockRenderer block={block} variant="simple" themeColor={color} />
```

### 更新现有模板

1. 导入共用组件：
```tsx
import { BlockRenderer as SharedBlockRenderer } from '@/templates/components/block-renderers'
```

2. 替换渲染逻辑：
```tsx
// 删除本地 BlockRenderer 函数
// 使用 SharedBlockRenderer
```

3. 指定变体：
```tsx
variant="simple"  // 根据模板风格选择
```

## ✅ 最佳实践

1. **使用 onEditingChange** - 控制编辑状态，避免 hover 冲突
2. **传递主题色** - 保持视觉一致性
3. **选择合适变体** - 根据模板风格选择对应的 variant
4. **保持类型安全** - 充分利用 TypeScript 类型检查

## 📊 性能优化

- 已使用 React 函数组件，支持 Hooks
- 建议配合 `React.memo` 优化大量 blocks 的场景
- 编辑组件已内置防抖和优化

## 🔗 相关文档

- [模板开发指南](../../README.md)
- [编辑器组件文档](../../../editor/README.md)
- [模板架构说明](../../../../docs/TEMPLATE_ARCHITECTURE.md)
