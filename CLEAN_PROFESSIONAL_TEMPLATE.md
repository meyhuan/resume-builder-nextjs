# Clean Professional 模板 - 实现说明

## 🎨 模板特点

基于你提供的图片实现的**清爽专业简历模板**，具有以下特点：

### 视觉特征
- ✅ **左侧大头像** - 方形圆角，尺寸 112x144px
- ✅ **信息密集布局** - 3列网格，横向排列
- ✅ **圆形蓝色图标** - 标识各个区块
- ✅ **卡片式内容** - 浅灰背景，圆角
- ✅ **多标签展示** - 年龄、性别、身高、体重等标签化
- ✅ **蓝色主题** - 链接、日期、图标使用蓝色

### 布局结构
```
┌─────────────────────────────────────────┐
│  ┌───┐  姓名（大字）                    │
│  │头│  联系方式（3列网格）              │
│  │像│  社交媒体                         │
│  └───┘  标签（年龄、性别...）          │
├─────────────────────────────────────────┤
│  ⭕ 个人总结                           │
│     └─ 内容                            │
├─────────────────────────────────────────┤
│  🎓 教育经历                           │
│     ┌────────────────────────────┐    │
│     │ 学校    专业    时间       │    │
│     │ 详细描述                   │    │
│     └────────────────────────────┘    │
├─────────────────────────────────────────┤
│  💼 工作经历 / 项目经历...             │
└─────────────────────────────────────────┘
```

## 📁 已创建文件

### 1. 样式配置
```
src/templates/styles/clean-professional-styles.ts
```

完整的样式配置，包括：
- 基础信息布局（左侧大头像）
- 信息密集的3列网格
- 卡片式 Block 样式
- 圆形图标配置

### 2. 模板组件
```
src/templates/clean-professional/index.tsx
```

包含：
- `CleanProfessionalTemplate` - 主模板组件
- `CleanProfessionalSection` - 带圆形图标的区块组件
- `BlockRendererWrapper` - Block 包装器
- 自定义字段渲染（支持更多信息）

## 🚀 使用方法

### 基础使用

```tsx
import CleanProfessionalTemplate from '@/templates/clean-professional'

<CleanProfessionalTemplate
  resume={resumeData}
  theme={themeTokens}
/>
```

### 特色功能

#### 1. 显示更多基础信息字段

模板支持显示图片中的所有字段：
- ✅ 联系方式：电话、邮箱、地址
- ✅ 社交媒体：GitHub、Gitee、微信
- ✅ 基本信息：年龄、性别、身高、体重、民族、籍贯、政治面貌、婚姻状况

这些字段会自动以**标签形式**显示在头部。

#### 2. 圆形图标自动匹配

根据 section 标题自动选择图标：
- 👤 个人总结/自我评价
- 🎓 教育经历
- 💼 工作经历/实习经历
- 📁 项目经历
- 🔬 研究经历
- 👥 组织/社团经历

#### 3. 蓝色主题色

所有交互元素使用蓝色：
- 圆形图标背景
- 日期文字
- 链接文字
- 图标颜色

## 🎨 样式配置详解

### 基础信息样式

```ts
baseInfo: {
  // 整体：左大头像 + 右信息
  container: 'flex items-start gap-6 bg-white p-6 rounded-lg',
  
  // 大头像（112x144px）
  avatar: {
    containerClassName: 'w-28 h-36 rounded-lg shadow-md border border-gray-200',
  },
  
  // 姓名：大而醒目（2rem）
  name: {
    className: 'text-3xl font-bold text-gray-900',
  },
  
  // 信息布局：3列网格
  infoLayout: {
    type: 'grid',
    columns: 3,
    className: 'grid grid-cols-3 gap-x-6 gap-y-2.5',
  },
}
```

### Block 样式

```ts
blockRenderer: {
  // 卡片式，浅灰背景
  container: 'bg-gray-50 rounded-lg p-5',
  
  // 日期：蓝色，右对齐
  dateRange: 'text-sm text-blue-600 font-medium',
  
  // 内容：紧凑行距
  content: 'mt-3 text-sm text-gray-700 leading-relaxed',
}
```

## 🔧 自定义配置

### 修改主题色

```tsx
// 在模板中传入不同的主题色
<CleanProfessionalTemplate
  resume={resume}
  theme={{
    ...theme,
    primaryColor: '#10b981', // 改为绿色
  }}
/>
```

### 自定义标签样式

修改 `clean-professional-styles.ts`：

```ts
// 将灰色标签改为彩色
<span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
  {baseInfo.age}岁
</span>
```

### 调整头像尺寸

```ts
avatar: {
  // 改为更大的头像
  containerClassName: 'w-32 h-40 rounded-lg shadow-md',
}
```

## 📊 与其他模板对比

| 特性 | Simple | Creative | Professional | Clean Professional |
|------|--------|----------|--------------|-------------------|
| **头像** | 小头像 | 中头像 | 无头像 | **大头像** ✨ |
| **信息密度** | 中 | 低 | 中 | **高** ✨ |
| **布局** | 传统 | 不对称 | 居中 | **左右分栏** ✨ |
| **图标** | 小图标 | 大圆点 | 无 | **圆形彩色** ✨ |
| **标签** | 无 | 无 | 无 | **多标签** ✨ |
| **适用场景** | 通用 | 创意行业 | 商务正式 | **信息丰富** ✨ |

## 💡 使用建议

### ✅ 适合场景

- ✅ 应届生简历（教育经历、实习、项目、社团经历多）
- ✅ 信息较多的简历（需要展示详细基本信息）
- ✅ 学术简历（研究经历、论文等）
- ✅ 需要展示社交媒体（GitHub、LinkedIn）

### ⚠️ 注意事项

- ⚠️ 头像较大，确保照片质量好
- ⚠️ 信息密集，注意不要过度拥挤
- ⚠️ 蓝色主题，如需其他颜色请自定义

### 🎯 优化建议

1. **照片准备** - 使用高质量证件照或职业照
2. **信息筛选** - 虽然支持很多字段，但不是都要填
3. **标签精简** - 只显示有价值的标签
4. **内容精练** - 卡片式布局适合简洁的描述

## 🔄 V2 架构优势体现

这个模板完美展示了 V2 架构的优势：

### 1. 样式配置驱动
```tsx
// 只需配置，无需修改共用组件
styles={CLEAN_PROFESSIONAL_STYLES.baseInfo}
```

### 2. 插槽自定义
```tsx
// 只自定义字段渲染，其他使用默认
slots={{
  fields: (baseInfo) => (
    <div className="grid grid-cols-3 gap-6">
      {/* 自定义布局 */}
    </div>
  )
}}
```

### 3. 完全解耦
- ✅ 创建新模板不需要修改 V2 组件
- ✅ 支持任意数量的模板
- ✅ 每个模板完全独立

## 📝 总结

**Clean Professional 模板**成功实现了图片中的清爽专业风格：

- ✅ **3分钟创建** - 使用 V2 架构快速实现
- ✅ **完全还原** - 大头像、圆形图标、卡片布局
- ✅ **易于定制** - 样式配置驱动，修改简单
- ✅ **信息丰富** - 支持更多字段展示

---

**这就是 V2 架构的威力 - 3分钟创建一个完全自定义的模板！** 🚀
