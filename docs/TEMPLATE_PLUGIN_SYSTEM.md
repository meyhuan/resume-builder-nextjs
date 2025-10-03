# 模板插件系统设计方案

## 方案对比

### 方案 1: 动态 Import（推荐用于中小型项目）✅

**优点：**
- ✅ 简单易用，无需额外服务器
- ✅ 原生 Vite/Webpack 支持
- ✅ 完整的 TypeScript 类型支持
- ✅ 自动代码分割，按需加载
- ✅ 开发体验好

**缺点：**
- ⚠️ 模板仍在同一仓库
- ⚠️ 部署时需要一起发布
- ⚠️ 不支持运行时添加新模板

**适用场景：**
- 10-50 个模板
- 团队自有模板
- 不需要第三方贡献模板

**实现代码：** 见 `template-loader.ts` 和 `App-dynamic.tsx`

---

### 方案 2: 远程模板插件系统（推荐用于大型平台）🔌

**架构：**
```
┌─────────────┐      ┌──────────────┐
│   主应用    │ ────▶│  模板服务器   │
│  (React)    │      │   (CDN/API)  │
└─────────────┘      └──────────────┘
       │                     │
       │  1. 请求模板列表     │
       │◀────────────────────│
       │  2. 选择模板         │
       │─────────────────────▶
       │  3. 加载模板代码     │
       │◀────────────────────│
       │  4. 渲染模板         │
```

**优点：**
- ✅ 完全独立部署
- ✅ 支持第三方贡献模板
- ✅ 运行时动态添加/更新
- ✅ 按需加载，极快的首屏速度
- ✅ 可以建立模板市场

**缺点：**
- ⚠️ 需要模板服务器
- ⚠️ 安全性需要考虑（XSS、代码注入）
- ⚠️ 需要版本管理
- ⚠️ TypeScript 类型支持受限

**适用场景：**
- 50+ 模板
- 模板市场/生态
- 第三方开发者贡献
- 大型 SaaS 平台

---

## 方案 2 实现示例

### 1. 模板 API 接口设计

```typescript
// template-api.ts

export interface RemoteTemplateManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  tags: string[]
  thumbnail: string
  scriptUrl: string // 模板JS代码URL
  stylesheetUrl?: string // 可选CSS
  verified: boolean // 是否官方认证
  downloads: number
  rating: number
}

export interface TemplateListResponse {
  templates: RemoteTemplateManifest[]
  total: number
  page: number
}

/**
 * 从服务器获取模板列表
 */
export async function fetchTemplateList(
  page: number = 1,
  tags?: string[]
): Promise<TemplateListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    ...(tags && { tags: tags.join(',') }),
  })
  
  const response = await fetch(`https://api.yoursite.com/templates?${params}`)
  return response.json()
}

/**
 * 动态加载远程模板
 */
export async function loadRemoteTemplate(
  manifest: RemoteTemplateManifest
): Promise<React.ComponentType<any>> {
  // 1. 加载CSS（如果有）
  if (manifest.stylesheetUrl) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = manifest.stylesheetUrl
    document.head.appendChild(link)
  }

  // 2. 加载 JS 代码
  const script = document.createElement('script')
  script.src = manifest.scriptUrl
  script.type = 'module'
  
  return new Promise((resolve, reject) => {
    script.onload = () => {
      // 模板应该注册到 window.ResumeTemplates
      const component = (window as any).ResumeTemplates?.[manifest.id]
      if (component) {
        resolve(component)
      } else {
        reject(new Error(`Template ${manifest.id} not found`))
      }
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}
```

### 2. 模板格式规范

模板开发者需要按以下格式开发：

```typescript
// my-awesome-template.tsx
import React from 'react'
import type { ResumeData, ThemeTokens } from '@resume-builder/types'

interface TemplateProps {
  resume: ResumeData
  theme: ThemeTokens
}

export default function MyAwesomeTemplate(props: TemplateProps) {
  const { resume, theme } = props
  
  return (
    <div style={{ color: theme.primaryColor }}>
      <h1>{resume.name}</h1>
      {/* ... */}
    </div>
  )
}

// 注册到全局
if (typeof window !== 'undefined') {
  ;(window as any).ResumeTemplates = (window as any).ResumeTemplates || {}
  ;(window as any).ResumeTemplates['my-awesome-template'] = MyAwesomeTemplate
}
```

### 3. 构建和发布流程

```bash
# 模板开发者的项目结构
my-template/
├── package.json
├── src/
│   └── index.tsx
├── vite.config.ts
└── README.md

# vite.config.ts - 构建为UMD格式
export default {
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MyTemplate',
      fileName: 'my-template',
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
}

# 构建并发布到CDN
pnpm build
# 上传 dist/my-template.umd.js 到 CDN
```

### 4. 主应用使用

```tsx
// App.tsx
import { useState, useEffect } from 'react'
import { fetchTemplateList, loadRemoteTemplate } from './template-api'

function App() {
  const [templates, setTemplates] = useState([])
  const [currentTemplate, setCurrentTemplate] = useState(null)
  
  useEffect(() => {
    // 加载模板列表
    fetchTemplateList().then(res => {
      setTemplates(res.templates)
    })
  }, [])
  
  async function handleSelectTemplate(manifest) {
    const TemplateComponent = await loadRemoteTemplate(manifest)
    setCurrentTemplate(() => TemplateComponent)
  }
  
  return (
    <div>
      {/* 模板选择 */}
      <TemplateSelector 
        templates={templates}
        onSelect={handleSelectTemplate}
      />
      
      {/* 渲染当前模板 */}
      {currentTemplate && (
        <Suspense fallback={<Loading />}>
          <ErrorBoundary>
            {React.createElement(currentTemplate, { resume, theme })}
          </ErrorBoundary>
        </Suspense>
      )}
    </div>
  )
}
```

---

## 方案 3: 微前端架构（适合超大型应用）

使用 qiankun、Module Federation 等微前端框架。

**优点：**
- ✅ 完全独立开发、部署、运行
- ✅ 技术栈可以不同
- ✅ 完全隔离

**缺点：**
- ⚠️ 复杂度高
- ⚠️ 通信成本
- ⚠️ 性能开销

**适用场景：**
- 超大型企业应用
- 多团队协作
- 不同技术栈混用

---

## 性能对比

| 方案 | 首屏加载 | 切换模板 | 开发体验 | 维护成本 |
|------|---------|---------|---------|---------|
| 全部打包 | 慢(5-10s) | 快(0s) | 好 | 低 |
| 动态Import | 快(1-2s) | 中(0.5s) | 好 | 低 |
| 远程加载 | 很快(<1s) | 中(1s) | 中 | 中 |
| 微前端 | 快(1-2s) | 慢(2-3s) | 复杂 | 高 |

---

## 推荐方案

### 如果你的情况是：

**1. 模板数量 < 20 个**
→ 使用**当前方案**（全部打包）即可
→ 对用户体验影响不大

**2. 模板数量 20-50 个**
→ 使用**方案1（动态Import）** ✅
→ 简单、高效、类型安全
→ 立即可用，修改成本低

**3. 模板数量 > 50 个，或需要建立模板生态**
→ 使用**方案2（远程加载）** ✅
→ 需要开发模板服务器
→ 支持第三方贡献
→ 可以建立模板市场

**4. 超大型企业应用**
→ 考虑**方案3（微前端）**
→ 多团队协作
→ 技术栈多样化

---

## 安全性考虑

### 远程加载模板的安全风险：

1. **XSS 攻击** - 恶意代码注入
2. **数据窃取** - 访问用户简历数据
3. **CSRF** - 跨站请求伪造

### 安全措施：

```typescript
// 1. 内容安全策略（CSP）
<meta 
  http-equiv="Content-Security-Policy" 
  content="script-src 'self' https://trusted-cdn.com;"
/>

// 2. 模板沙箱隔离
import { createSandbox } from 'template-sandbox'

const sandbox = createSandbox({
  allowedAPIs: ['React', 'ReactDOM'],
  disallowedAPIs: ['fetch', 'XMLHttpRequest', 'localStorage'],
  timeout: 5000
})

const SafeTemplate = sandbox.wrap(RemoteTemplate)

// 3. 代码审核
// 官方认证的模板才能上架
// 人工+自动化审核

// 4. 版本锁定
// 用户选择模板后锁定版本号
// 避免模板更新带来的风险
```

---

## 实施建议

### 第一阶段（当前）
- ✅ 保持现有架构
- ✅ 优化代码分割
- ✅ 添加 loading 状态

### 第二阶段（模板 > 20）
- ✅ 实施动态 Import
- ✅ 使用 `template-loader.ts`
- ✅ 添加标签筛选

### 第三阶段（模板 > 50）
- ✅ 开发模板服务器
- ✅ 实施远程加载
- ✅ 建立审核流程

### 第四阶段（模板市场）
- ✅ 开放第三方开发
- ✅ 模板市场 UI
- ✅ 评分和评论系统

---

## 总结

**现在立即可做：**
1. 使用 `template-loader.ts` 替换现有的硬编码模板列表
2. 使用 `App-dynamic.tsx` 实现懒加载
3. 享受自动代码分割的性能提升

**性能提升预估：**
- 首屏加载时间：减少 60-70%
- 切换模板：无感知（<100ms）
- 添加新模板：零影响

**未来扩展：**
- 当模板增多时，可以平滑过渡到远程加载方案
- 架构设计支持渐进式演进
