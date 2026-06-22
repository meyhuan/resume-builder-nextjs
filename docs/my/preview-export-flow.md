






Now let me check the `openExportResult` function with the mini-program navigation:

Now let me check the mini-program's [exportResult.js](cci:7://file:///d:/Marker/GitHub/mini-aijianli/miniprogram/pages/exportResult/exportResult.js:0:0-0:0) [applyJob](cci:1://file:///d:/Marker/GitHub/mini-aijianli/miniprogram/pages/exportResult/exportResult.js:133:2-158:3) function:



Now I have all the context needed. Here's the complete data flow:

---

# 完整数据流：修改主题色 → 导出 → 预览页

## 阶段 1: 用户打开预览页 & 修改主题色

```
┌─────────────────────────────────────────────────────────────────────┐
│  preview-client.tsx 挂载                                             │
│  1. useAppStore → resume (简历数据)                                   │
│  2. getThemeForTemplate(templateId) → theme (当前主题 tokens)          │
│  3. <Template resume={resume} theme={theme} /> 实时渲染               │
└─────────────────────────────────────────────────────────────────────┘
```

**用户点击「配色」Tab → 选择颜色：**

```
ColorPanel.onChange(newColor)
  → updateTheme({ primaryColor: newColor })        // L231-238
    → setThemeForTemplate(templateId, draft => Object.assign(draft, patch))
      → zustand store: themes[templateId].primaryColor = newColor
        → 组件 re-render → <Template theme={newTheme} /> 实时预览生效
```

此时主题色**仅存在于客户端 zustand store** (`useAppStore.themes`)，数据库尚未更新。

---

## 阶段 2: 用户点击「导出 PDF」

```
BottomActionBar → onExportPdf → handleExportPdf()
  → handleExport('pdf')                            // L445-447
```

### Step 2.1: `syncPreviewState(resumeId)` — 把主题色写入数据库

```typescript
// L381-414
const mergedThemes = { ...themesMap, [templateId]: theme }
// theme 里已经包含用户刚改的 primaryColor

const editorMeta = {
  themes: mergedThemes,       // ← 所有模板的主题（含新主题色）
  onePageMode: onePageFit,
  onePageSnapshot,
}

const contentWithMeta = embedEditorMeta(cleanContent, editorMeta)
// 把 __editorMeta 嵌入 resume.content JSON

await fetch(`/next-api/resumes/${targetId}`, {
  method: 'PUT',
  body: JSON.stringify({
    title: resume.name,
    content: contentWithMeta,  // ← DB 现在存了最新主题色
    template: templateId,
  }),
})
```

**关键：此步确保数据库中 resume 的 `content.__editorMeta.themes[templateId].primaryColor` 是最新值。**

---

### Step 2.2: `createExportJob()` — 调用统一导出接口

```typescript
// L309-330
fetch('/next-api/exports/mini', {
  method: 'POST',
  credentials: 'include',  // 带 auth_uid cookie
  body: JSON.stringify({
    resumeId: targetResumeId,
    templateId,
    type: 'pdf',
    mode: 'final',           // H5 直接最终导出，消耗配额
    fileName,
  }),
})
```

---

## 阶段 3: 服务端渲染（[/next-api/exports/mini/route.ts](cci:7://file:///d:/Marker/GitHub/resume-builder-nextjs/src/app/next-api/exports/mini/route.ts:0:0-0:0)）

```
POST /next-api/exports/mini
  │
  ├─ 认证: 无 wxId/sign → 读 cookie auth_uid → wxId     // L88-96 (dual auth)
  ├─ 查 DB 验证 resume 所有权
  ├─ mode=final → peekQuotaForUser(wxId) 检查配额
  │
  └─ renderViaPrintPage({                              // 调用共享渲染器
       baseUrl, resumeId, templateId, type:'pdf'
     })
```

### Step 3.1: [renderViaPrintPage()](cci:1://file:///d:/Marker/GitHub/resume-builder-nextjs/src/lib/render-via-print-page.ts:38:0-94:1) — Puppeteer 渲染

```
render-via-print-page.ts:
  1. mintPrintToken(resumeId)   → 生成短效 HMAC token
  2. 构造 URL: /print/{resumeId}?token=xxx&tpl=templateId
  3. puppeteer.launch()
  4. page.goto(printUrl, { waitUntil: 'networkidle0' })
```

### Step 3.2: SSR 打印页 `/print/[id]/page.tsx`

```typescript
// 服务端组件:
1. verifyPrintToken(token, id)       // 验证 token
2. prisma.resume.findUnique({ id })  // 从 DB 读 resume
3. extractEditorMeta(record.content) // 提取 __editorMeta
   → meta.themes[templateId] = { primaryColor: '用户刚改的色值', ... }
4. savedTheme = meta.themes[templateId]  // ← 这就是用户的新主题色！
5. 渲染:
   <PrintRenderer
     resume={resumeData}
     templateId={templateId}
     savedTheme={savedTheme}     // ← 传入用户的主题色
   />
```

### Step 3.3: `print-renderer.tsx` — 客户端渲染模板

```typescript
// 用 savedTheme 作为 ThemeTokens 传给模板组件
<TemplateComponent resume={resume} theme={savedTheme} />
// data-print-ready="1" → Puppeteer 检测到此标志后截图/打印
```

### Step 3.4: 回到 Puppeteer — 生成 PDF + 预览图

```
page.pdf()               → pdfBuffer (PDF 文件)
rasterizePdfToPngs(page, pdfBuffer)  → pageScreenshots[] (每页 PNG)
```

### Step 3.5: 保存 & 返回

```
saveExportTemp(pdfBuffer)         → saved.token
saveExportTemp(每张 PNG)          → previewTokens[]

返回 JSON:
{
  id: saved.token,
  type: 'pdf',
  downloadUrl: '/next-api/export-file/{token}',
  previewImages: ['/next-api/export-file/{previewToken1}?inline=1', ...],
  expiresAt: '...',
  confirmed: true,
}
```

---

## 阶段 4: 导航到导出结果页

### 4a. 在小程序环境 (`inMiniProgram = true`)

```typescript
// preview-client.tsx L337-355
wx.miniProgram.navigateTo({
  url: `/pages/exportResult/exportResult?id=xxx&type=pdf&url=xxx&previewImages=[...]&expiresAt=...`
})
```

### 4b. 小程序 [exportResult.js](cci:7://file:///d:/Marker/GitHub/mini-aijianli/miniprogram/pages/exportResult/exportResult.js:0:0-0:0) 接收

```javascript
// onLoad L65-85
// 检测到 URL 里已经有 id + url → 跳过 beginCreate()
this.applyJob({
  id, type, fileName, downloadUrl, expiresAt,
  confirmed: true,
  previewImages: [...],  // 服务端生成的 PNG URL 列表
})
this.setData({ stage: 'preview', confirmed: true })
```

### 4c. [applyJob()](cci:1://file:///d:/Marker/GitHub/mini-aijianli/miniprogram/pages/exportResult/exportResult.js:133:2-158:3) 处理图片 URL

```javascript
// L137-158
previewImages: job.previewImages.map(url =>
  url.indexOf('http') === 0 ? url : aiH5Origin + url
  // 相对路径加上 origin → 'https://aijianli.cn/m' + '/next-api/export-file/xxx?inline=1'
)
```

---

## 阶段 5: [exportResult.wxml](cci:7://file:///d:/Marker/GitHub/mini-aijianli/miniprogram/pages/exportResult/exportResult.wxml:0:0-0:0) 渲染预览

```xml
<!-- L27-41 -->
<scroll-view scroll-y class="preview-body">
  <block wx:if="{{previewImages.length > 0}}">
    <view wx:for="{{previewImages}}" wx:key="index">
      <image src="{{item}}" mode="widthFix" class="preview-page-img" />
    </view>
  </block>
</scroll-view>
```

用户看到的是 **服务端用新主题色渲染出的 PDF 的每一页 PNG 截图**。

---

## 总结关键链路

```
用户改色 → zustand store (客户端)
         ↓ 点击导出
syncPreviewState → PUT /next-api/resumes/{id} → DB 写入新主题色
         ↓
createExportJob → POST /next-api/exports/mini
         ↓ 服务端
Puppeteer → goto /print/{id} → SSR 读 DB → extractEditorMeta → savedTheme (含新色)
         → <PrintRenderer theme={savedTheme}> → 渲染模板
         → page.pdf() → rasterizePdfToPngs() → PNG 预览图
         ↓ 返回
openExportResult → wx.miniProgram.navigateTo (带 previewImages URL)
         ↓ 小程序
exportResult.js onLoad → applyJob → setData({ previewImages })
         ↓
exportResult.wxml → <image src="{{item}}" /> 展示
```

**核心保证**：用户在预览页看到的主题色，一定会反映在导出结果中，因为 `syncPreviewState` 在 Puppeteer 渲染之前已经把最新 theme 写入了数据库。

---

## 发布兼容复盘：H5 先上线，小程序原生能力未审核通过

### 问题

Markdown 导出服务端和 H5 代码先发布后，小程序原生 `exportResult` 对 Markdown 的支持还未通过微信审核。此时如果 H5 在小程序 web-view 中直接展示“导出 Markdown”，旧版小程序会把 `type=markdown` 跳转给原生页面，但旧原生页面并不知道 Markdown 的文件类型、后缀、预览和分享逻辑，导致线上兼容风险。

### 根因

这是“小程序壳能力”和“H5/Next.js 能力”发布节奏不一致的问题，不是普通 Web feature flag 问题。只要 H5 会调用小程序原生页面、原生 API、分享/下载能力，就必须假设线上存在多个小程序版本并行运行。

### 后续规则

凡是 H5 新功能依赖小程序原生代码能力时，必须使用小程序版本门控：

```text
H5 中展示依赖原生能力的入口 =
  非小程序环境
  OR
  小程序版本 >= 该原生能力支持的最低版本
```

不要只用 Next.js 是否已发布、构建期环境变量、接口是否支持来判断入口是否展示。服务端可以提前兼容新类型，但 UI 入口必须等当前小程序版本具备原生能力后再开放。

### 当前 Markdown 导出方案

- 小程序打开 H5 web-view 时，在 SSO redirect path 上追加 `miniVersion`。
- H5 `/m/preview` 读取 `miniVersion`，并用语义化版本比较判断是否展示“导出 Markdown”。
- 当前最低支持版本在 `use-mini-program-capabilities.ts` 中声明为 `MINI_MARKDOWN_EXPORT_MIN_VERSION = '2.0.0'`。
- H5 内部跳转时用 `sessionStorage` 记住小程序环境和版本，避免从 `/m/edit` 到 `/m/preview` 后丢参数。
- 普通浏览器/H5 不受小程序版本门控影响，仍可展示 Markdown。

### 实施清单

新增任何依赖小程序原生能力的 H5 功能时，先完成以下检查：

1. 明确原生能力最低支持版本，例如 `MINI_XXX_MIN_VERSION`。
2. 小程序进入 H5 时传递 `miniVersion`，优先使用 `wx.getAccountInfoSync().miniProgram.version`。
3. H5 对入口做 `miniVersion >= minVersion` 判断。
4. 服务端保持向后兼容，旧客户端不知道新类型时不能被动进入新流程。
5. 测试旧版本小程序：入口不可见；测试新版本小程序：入口可见且原生页能完成完整流程。
