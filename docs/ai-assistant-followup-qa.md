# AI 助手推荐入口优化验收（2026-10-05）

## 原问题与修复

截图中的人数、工具、反馈摘要问题是询问用户事实的提示。直接发送整句给模型会让助手再次追问，推荐中的示例数字也会进入原来的用户自述集合。改为本地填写后提交，避免把问句、示例数字和工具当成用户经历。

改稿后的推荐使用固定动作文案，不显示人为示例数据。补充表单可填写、留空、选择没有/暂不确定或直接取消。没有表示没有额外信息，原有事实保留。全文任务选择补充段落后仅重新润色该段，切换段落清空填写内容。

用户来源记录随响应、浏览器历史和重试保留，仅用于排除非事实文本，不作为额度或执行授权。原有事实复核、手动应用、撤销和冲突保护继续使用。

## 验证

| 命令 | 范围 | 结果 |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts` | 推荐点击、表单、取消、数值证据、旧历史来源、重试、任务范围、路由、流式与应用回归 | 153 项通过；真实模型用例默认跳过 |
| `node node_modules/vitest/vitest.mjs run --config scripts/vitest.editor-ai.config.ts` | 旧编辑器 AI 回归 | 20 项通过 |
| `AI_LIVE_EVAL=1` + `node --env-file=.env node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts src/lib/ai/unified/engine.live.test.ts -t "executes concise followup"` | 真实模型：精简请求、47 人次、无补充交付物和不确定工具 | 1 项通过；虚构简历，计次回调模拟，不写数据库 |
| `node scripts/test-unified-ai-followup-browser.mjs` | Chrome：截图三类历史问题、本地开关零请求、仅提交真实回答、来源、手动应用撤销、历史刷新；1440/1100 宽度 | 通过，无页面脚本异常或横向溢出 |
| `node scripts/test-unified-ai-stream-browser.mjs` | 流式预览、核对完成后应用、撤销、停止、刷新 | 通过 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 全项目类型检查 | 通过 |
| 修改文件定向 ESLint | 本次代码与测试 | 通过 |

真实模型验证中发现补充后的路由输出 `kind` 格式错误，引发保守追问。补充表单已有明确动作和目标，改为跳过该路由步骤；生成和事实检查仍执行。上述真实模型用例验证了该流程。

本地测试产物（不提交）：`test-artifacts/unified-ai-followups/model-report.json`、`browser-report.json`、`form-wide.png`、`form-narrow.png`；流式回归产物在 `test-artifacts/unified-ai-stream/`。

浏览器验收使用模拟 AI 返回；真实模型验收使用合成简历和模拟额度，不代表线上账号、数据库、额度扣减或部署验收。未改数据库、模板实现或进行线上部署，未重跑全部真实模型用例和生产构建。事实判断仍依赖模型，最终修改需用户预览后应用。
