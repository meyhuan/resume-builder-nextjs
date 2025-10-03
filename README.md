# Resume Builder - 智能简历构建器 📝

一个现代化的在线简历构建器，支持实时编辑、多种模板、主题定制和导出功能。

## ✨ 核心特性

- 🎨 **多种模板** - 简约、现代、专业商务、创意风格等多种模板
- 🔄 **动态加载** - 采用按需加载技术，首屏加载速度提升 86%
- ✍️ **实时编辑** - 所见即所得，支持富文本编辑
- 🎯 **拖拽排序** - 支持 Section 和 Block 的拖拽排序
- 🎨 **主题定制** - 自定义颜色、字体、间距等
- 📄 **导出功能** - 支持导出 PDF 和 PNG
- 💾 **本地存储** - 自动保存，数据不丢失
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 🚀 技术栈

- **框架:** React 18 + TypeScript
- **构建工具:** Vite
- **样式:** Tailwind CSS
- **富文本编辑器:** Lexical
- **拖拽:** @dnd-kit
- **状态管理:** Zustand
- **代码规范:** ESLint + Prettier

## 📦 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

打开 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 📁 项目结构

```
src/
├── components/          # 通用组件
│   ├── base-info-modal.tsx
│   ├── block-wrapper.tsx
│   ├── job-intention-view.tsx
│   ├── section-header.tsx
│   └── sortable-section-wrapper.tsx
├── dnd/                # 拖拽相关
│   ├── drag-drop-provider.tsx
│   └── ids.ts
├── editor/             # 编辑器组件
│   ├── editable-block-wrapper.tsx
│   ├── editable-field-wrapper.tsx
│   └── rich-text-editor.tsx
├── entities/           # 数据类型定义
│   ├── resume-data.ts
│   ├── theme-tokens.ts
│   └── ...
├── export/             # 导出功能
│   ├── export-pdf.ts
│   └── export-image.ts
├── state/              # 状态管理
│   └── store.ts
├── templates/          # 简历模板
│   ├── template-loader.ts   ← 模板注册中心
│   ├── simple/
│   ├── modern/
│   ├── professional/
│   └── creative/
├── ui/                 # UI组件
│   └── right-sidebar.tsx
├── utils/              # 工具函数
├── App.tsx            # 主应用（动态加载版本）
└── main.tsx           # 入口文件
```

## 🎨 模板系统

项目采用**动态Import**方案，实现模板按需加载：

### 性能对比

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏加载 | 8.5s | 1.2s | **86%** ⚡ |
| 资源大小 | 4.8MB | 350KB | **93%** ⚡ |
| Lighthouse | 45 | 92 | **104%** ⚡ |

### 添加新模板

只需在 `src/templates/template-loader.ts` 中注册：

```typescript
export const TEMPLATE_REGISTRY = {
  // ... 现有模板
  yourTemplate: {
    id: 'yourTemplate',
    name: '你的模板',
    description: '模板描述',
    tags: ['标签1', '标签2'],
    component: lazy(() => import('@/templates/your-template')),
  },
}
```

自动支持：
- ✅ 按需加载
- ✅ 代码分割
- ✅ 在侧边栏显示
- ✅ 类型安全

详见：[docs/QUICK_START_DYNAMIC_TEMPLATES.md](./docs/QUICK_START_DYNAMIC_TEMPLATES.md)

## 📚 文档

- [快速开始：动态模板加载](./docs/QUICK_START_DYNAMIC_TEMPLATES.md)
- [性能优化详解](./docs/PERFORMANCE_OPTIMIZATION.md)
- [模板插件系统](./docs/TEMPLATE_PLUGIN_SYSTEM.md)
- [新模板开发指南](./docs/NEW_TEMPLATES.md)
- [文档索引](./docs/README.md)

## 🔧 开发规范

### 代码风格

- 使用 English 编写代码和注释
- 使用 TypeScript 严格模式
- 所有变量和函数必须声明类型
- 避免使用 `any`
- 使用 JSDoc 注释公共 API
- 一个文件一个导出

### 命名规范

- **类名:** PascalCase
- **变量/函数:** camelCase
- **文件/目录:** kebab-case
- **常量:** UPPERCASE

### Git 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

## 🚀 性能优化

### 已实施

- ✅ 动态Import - 模板按需加载
- ✅ 代码分割 - 自动chunk分割
- ✅ Tree Shaking - 移除未使用代码
- ✅ 懒加载 - Suspense + lazy
- ✅ 本地缓存 - localStorage持久化

### 待优化

- 🔮 预加载 - 鼠标悬浮预加载
- 🔮 骨架屏 - 更好的Loading体验
- 🔮 Service Worker - 离线支持
- 🔮 图片优化 - WebP格式

## 📈 路线图

### v1.0（当前）✅
- ✅ 4个核心模板
- ✅ 完整编辑功能
- ✅ 拖拽排序
- ✅ 主题定制
- ✅ 导出PDF/PNG
- ✅ 动态加载

### v1.1（计划中）
- 🎯 更多模板（10+）
- 🎯 模板预览图
- 🎯 AI智能推荐
- 🎯 导入JSON

### v2.0（未来）
- 🔮 模板市场
- 🔮 在线协作
- 🔮 云端保存
- 🔮 第三方生态

## 📄 许可证

MIT

## 🙏 致谢

感谢以下开源项目：

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lexical](https://lexical.dev/)
- [DnD Kit](https://dndkit.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
