# AI 助手流式展示验收（2026-10-03）

## 问题确认

原任务接口在 `runAssistant` 完成意图路由、正文生成、独立事实核对后返回一次 `{turn}` JSON；前端通过 `await response.json()` 读取完整结果。等待期间只有固定状态文字，已经生成的正文不会显示。

修改前先运行延迟 JSON 响应测试：接口不结束时界面无正文、无应用按钮，放行完整结果后正文才出现。该复现与兼容测试保留在 `unified-assistant.test.tsx`。原行为出于完整事实核验后展示的设计，体验问题来自整个链路没有中间输出。

## 改动与边界

- 正文生成改用模型真实流式输出，每约80ms提取一次 JSON 中用户可见的正文，纯文本显示逐渐增长的草稿。没有在完成后模拟打字。
- 任务接口增加可选 NDJSON 流式协议及实际阶段事件：理解要求、生成草稿、格式重试、事实核对。不展示内部推理、路由或复核输出。
- 草稿明确标注尚未完成事实核对，只保存在组件临时状态。不能应用，不写入简历、IndexedDB 历史或后续请求上下文。
- 完整结果仍须经过原有结构、事实、数字、范围检查；只有最终结果开放应用，或在本条明确授权和原有冲突检查通过后自动应用。追问替代不通过核对的草稿。
- 停止、断流、错误和超时清除草稿；取消响应体会中止服务端模型调用。保留原有计次口径，不自动重新发送请求。
- 客户端处理跨分片中文 UTF-8、分片行、多个事件、无末尾换行、错误事件及缺少最终结果；校验请求 ID 和最终建议的 `factChecked`。原 JSON 调用方仍兼容。
- 响应增加 `Cache-Control: no-cache, no-transform` 和 `X-Accel-Buffering: no`。

## 测试报告

| 检查 | 命令 | 覆盖与结果 |
|---|---|---|
| 修改前复现 | `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts src/components/ai-chat/unified-assistant.test.tsx` | 当时32项通过；延迟完整 JSON 期间无正文，完成后才展示 |
| 助手专项 | `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts` | 139项通过；流式上游、格式重试、阶段顺序、核对失败、提前预览、最终应用、取消、断流、额度、历史及原工作流。6个真实模型用例默认跳过，新增流式用例单独运行 |
| 最后解析错误文案调整 | `node node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts src/lib/ai/unified/stream.test.ts src/components/ai-chat/unified-assistant.test.tsx` | 41项通过；避免向用户显示内部 JSON/schema 诊断 |
| 旧功能回归 | `node node_modules/vitest/vitest.mjs run --config scripts/vitest.editor-ai.config.ts` | 20项通过；旧聊天、模块入口、移动端既有路径及编辑器状态 |
| 真实模型 | 设置 `AI_LIVE_EVAL=1` 后运行 `node --env-file=.env node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts src/lib/ai/unified/engine.live.test.ts -t "streams synthetic"` | 新增1项通过，其余5项本轮未重跑；真实配置模型、虚构经历、生成及事实复核，未操作账号简历或数据库额度 |
| 流式浏览器 | 本地 Next dev，`node scripts/test-unified-ai-stream-browser.mjs` | 通过；Chrome 实际“AI帮我写”入口、分次到达的草稿、事实核对阶段、应用/撤销、停止、刷新不恢复草稿/不重发。1440×960、1100×900截图已视觉检查，无页面横向溢出。响应为可控虚构流，不代表线上模型效果 |
| 原浏览器流程 | `node scripts/test-unified-ai-browser.mjs` | 通过；原 JSON 兼容、润色、差异预览、应用、撤销、历史与埋点 |
| 类型检查 | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 通过 |
| 定向 lint | `node node_modules/eslint/bin/eslint.js` 后附本次修改的任务路由、助手界面、engine、stream及对应测试文件 | 通过，只有既有浏览器兼容数据库过期提示 |

真实模型单次观测：首段可见草稿 **2924ms**，最终事实核对结果 **8735ms**，草稿更新 **13次**，最终1条可应用建议。首段展示较等待完整结果提前约5.8秒。这是虚构材料的一次观测，不是生产延迟承诺；本次优化主要缩短无正文等待，而非证明总模型耗时下降。

## 产物与未覆盖项

- `test-artifacts/unified-ai-stream/streaming.png`、`narrow.png`、`checked.png`：流式、窄屏及最终操作截图。
- `test-artifacts/unified-ai-stream/report.json`：浏览器验收报告；`model-report.json`：上述真实模型时间观测。
- `test-artifacts/unified-ai/`：原浏览器流程截图与报告。
- 未部署、未运行生产环境浏览器或代理/CDN验收；发布后需检查实际链路是否保留分片传输。
- 本次没有修改简历模板；未重跑模板截图矩阵或全文生产构建。工作区已有模板改动不属于本任务。
- 真实模型用例没有消耗真实账号的数据库配额；真实身份/数据库额度集成未在本轮重跑，配额语义通过原专项模拟数据库测试覆盖。

结论：本地已确认并修复整段等待问题。用户能在模型尚未完成时看到草稿，最终应用和历史保存仍只接受核验完成的结果；本地自动化与浏览器验收通过。
