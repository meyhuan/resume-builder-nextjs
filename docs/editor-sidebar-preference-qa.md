# 编辑器侧栏默认状态与记忆

## 行为

- 宽度至少 1024px：首次进入打开「模块」。窄屏首次进入收起工具，展示简历。
- 用户切换工具或收起后，下一次进入恢复该选择；桌面和窄屏分别记忆。
- 偏好仅保存展开状态和工具名称，不保存 AI 任务、简历内容或个人信息。
- 模块生成、润色以及显式转交 AI 的操作仍可打开对应任务。恢复 AI 页签不会重放旧任务。
- 存储被禁用或内容损坏时回退到默认状态，工具仍可正常切换。
- 偏好在客户端初始化后恢复，再挂载 AI 助手，避免旧任务先于恢复流程运行。

## 验证（2026-10-05）

| 命令 | 结果 | 覆盖 |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.editor-ai.config.ts` | 38 项通过 | 18 项偏好测试；20 项既有编辑器 AI 测试 |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts` | 153 项通过，7 项跳过 | AI 任务、流式响应、提议、事实补充、状态与侧栏回归；实时模型测试未启用 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 通过 | TypeScript 检查 |
| `node node_modules/eslint/bin/eslint.js src/hooks/use-editor-sidebar-preference.ts src/hooks/use-editor-sidebar-preference.test.tsx src/components/ResumeEditor.tsx scripts/vitest.editor-ai.config.ts scripts/test-editor-sidebar-preference.mjs` | 通过 | 本次代码与脚本 |
| `node scripts/test-editor-sidebar-preference.mjs` | 通过 | 真实 `/editor/new`：1440px 首次展开、刷新恢复工具与收起状态、375px 首次收起及独立记忆、模块操作打开 AI、刷新不重放生成 |

浏览器脚本使用本地身份和 API 响应模拟，不调用数据库或实际模型。需要本地开发服务（默认 `http://localhost:3127`，可通过 `EDITOR_QA_URL` 指定）。

产物：`test-artifacts/editor-sidebar-preference/report.json`、`desktop-first-entry.png`、`mobile-first-entry.png`。浏览器没有运行时或 hydration 错误。

结论：侧栏进入时具备合理默认状态，并尊重用户之后的选择；已有 AI 入口保持正常。
