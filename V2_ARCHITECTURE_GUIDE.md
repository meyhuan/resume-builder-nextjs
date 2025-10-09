# V2 架构指南 - 样式配置驱动

## 🎯 核心理念

V2 架构完全解耦模板类型，支持**无限扩展**，新增模板**无需修改共用组件代码**。

## 🆚 V1 vs V2 对比

### V1 架构（variant 硬编码）

```tsx
// ❌ 问题：每增加一个模板都要修改共用组件
type TemplateVariant = 'simple' | 'creative' | 'professional' | 'elegant'

function BaseInfoSection(props: { variant: TemplateVariant }) {
  if (variant === 'creative') { /* 创意风格代码 */ }
  if (variant === 'professional') { /* 专业风格代码 */ }
  // 100个模板 = 修改100次 ❌
}
```

### V2 架构（样式配置驱动）

```tsx
// ✅ 解决方案：通过配置控制外观
function BaseInfoSection(props: { styles?: BaseInfoSectionStyles }) {
  // 共用组件代码永远不需要改
  return <header className={styles?.container || 'default'}>...</header>
}

// 新增模板只需创建配置文件
const MY_NEW_TEMPLATE_STYLES = {
  baseInfo: { container: 'my-custom-class' }
}
```

## 📊 三种使用方式

### 方式1: 样式配置（推荐 - 90%场景）

适用于：布局相似但样式不同的模板

```tsx
// 1. 创建样式配置文件
// src/templates/styles/my-template-styles.ts
import type { TemplateStylesConfig } from '@/templates/components/v2/types'

export const MY_TEMPLATE_STYLES: TemplateStylesConfig = {
  name: 'my-template',
  description: '我的自定义模板',
  
  baseInfo: {
    container: 'bg-gradient-to-r from-purple-500 to-pink-500 p-10 rounded-3xl',
    avatar: {
      size: 'w-32 h-32',
      shape: 'circle',
      containerClassName: 'w-32 h-32 rounded-full border-4 border-white shadow-2xl',
      showFallbackText: true,
      fallbackClassName: 'bg-gradient-to-br from-yellow-400 to-red-500 text-white text-4xl',
    },
    name: {
      className: 'text-5xl font-black text-white drop-shadow-lg',
      fontSize: '5xl',
    },
    title: {
      className: 'text-xl text-white/90',
    },
    infoLayout: {
      type: 'horizontal',
      gap: '8',
      className: 'flex flex-wrap gap-8 mt-4',
    },
    fieldItem: 'bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white',
    fieldIcon: {
      size: 18,
    },
  },
  
  jobIntention: {
    container: 'bg-white rounded-2xl shadow-xl p-8 mb-6',
    fieldsLayout: {
      type: 'grid',
      columns: 3,
      gap: '6',
    },
    fieldItem: 'bg-gradient-to-br from-blue-50 to-purple-50 px-6 py-3 rounded-xl',
  },
}

// 2. 在模板中使用
import BaseInfoSection from '@/templates/components/v2/base-info-section'
import { MY_TEMPLATE_STYLES } from '@/templates/styles/my-template-styles'

<BaseInfoSection
  name={resume.name}
  baseInfo={resume.baseInfo}
  themeColor={theme.primaryColor}
  styles={MY_TEMPLATE_STYLES.baseInfo}  // 传入样式配置
/>
```

### 方式2: 自定义渲染（完全不同的布局）

适用于：布局完全不同的特殊模板

```tsx
// src/templates/my-template/components/custom-header.tsx
export function renderMyCustomHeader(props: BaseInfoRenderProps) {
  const { name, baseInfo, themeColor, onEdit } = props
  
  return (
    <header className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* 完全自定义的布局 */}
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative">
          {/* 3D 头像效果 */}
          <div className="w-48 h-48 rounded-full border-8 border-white/30 shadow-2xl transform hover:scale-110 transition-transform">
            <img src={baseInfo?.avatarUrl} className="rounded-full" />
          </div>
          
          {/* 浮动装饰元素 */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full animate-bounce" />
        </div>
        
        <h1 className="text-7xl font-black text-white mt-8 tracking-wider">
          {name}
        </h1>
        
        {/* 动画文字 */}
        <div className="text-2xl text-white/80 mt-4 animate-pulse">
          {baseInfo?.title}
        </div>
        
        {/* 信息卡片网格 */}
        <div className="grid grid-cols-2 gap-4 mt-12">
          {baseInfo?.phone && (
            <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl">
              <Phone className="w-6 h-6 text-white mb-2" />
              <p className="text-white">{baseInfo.phone}</p>
            </div>
          )}
          {/* ... 更多字段 */}
        </div>
      </div>
      
      <button onClick={onEdit} className="fixed top-4 right-4">
        <Pencil />
      </button>
    </header>
  )
}

// 在模板中使用
<BaseInfoSection
  name={resume.name}
  baseInfo={resume.baseInfo}
  themeColor={theme.primaryColor}
  renderCustom={renderMyCustomHeader}  // 完全自定义
/>
```

### 方式3: 插槽模式（部分自定义）

适用于：只需自定义某些部分

```tsx
<BaseInfoSection
  name={resume.name}
  baseInfo={resume.baseInfo}
  themeColor={theme.primaryColor}
  styles={MY_TEMPLATE_STYLES.baseInfo}
  slots={{
    // 只自定义头像部分
    avatar: (baseInfo, themeColor) => (
      <div className="relative">
        <div 
          className="w-32 h-32 rounded-full border-4 animate-spin-slow"
          style={{ borderColor: themeColor }}
        >
          <img 
            src={baseInfo?.avatarUrl} 
            className="rounded-full"
          />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white" />
      </div>
    ),
    
    // 只自定义姓名部分
    name: (name, themeColor) => (
      <h1 
        className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r"
        style={{
          backgroundImage: `linear-gradient(to right, ${themeColor}, #ff00ff)`
        }}
      >
        {name}
      </h1>
    ),
    
    // 其他部分使用默认渲染
  }}
/>
```

## 🚀 快速开始

### 1. 创建新模板（3分钟）

```bash
# 1. 创建样式配置文件
src/templates/styles/futuristic-styles.ts

# 2. 创建模板文件
src/templates/futuristic/index.tsx

# 3. 使用 v2 组件（无需修改共用组件！）
```

### 2. 样式配置示例

```ts
// src/templates/styles/futuristic-styles.ts
export const FUTURISTIC_STYLES: TemplateStylesConfig = {
  name: 'futuristic',
  description: '未来科技风',
  
  baseInfo: {
    container: 'relative overflow-hidden bg-black text-cyan-400 p-8',
    avatar: {
      containerClassName: 'w-24 h-24 rounded-full border-2 border-cyan-400 animate-pulse',
      showFallbackText: true,
    },
    name: {
      className: 'text-4xl font-mono font-bold tracking-widest glitch-text',
      fontSize: '4xl',
    },
    infoLayout: {
      type: 'grid',
      columns: 2,
      gap: '4',
    },
    fieldItem: 'bg-cyan-900/20 border border-cyan-500/30 px-4 py-2 rounded font-mono text-xs',
  },
}
```

### 3. 在模板中使用

```tsx
// src/templates/futuristic/index.tsx
import BaseInfoSection from '@/templates/components/v2/base-info-section'
import { FUTURISTIC_STYLES } from '@/templates/styles/futuristic-styles'

export default function FuturisticTemplate(props: TemplateProps) {
  return (
    <div className="bg-black min-h-screen">
      {/* 直接传入配置，无需修改共用组件 */}
      <BaseInfoSection
        name={props.resume.name}
        baseInfo={props.resume.baseInfo}
        themeColor="#00ffff"
        styles={FUTURISTIC_STYLES.baseInfo}
      />
      
      {/* ... 其他内容 */}
    </div>
  )
}
```

## 📦 完整的类型支持

```tsx
import type {
  BaseInfoSectionStyles,
  JobIntentionSectionStyles,
  BlockRendererStyles,
  TemplateStylesConfig,
  BaseInfoRenderProps,
  BaseInfoSlots,
} from '@/templates/components/v2/types'

// 所有配置都有完整的类型提示
const myStyles: BaseInfoSectionStyles = {
  container: '...',  // 自动补全
  avatar: {
    size: '...',     // 自动补全
    shape: 'circle', // 枚举类型
  }
}
```

## 🎨 样式配置参考

### BaseInfoSection 完整配置

```ts
baseInfo: {
  // 容器样式
  container: 'mb-5 flex items-start gap-4',
  header: 'flex-1 min-w-0',
  
  // 头像配置
  avatar: {
    size: 'w-12 h-16',
    shape: 'rounded' | 'square' | 'circle',
    containerClassName: 'w-12 h-16 rounded overflow-hidden',
    imageClassName: 'w-full h-full object-cover',
    fallbackClassName: 'bg-gradient-to-br from-blue-500 to-purple-500',
    showFallbackText: true,
  },
  
  // 文字样式
  name: {
    className: 'font-bold text-3xl',
    fontSize: '3xl',
    fontWeight: 'bold',
  },
  
  title: {
    className: 'text-gray-600',
    fontSize: '1em',
  },
  
  // 布局配置
  infoLayout: {
    type: 'horizontal' | 'vertical' | 'grid',
    columns: 2,
    gap: '4',
    className: 'grid grid-cols-2 gap-4',
  },
  
  // 字段样式
  fieldItem: 'flex items-center gap-2 px-3 py-2 rounded',
  fieldIcon: {
    size: 16,
    className: 'text-gray-500',
  },
  
  // 按钮样式
  editButton: 'absolute top-0 right-0 opacity-0 group-hover:opacity-100',
}
```

## 🔄 从 V1 迁移到 V2

### 迁移步骤

1. **创建样式配置文件**（替代 variant）
2. **更新导入**（使用 v2 组件）
3. **传入 styles 配置**（替代 variant prop）
4. **测试验证**

### 迁移示例

```tsx
// ❌ V1 用法
import { BaseInfoSection } from '@/templates/components/sections'

<BaseInfoSection
  name={name}
  baseInfo={baseInfo}
  variant="simple"  // 硬编码
  themeColor={color}
/>

// ✅ V2 用法
import BaseInfoSection from '@/templates/components/v2/base-info-section'
import { SIMPLE_TEMPLATE_STYLES } from '@/templates/styles/simple-styles'

<BaseInfoSection
  name={name}
  baseInfo={baseInfo}
  styles={SIMPLE_TEMPLATE_STYLES.baseInfo}  // 配置驱动
  themeColor={color}
/>
```

## 💡 高级用法

### 1. 运行时动态样式

```tsx
const [isDarkMode, setIsDarkMode] = useState(false)

const dynamicStyles: BaseInfoSectionStyles = {
  ...SIMPLE_TEMPLATE_STYLES.baseInfo,
  container: isDarkMode 
    ? 'bg-gray-900 text-white' 
    : 'bg-white text-black',
}

<BaseInfoSection styles={dynamicStyles} {...props} />
```

### 2. 样式继承和覆盖

```tsx
// 基于现有样式创建变体
const SIMPLE_DARK_STYLES: TemplateStylesConfig = {
  ...SIMPLE_TEMPLATE_STYLES,
  baseInfo: {
    ...SIMPLE_TEMPLATE_STYLES.baseInfo,
    container: 'bg-gray-900 text-white p-8',
    fieldItem: 'text-gray-300 hover:bg-gray-800',
  },
}
```

### 3. 主题色动态应用

```tsx
function MyTemplate(props: TemplateProps) {
  const styles = useMemo(() => ({
    ...MY_TEMPLATE_STYLES.baseInfo,
    fieldItem: `border-2 px-4 py-2 rounded`,
  }), [])
  
  return (
    <BaseInfoSection
      styles={styles}
      themeColor={props.theme.primaryColor}
      {...props}
    />
  )
}
```

## 🎯 最佳实践

### ✅ DO

1. **为每个模板创建独立的样式配置文件**
2. **使用 TypeScript 类型确保配置正确**
3. **复用现有样式配置并覆盖特定部分**
4. **为复杂布局使用 renderCustom**
5. **为部分自定义使用 slots**

### ❌ DON'T

1. **不要在共用组件中硬编码模板名称**
2. **不要在共用组件中使用 if (variant === 'xxx')**
3. **不要在样式配置中包含业务逻辑**
4. **不要过度使用 renderCustom（优先用 styles）**

## 📈 性能优化

```tsx
// ✅ 使用 useMemo 缓存样式配置
const styles = useMemo(() => MY_TEMPLATE_STYLES.baseInfo, [])

// ✅ 避免在渲染时创建新对象
const STATIC_STYLES = { /* ... */ } // 组件外部定义

// ❌ 避免每次渲染都创建新对象
<BaseInfoSection styles={{ container: 'xxx' }} /> // 不推荐
```

## 🎊 总结

### V2 架构的优势

1. **无限扩展** - 支持几百甚至几千个模板
2. **零修改** - 新增模板无需修改共用组件
3. **类型安全** - 完整的 TypeScript 支持
4. **灵活性** - 三种方式满足所有场景
5. **向后兼容** - V1 和 V2 可以共存

### 适用场景

- ✅ **多模板系统**（>5个模板）
- ✅ **模板市场**（用户自定义模板）
- ✅ **白标系统**（不同客户不同风格）
- ✅ **快速迭代**（频繁新增模板）

---

**现在你可以支持无限多的模板，而永远不需要修改共用组件代码！** 🚀
