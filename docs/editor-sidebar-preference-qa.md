# 编辑器侧栏默认状态与记忆

## 行为

- 没有已保存偏好时：桌面创建空白简历打开「模块」，窄屏创建空白简历收起工具；从 AI 生成入口进入则打开「AI 助手」。
- AI 入口通过 `source=ai` 识别，包括登录保存后进入 `/editor/[id]?source=ai` 与缓存结果进入 `/editor/new?source=ai`；生成器的「跳过，直接创建」仍按空白简历处理。
- AI 草稿首次保存时保留来源标记，避免更新地址导致侧栏重新恢复为空白入口的默认工具。
- 用户切换工具或收起后，下一次进入优先恢复该选择，AI 来源标记不会覆盖偏好；桌面和窄屏分别记忆。
- 偏好仅保存展开状态和工具名称，不保存 AI 任务、简历内容或个人信息。
- 模块生成、润色以及显式转交 AI 的操作仍可打开对应任务。恢复 AI 页签不会重放旧任务。
- 存储被禁用或内容损坏时回退到默认状态，工具仍可正常切换。
- 偏好在客户端初始化后恢复，再挂载 AI 助手，避免旧任务先于恢复流程运行。

## 验证（2026-10-05）

| 命令 | 结果 | 覆盖 |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.editor-ai.config.ts` | 43 项通过 | 23 项偏好测试（含 AI 入口、已有偏好优先、客户端切换入口）；20 项既有编辑器 AI 测试 |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts` | 153 项通过，7 项跳过 | AI 任务、流式响应、提议、事实补充、状态与侧栏回归；实时模型测试未启用 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 通过 | TypeScript 检查 |
| `node node_modules/eslint/bin/eslint.js src/hooks/use-editor-sidebar-preference.ts src/hooks/use-editor-sidebar-preference.test.tsx src/components/ResumeEditor.tsx src/components/ai/wizard-layout.tsx scripts/test-editor-sidebar-preference.mjs` | 通过 | 本次代码与脚本 |
| `node scripts/test-editor-sidebar-preference.mjs` | 通过 | 真实 `/editor/new`：1440px 首次展开、刷新恢复工具与收起状态、375px 首次收起及独立记忆、模块操作打开 AI、刷新不重放生成；AI 来源首次打开助手，已有样式页签或收起选择优先；模拟首次保存保留来源与 AI 页签 |

浏览器脚本使用本地身份和 API 响应模拟，不调用数据库或实际模型。需要本地开发服务（默认 `http://localhost:3127`，可通过 `EDITOR_QA_URL` 指定）。

产物：`test-artifacts/editor-sidebar-preference/report.json`、`desktop-first-entry.png`、`mobile-first-entry.png`、`desktop-ai-entry.png`。浏览器没有运行时或 hydration 错误。

结论：侧栏进入时具备合理默认状态，并尊重用户之后的选择；已有 AI 入口保持正常。
