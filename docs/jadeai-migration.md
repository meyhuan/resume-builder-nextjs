# JadeAI → resume-builder-nextjs 迁移映射

后续同步 JadeAI 开源更新时，按此表逐文件 diff。

原则：**除硬性适配外，prompt / tool description / 输出约束与 JadeAI 保持一致。**

## 允许的偏离白名单

- `sectionId` → `blockId`
- 结构化字段更新 → 只改 block HTML（不改公司/职位/时间等元数据）
- tool `execute` 返回变更，前端自动写入 Zustand；不写数据库
- DashScope provider + `zod` 导入路径
- 聊天 / JD / 语法检查历史走 IndexedDB（`idb-keyval`），不新增 Prisma 模型
- 编辑器骨架保持画布 + 右侧栏；对齐的是顶栏 Dialog + 右下角浮动对话，不是 JadeAI 三栏布局
- 不搬 Settings / BYOK / 语言切换 / 分享；不改 `/m/edit`

白名单以外的文案、tool 行为、token 上限不得自行改写。

## 基础设施

| JadeAI | 本项目 | 改动点 |
|--------|--------|--------|
| `src/lib/ai/provider.ts` | `src/lib/ai/provider.ts` | DashScope-only；API key 读 `DASHSCOPE_API_KEY` |
| `src/lib/ai/extract-json.ts` | `src/lib/ai/extract-json.ts` | 照搬；zod 从 `zod` 导入 |
| `src/lib/ai/prompts.ts` | `src/lib/ai/prompts.ts` | JadeAI 英文原文；sectionId→blockId |
| `src/lib/ai/tools.ts` | `src/lib/ai/tools.ts` | 6 个 chat tools 全量迁移；execute 返回变更，前端自动写入 |
| `src/app/api/ai/jd-analysis/route.ts` prompt | `src/lib/ai/analyze-jd-match.ts` | JadeAI 英文原文 + `maxOutputTokens: 8192` |
| — | `src/lib/ai/resume-context.ts` | 发送完整 HTML；只 strip 头像/作品集 |
| — | `src/lib/ai/html-sanitize.ts` | AI HTML 白名单 |
| — | `src/lib/ai/analysis-history.ts` | IndexedDB list/save/delete，每类最多 20 条 |
| — | `src/state/editor-ui-store.ts` | `activeModal` / `showAiChat` / `pendingAiMessage` / `handoffToChat` |

## API

| JadeAI | 本项目 |
|--------|--------|
| `src/app/api/ai/jd-analysis/route.ts` | `src/app/next-api/ai/jd-analysis/route.ts` |
| `src/app/api/ai/chat/route.ts` | `src/app/next-api/ai/chat/route.ts` |
| `src/app/api/ai/translate/route.ts` | `src/app/next-api/ai/translate/route.ts`（block HTML + NDJSON） |
| `src/app/api/ai/cover-letter/route.ts` | `src/app/next-api/ai/cover-letter/route.ts` |
| `src/app/api/ai/grammar-check/route.ts` | `src/app/next-api/ai/grammar-check/route.ts`（`blockId` 替代 `sectionId`） |

新 AI 路由一律 `applyRateLimit`；前端用 `requireAi`。简历数据由客户端 Zustand 随请求发送。

现有 `src/app/next-api/ai/jd-match`（SEO 启发式）保留不替换。

## Chat tools

| JadeAI | 本项目 | 硬性适配 |
|--------|--------|---------|
| `updateSection` | `updateBlockContent` | 只改 HTML |
| `addSection` | `addSection` | 前端 `store.addSection` |
| `rewriteText` | `rewriteText` | 映射为 updateBlock 并自动写入 |
| `suggestSkills` | `suggestSkills` | 追加到「技能」section 的 HTML list |
| `analyzeJdMatch` | `analyzeJdMatch` | 简历随请求发送 |
| `translateResume` | `translateResume` | 并发翻译各 block HTML，前端自动写入；弹窗是翻译主入口 |

## 编辑器 UI

| JadeAI | 本项目 |
|--------|--------|
| `src/components/editor/editor-toolbar.tsx` | `src/ui/editor-header.tsx`（顶栏）+ `src/ui/editor-toolbar.tsx`（仅模块管理） |
| `src/stores/ui-store.ts` | `src/state/editor-ui-store.ts` |
| `src/components/ai/ai-chat-bubble.tsx` | `src/components/ai-chat/ai-chat-bubble.tsx` |
| `src/components/ai/ai-chat-panel.tsx` | `src/components/ai-chat/ai-chat-panel.tsx`（IndexedDB 多会话） |
| `src/components/editor/jd-analysis-dialog.tsx` | `src/components/editor/jd-analysis-dialog.tsx` |
| `src/components/editor/translate-dialog.tsx` | `src/components/editor/translate-dialog.tsx` |
| `src/components/editor/cover-letter-dialog.tsx` | `src/components/editor/cover-letter-dialog.tsx` |
| `src/components/editor/grammar-check-dialog.tsx` | `src/components/editor/grammar-check-dialog.tsx` |
| — | `src/components/editor/optimize-dialog.tsx`（复用现有 `AiOptimizePanel`，入口在对话窗 Sparkles） |

顶栏：返回（无文字）· 简历名 · 保存状态；右侧撤销/重做、导出、导入、JD 匹配、翻译、求职信、语法检查、主题。窄屏 AI/导入收入 `⋯`。

JD「一键优化」、语法「全部修复」：关弹窗 → `pendingAiMessage` → 打开浮动对话。

## 历史存储（IndexedDB）

| Key | 内容 |
|-----|------|
| `ai-chat-history:{resumeId}` | 多 session，最多 20 条 |
| `jd-analysis-history:{resumeId}` | JD 分析结果 |
| `grammar-check-history:{resumeId}` | 语法检查结果 |
| `interview-prep-history:{resumeId}` | 面试准备（打招呼 / 题目） |

换设备不同步。若以后要微信/PC 互通，再迁 Prisma。

## 暂缓

| JadeAI 功能 | 原因 |
|------------|------|
| `api/resume/parse` | 已有 DocMind 生产方案 |
| `api/interview/*` | 需独立数据模型与 UI |
| JD「复制后优化」 | 本轮未做（翻译「另存副本」已接 `POST /next-api/resumes`） |
