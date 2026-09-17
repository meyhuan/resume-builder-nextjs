# 编辑页 AI 工作区调整与验证

日期：2026-09-17。分支：`codex/editor-ai-panel`，基于 `7c8270e`。

## 行为

- AI 对话、模块管理、排版共用一个可收起的右侧区域。默认展示完整简历。
- 768px 及以上并排展示画布和限宽工具（320–380px）；768–1279px 简历以 80% 显示，空间不足时仅画布内部横向滚动。小于 768px 切换画布与工具视图，通过“返回简历”返回。
- 对话组件保持挂载，切换工具和收起面板不会丢失输入草稿或中断响应。
- 段落润色、生成复用原表单并进入侧栏，显示当前段落名称；其他页面没有侧栏宿主时保持原抽屉行为。
- 对话修改改为建议卡片，逐条应用或忽略，应用失败不会显示成功。仍可使用顶栏撤销。
- 新对话记录保存建议处理状态；旧版已自动应用的历史建议只读，防止重复写入。
- 编辑工具打开时，桌面反馈入口移至左下角；窄屏隐藏该悬浮入口，避免遮挡发送与应用按钮。

## 最终验证

| 命令 | 覆盖 | 结果 |
| --- | --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 全项目类型检查 | 通过 |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.editor-ai.config.ts --maxWorkers 1` | 面板互斥、弹窗任务转交、建议不自动写入、重复应用保护、忽略、目标删除、历史恢复、段落表单保留、无宿主时抽屉兼容 | 10/10 通过 |
| `node scripts/test-editor-ai-workspace.mjs` | 真实浏览器中的桌面不遮挡、工具切换/收起后草稿保留、320/375/414/768/1024/1280/1440px、模拟流式建议→应用→撤销、工作经历润色与生成侧栏入口、运行时错误检查 | 通过 |
| `node node_modules/eslint/bin/eslint.js src/components/ResumeEditor.tsx src/components/ai-chat src/components/ai-section src/hooks/use-ai-chat.ts src/hooks/use-chat-history.ts src/state/editor-ui-store.ts src/ui/editor-header.tsx src/features/feedback/feedback-widget.tsx src/lib/ai/prompts.ts src/app/next-api/ai/chat/route.ts` | 调整涉及的生产代码 | 通过 |
| `git diff --check` | 补丁空白检查 | 通过 |

## 浏览器复现

在此 worktree 使用本地占位服务地址启动：

```powershell
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='http://localhost:3018/mock-java'
node node_modules/next/dist/bin/next dev --port 3018
```

另一个终端执行浏览器测试脚本。脚本只接受 localhost/127.0.0.1，使用独立浏览器、模拟身份、拦截的配额/API 与固定 AI SSE 响应。不会访问真实简历账号或调用真实模型。开发预览的登录服务地址是占位值，不可用于真实登录验收。

截图位于忽略提交的 `test-artifacts/editor-ai-workspace/`：`desktop-1440.png`、`workspace-320.png` 至 `workspace-1280.png`、`suggestion-review.png`、`section-polish.png`、`section-generate.png`。已人工查看桌面、320px、建议卡片与润色截图。

## 范围与限制

- 未验证真实登录、线上配额、真实 AI 文案质量与 PDF 导出。
- 未改动简历模板文件，未运行全量模板 QA；现有模板的行为通过编辑器浏览器流程作局部回归。
- 本轮不改造岗位匹配、翻译等独立任务弹窗，也不实现原文逐字差异展示。
- 使用主目录现有 node_modules 的目录联接；未重新安装依赖。pnpm 自动依赖检查曾中止，最终使用上表中的直接 Node 命令。
- 初次测试夹具在重渲染时重复生成会话 ID 导致内存异常，已修正为每个测试固定会话 ID；最终完整测试通过。

结论：本地布局与交互回归通过，可以进入产品验收；尚未合并或部署。


## 截图反馈修正

- 模块和排版作为嵌入式面板时不再渲染内部标题及 ×，统一使用工作区的“收起”。独立使用这些组件的页面保留原有标题。
- 排版仅保留紧凑的“模板 / 样式设置”切换；工具内部独立滚动，外层不再重复滚动。
- 浏览器测试新增桌面宽度下画布必须可见、侧栏最大 380px、重复标题和关闭入口不存在的断言；完整浏览器流程再次通过。
- 本轮类型检查、受影响文件 ESLint、git diff --check 通过；人工查看 1024px、模块、排版截图。
- 新截图：`workspace-1024.png`、`modules-clean.png`、`layout-clean.png`。
- 预览服务现已使用忽略提交的 `.env.local`（复制自主项目）；上面的模拟服务启动命令仍可用于隔离 QA。浏览器脚本阻止外部请求并拦截本地 API。


## 单排导航与按钮美化

- 工作区导航合并为“AI 助手 / 模块 / 模板 / 样式”，模板与样式直接打开对应内容；嵌入式侧栏不再显示第二排切换。
- 浅紫底槽、白色选中项、紫色文字与细边框，补齐 hover、按下、键盘焦点与减少动画偏好；收起采用独立图标及文字提示。
- 顶部“主题”同步改为“样式”，与侧栏保持一致。
- 类型检查、受影响文件 ESLint、补丁检查通过；完整浏览器回归通过，新增四入口/无第二排导航断言，以及样式内容和顶部样式开关验证。
- 已检查 320px 和桌面截图。截图：`layout-clean.png`、`styles-single-row.png`、`workspace-320.png`。
