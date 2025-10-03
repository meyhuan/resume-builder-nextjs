# 项目架构文档 🏗️

## 概览

Resume Builder 采用现代化的前端架构，核心特点是**组件化**、**类型安全**和**性能优先**。

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户界面层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   App.tsx    │  │ RightSidebar │  │  Templates   │  │
│  │  (主应用)     │  │   (设置面板)  │  │  (简历模板)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         │     业务逻辑层    │                  │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │
│  │  State Store │  │  DnD System  │  │  Editor API  │  │
│  │   (Zustand)  │  │  (拖拽系统)   │  │  (编辑器)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────┬──────────────────┬──────────────────┬─────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         │     数据层        │                  │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │
│  │ ResumeData   │  │ ThemeTokens  │  │ LocalStorage │  │
│  │  (简历数据)   │  │  (主题配置)   │  │  (持久化)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 目录结构

```
src/
├── components/          # 通用UI组件
│   ├── base-info-modal.tsx       # 基本信息编辑弹窗
│   ├── block-wrapper.tsx         # Block容器（管理按钮）
│   ├── job-intention-view.tsx    # 求职意向展示
│   ├── section-header.tsx        # Section标题（拖拽手柄）
│   └── sortable-section-wrapper.tsx  # Section拖拽包装器
│
├── dnd/                 # 拖拽系统
│   ├── drag-drop-provider.tsx    # DnD上下文提供者
│   └── ids.ts                    # DnD ID规范
│
├── editor/              # 编辑器组件
│   ├── editable-block-wrapper.tsx    # 富文本编辑包装器
│   ├── editable-field-wrapper.tsx    # 单行字段编辑包装器
│   └── rich-text-editor.tsx          # Lexical编辑器
│
├── entities/            # 数据类型定义
│   ├── resume-data.ts        # 简历数据结构
│   ├── resume-block.ts       # Block类型定义
│   ├── resume-section.ts     # Section类型定义
│   ├── base-info.ts          # 基本信息类型
│   ├── theme-tokens.ts       # 主题配置类型
│   └── ...
│
├── export/              # 导出功能
│   ├── export-pdf.ts         # PDF导出
│   └── export-image.ts       # 图片导出
│
├── state/               # 状态管理
│   └── store.ts              # Zustand Store
│
├── templates/           # 简历模板（★核心）
│   ├── template-loader.ts    # 模板加载器（动态Import）
│   ├── simple/               # 简约模板
│   │   ├── index.tsx
│   │   └── README.md
│   ├── modern/               # 现代模板
│   │   ├── index.tsx
│   │   └── README.md
│   ├── professional/         # 专业商务模板
│   │   ├── index.tsx
│   │   └── README.md
│   └── creative/             # 创意风格模板
│       ├── index.tsx
│       └── README.md
│
├── ui/                  # 页面UI组件
│   └── right-sidebar.tsx     # 右侧设置面板
│
├── utils/               # 工具函数
│   ├── get-section-icon.ts   # Section图标映射
│   └── ...
│
├── styles/              # 样式文件
│   ├── tailwind.css          # Tailwind入口
│   ├── print.css             # 打印样式
│   └── base.css              # 基础样式
│
├── App.tsx              # 主应用组件（★动态加载版本）
└── main.tsx             # 应用入口
```

## 核心模块详解

### 1. 模板系统 (`templates/`)

**设计理念：** 按需加载 + 组件化

```typescript
// template-loader.ts
export const TEMPLATE_REGISTRY = {
  simple: {
    id: 'simple',
    name: '简约',
    component: lazy(() => import('@/templates/simple')),  // 懒加载
  },
}
```

**工作流程：**
1. 用户打开页面 → 只加载主bundle（不含模板）
2. 用户选择模板 → 动态加载对应模板chunk
3. Suspense显示Loading → 模板加载完成 → 渲染

**优势：**
- 首屏加载快（减少93%资源）
- 可扩展性强（支持100+模板）
- 类型安全（完整TS支持）

---

### 2. 状态管理 (`state/store.ts`)

**技术选型：** Zustand

**为什么选择Zustand？**
- ✅ 轻量级（1KB）
- ✅ 无需Provider
- ✅ 简单的API
- ✅ 完整的TS支持
- ✅ 支持Immer

**Store结构：**
```typescript
interface AppStore {
  // 数据
  resume: ResumeData
  theme: ThemeTokens
  
  // 操作
  updateName: (name: string) => void
  updateBaseInfo: (info: BaseInfo) => void
  addSection: (title: string) => void
  deleteSection: (id: string) => void
  moveSection: (from: number, to: number) => void
  addBlockByType: (sectionId: string) => void
  deleteBlock: (sectionId: string, blockId: string) => void
  // ... 更多操作
}
```

**数据流：**
```
用户操作 → Store Action → Immer更新 → React重渲染
```

---

### 3. 拖拽系统 (`dnd/`)

**技术选型：** @dnd-kit

**为什么选择@dnd-kit？**
- ✅ 性能优秀
- ✅ 无障碍支持
- ✅ TypeScript优先
- ✅ 灵活的API
- ✅ 支持触摸设备

**架构：**
```
DragDropProvider (上下文)
  └─ SortableSectionWrapper (Section可拖拽)
      └─ SectionView
          └─ SortableContext (Block可拖拽)
              └─ BlockWrapper
```

**支持的拖拽操作：**
1. **Section排序** - 拖动Section标题
2. **Block排序** - 在Section内拖动Block
3. **跨Section移动** - 拖动Block到其他Section

---

### 4. 编辑器系统 (`editor/`)

**技术选型：** Lexical

**为什么选择Lexical？**
- ✅ Meta官方出品
- ✅ 性能优秀
- ✅ 扩展性强
- ✅ 协同编辑友好
- ✅ 无障碍支持

**编辑器类型：**

#### 单行字段编辑器 (`editable-field-wrapper.tsx`)
- 用于：姓名、公司、职位等单行文本
- 特点：点击编辑、Enter保存、Escape取消

#### 富文本编辑器 (`editable-block-wrapper.tsx`)
- 用于：工作内容、项目描述等多行文本
- 支持：加粗、斜体、列表、对齐等
- 工具栏：悬浮工具栏，选中文本时显示

**编辑流程：**
```
1. 点击内容 → 进入编辑模式
2. 编辑内容 → 实时预览
3. 点击外部/Enter → 保存到Store
4. Store更新 → React重渲染
```

---

### 5. 导出功能 (`export/`)

#### PDF导出 (`export-pdf.ts`)
```typescript
// 使用浏览器原生打印
const handlePrint = useExportPdf(printRef, {
  documentTitle: 'resume'
})
```

**原理：**
1. 添加`@media print`样式
2. 触发`window.print()`
3. 浏览器打印预览
4. 用户保存为PDF

**优势：**
- ✅ 零依赖
- ✅ 无需服务器
- ✅ 保真度高
- ✅ 用户可预览

#### 图片导出 (`export-image.ts`)
```typescript
// 使用html2canvas
await exportImage(printRef, {
  fileName: 'resume',
  pixelRatio: 2  // 2倍清晰度
})
```

**原理：**
1. 使用`html2canvas`截图
2. 转换为Canvas
3. 导出为PNG
4. 触发下载

---

### 6. 主题系统 (`entities/theme-tokens.ts`)

**设计理念：** Token化 + 实时预览

```typescript
interface ThemeTokens {
  primaryColor: string    // 主色
  textColor: string       // 文本色
  fontFamily: string      // 字体
  fontSize: number        // 字号
  lineHeight: number      // 行高
  spacingScale: number    // 间距缩放
}
```

**特点：**
- ✅ 类型安全
- ✅ 实时预览
- ✅ 本地存储
- ✅ 支持重置

**工作流程：**
```
用户调整主题 → Store更新 → 模板重渲染 → 保存到localStorage
```

---

## 数据流图

```
┌─────────────────────────────────────────────────────┐
│                    用户操作                          │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              组件事件处理函数                         │
│  onClick / onChange / onDrop / onSave ...           │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│                Zustand Actions                       │
│  updateName / addSection / moveBlock ...            │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              Immer Draft 更新                        │
│  draft.resume.name = '新名字'                       │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│              Store State 更新                        │
│  新的 resume / theme 对象                           │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│            React 重渲染                              │
│  useAppStore((s) => s.resume)                       │
└───────┬─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│            UI 更新                                   │
│  显示新的内容                                        │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│          localStorage 持久化                         │
│  保存到本地，下次打开恢复                             │
└─────────────────────────────────────────────────────┘
```

## 性能优化策略

### 1. 代码分割
- ✅ 动态Import - 模板按需加载
- ✅ React.lazy - 组件懒加载
- ✅ Suspense - 优雅的Loading

### 2. 渲染优化
- ✅ React.memo - 避免不必要的重渲染
- ✅ useMemo - 缓存计算结果
- ✅ useCallback - 缓存函数引用

### 3. 资源优化
- ✅ Tree Shaking - 移除未使用代码
- ✅ Minification - 压缩代码
- ✅ Gzip - 服务器压缩

### 4. 缓存策略
- ✅ localStorage - 数据持久化
- ✅ 浏览器缓存 - 静态资源缓存
- 🔮 Service Worker - 离线支持（计划中）

## 扩展性设计

### 添加新模板
只需3步：
1. 创建模板组件 `src/templates/new-template/index.tsx`
2. 在 `template-loader.ts` 注册
3. 完成！自动支持所有功能

### 添加新Block类型
1. 在 `entities/resume-block.ts` 添加类型
2. 在模板中添加渲染逻辑
3. 在 Store 添加创建逻辑
4. 完成！

### 添加新主题配置
1. 在 `entities/theme-tokens.ts` 添加字段
2. 在 RightSidebar 添加控件
3. 在模板中使用
4. 完成！

## 技术决策

### 为什么用Vite而不是Webpack？
- ✅ 开发服务器启动快（冷启动<1秒）
- ✅ 热更新快（<50ms）
- ✅ 构建快（Rollup + esbuild）
- ✅ 配置简单

### 为什么用Zustand而不是Redux？
- ✅ 简单（无需action/reducer/dispatch）
- ✅ 轻量（1KB vs Redux 3KB）
- ✅ 灵活（支持多store）
- ✅ TS支持好

### 为什么用@dnd-kit而不是react-dnd？
- ✅ 性能更好（虚拟化支持）
- ✅ TypeScript优先
- ✅ 无障碍支持
- ✅ 触摸设备支持

### 为什么用Lexical而不是Draft.js？
- ✅ Meta新一代编辑器
- ✅ 性能优秀（比Draft.js快3-5倍）
- ✅ 扩展性强
- ✅ 协同编辑友好

## 最佳实践

### 组件设计
1. **单一职责** - 每个组件只做一件事
2. **Props类型** - 使用TypeScript严格类型
3. **可复用性** - 通过Props控制行为
4. **无副作用** - UI组件不直接操作Store

### 状态管理
1. **最小化状态** - 只存储必要的状态
2. **派生数据** - 使用计算属性而非存储
3. **Immer更新** - 使用不可变更新
4. **Action分离** - 逻辑和UI分离

### 性能优化
1. **懒加载** - 非首屏内容懒加载
2. **代码分割** - 按路由/功能分割
3. **缓存优化** - 合理使用memo和useMemo
4. **监控指标** - 使用Lighthouse监控

## 未来规划

### 短期（1-3个月）
- 🎯 更多模板（10+）
- 🎯 模板预览图
- 🎯 预加载优化
- 🎯 骨架屏优化

### 中期（3-6个月）
- 🔮 模板市场
- 🔮 在线协作
- 🔮 云端保存
- 🔮 AI智能推荐

### 长期（6-12个月）
- 🌐 第三方生态
- 🌐 移动端APP
- 🌐 企业版功能
- 🌐 国际化支持

---

最后更新：2025-10-02
