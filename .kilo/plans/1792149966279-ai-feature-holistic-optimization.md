# 智简简历 AI 功能全景 Review 与整体优化方案

## 一、 全景 Review：当前 AI 功能矩阵与核心诊断

经过对 `src/lib/ai/**`、`src/components/ai-chat/**`、`src/components/ai-section/**`、`src/components/editor/**` 及 `src/app/next-api/ai/**` 的完整代码审查，当前系统的 AI 能力可归纳为 **4 大板块**，各板块现状与问题诊断如下：

| 板块 | 包含功能与路由 | 现状亮点 | 核心痛点与体验瓶颈 |
| :--- | :--- | :--- | :--- |
| **1. 编辑器统一助手（PC 主链路）** | 模块「AI 润色」、模块「AI 帮我写」、右侧「AI 助手」、全文优化（`/next-api/ai/chat/task`） | NDJSON 流式草稿、单点应用/撤销回执、冲突保护、不污染用户自述事实源 | 1. **串行 3 次 LLM 调用太慢**：已知模块和意图的单段润色仍先调 Router LLM，耗时增加约 40%。<br>2. **核对器误杀与强行扣押草稿**：后置 `verifyFacts` 只要对专业润色存疑，即使已扣减额度，也会清空草稿（`checked.length = 0`）并弹出无选项的审问框。<br>3. **修改卡片默认视图反直觉**：默认开启字符级红绿 Diff（`diff = true`），深度润色时满屏红绿碎片难以阅读，且无法直观看到 `<strong>核心维度：</strong>` 富文本排版。<br>4. **问答交互（`UnifiedQuestions`）割裂**：仅支持单选互斥；点选答案时把冗长的问题标题实时塞入底部全局输入框，极易误删卡死；自定义填写文本在切题后不可见。<br>5. **「AI 帮我写」启动门槛高**：点击后停留在空白页等待二次点击 Starter，缺乏开箱即用的岗位职责点选卡片。 |
| **2. 独立模块抽屉（移动端 & 旧版兼容）** | `AiPolishSheet`（`/next-api/ai/polish-section`）、`AiGenerateSheet`（`/next-api/ai/generate-section`） | 单次 SSE 流式响应快、支持选择求职身份与润色档位 | 1. 移动端与 PC 端能力割裂（PC 端丢失了身份/档位/JD 快捷控制）。<br>2. 生成完成后的预览区对 `[X]%` 占位符缺少高亮提示。 |
| **3. 新建/导入简历（从 0 到 1 链路）** | 向导生成整份简历（`/next-api/ai/generate-resume`）、粘贴/文件导入解析（`/next-api/ai/import-resume*`） | 覆盖在校生/应届生/职场人三类模板结构 | 需确保整份简历生成严格输出 `<ul><li><strong>核心维度：</strong>...</li></ul>` 结构化要点与 `[X]%` 真实留白，杜绝编造虚假业务数字。 |
| **4. 诊断与求职配套工具** | 简历检查（`grammar-check`）、岗位匹配（`jd-analysis`）、面试准备（`interview-prep`）、简历翻译（`translate`）、求职信（`cover-letter`） | 诊断报告与 `startResumeOptimization` 打通，支持一键转入统一助手生成全文修改预览 | 从「简历检查 / 岗位匹配」点击「预览优化建议」进入统一助手时，全文多模块核对若部分模块触发疑问，需保证安全模块正常展示且提示清晰。 |

---

## 二、 核心设计决策（已对齐）

1. **事实核对与草稿展示策略**：**保留建议卡片 + 顶部温和提示核对**
   - 在单模块润色/生成（`polish` / `generate`）时，只要未出现严重违禁（如凭空捏造阿拉伯实数、或把“参与/协助”篡改为“独立主导/负责人”），即使 `verifyFacts` 返回提醒项，也**保留生成的 `proposals` 修改建议卡片**供用户预览和应用，并将核对提醒展示在卡片上方的温和提示栏（`reviewHint` / `answer`）中，不再粗暴清空草稿或强行转入无选项的审问框。
2. **问答交互（`UnifiedQuestions`）升级**：**支持多选胶囊 + 清理底部输入框**
   - 选项胶囊支持**多选切换**（点击多个选项自动以顿号 `、` 拼接，再次点击取消选中）。
   - 答题状态独立保存在 `UnifiedQuestions` 组件内部状态中，**不再将冗长的问题标题实时同步塞入底部全局聊天输入框（Composer）**，避免底部输入框跳动与误删回退；用户自定义填写的文字在卡片内常驻可见；提交时组装结构化回答并在用户气泡中展示简洁摘要。
3. **单模块润色提速与卡片默认视图**：**跳过 Router 直出草稿 + 默认显示「完整改写」**
   - 当明确针对单个模块发起首次润色（`task.entry === 'module' && task.feature === 'polish' && task.blockId` 且无历史对话）时，后端 `engine.ts` **直接跳过第 1 次 Router LLM 调用**，直接进入生成与核对阶段，响应提速约 40%。
   - `ChangeCard` 默认展示 **`完整改写`（`diff = false`）** 富文本视图，直观呈现 `<strong>核心维度：</strong>` 加粗小标题与琥珀色 `[X]%` 占位符高亮胶囊；用户可随时点击切换至 `查看差异`。
4. **PC 端「AI 帮我写」启动交互**：**打开即展示岗位高频职责点选卡片**
   - 当用户在 PC 端点击某个模块的「AI 帮我写（`generate`）」打开面板且无历史对话时，无需二次点击 Starter 再等一轮 LLM 提问，直接展示一张**「岗位高频职责点选 + 1 句话补充」启动卡片**（根据当前模块的职位名/模块类型动态匹配高频职责胶囊 + 1 个选填补充框），勾选后一键生成 3~4 条带加粗小标题的 STAR 结构化要点。

---

## 三、 分步实施计划（Implementation Plan）

### Phase 1：后端引擎提速与温和核对机制（`src/lib/ai/unified/`）

1. **跳过已知单模块润色的 Router 调用（`src/lib/ai/unified/engine.ts`）**
   - 在 `runAssistant` 的 `plan` 决策分支中：除了既存の `directFollowupTarget` 外，识别**单模块直达润色请求**（`task.entry === 'module' && task.feature === 'polish' && task.blockId && turns.length === 0 && text === MODULE_POLISH_REQUEST`）。
   - 命中时直接构造 `{ kind: 'write', feature: 'polish', targets: [task.blockId], questions: [], direct: false, followups: [] }`，省去第 1 次大模型调用。
2. **区分「严重越界拦截」与「温和核对提示」（`src/lib/ai/unified/engine.ts` & `src/lib/ai/unified/types.ts`）**
   - 在 `proposalSchema`（`types.ts`）中新增可选字段 `reviewNotes?: string[]`。
   - 在 `engine.ts` 的 `candidates` 核对循环中：
     - **严重越界（Hard Block）**：当检测到未授权的新增阿拉伯数字（`numbers.length > 0`）或核对问题明确指出职责级别/技能层级被篡改（如 `/主导|负责人|独立承担|精通/` 越级）时，才阻断该 proposal 并生成带快捷确认选项（`["是的，符合我的真实经历", "没有，请仅按原文事实润色"]`）的问题。
     - **温和提示（Soft Warning）**：对于单模块润色/生成中一般的扩展表述提示（`numbers.length === 0` 且无职责越级），**保留该 `proposal` 进入 `checked` 列表**，并将 `audit.questions` 挂载到 `proposal.reviewNotes`（或在卡片顶部展示温和核对提醒：“请核对改写中的细节描述是否符合实际经历”），绝不没收用户已扣费生成的草稿。
3. **完善 `KEEP_ORIGINAL_ANSWER` 在多题场景下的局部作用域（`src/lib/ai/unified/engine.ts`）**
   - 当全部问题都选择 `KEEP_ORIGINAL_ANSWER` 时才直接短路返回“已保留原文”；若用户仅对其中一道题选择“没有/保留原文”，而回答了其他问题，则正常携带用户的有效回答进入生成阶段。

### Phase 2：问答组件重构——多选胶囊与输入框解耦（`src/components/ai-chat/`）

1. **升级 `UnifiedQuestions` 支持多选与独立草稿管理（`src/components/ai-chat/unified-questions.tsx` & `unified-question-reply.ts`）**
   - **支持多选（Multi-select）**：
     - 将单个问题答案按 `、` 拆分为已选集合 `selectedOptions`。
     - 点击某个 `option` 胶囊时，若已选中则移除，未选中则追加（自动以 `、` 连接），允许用户同时勾选多个职责/场景。
   - **常驻展示自定义输入内容**：
     - 当用户通过「自己填写」输入了非预设选项的文本时，即使切换到其他题目再切回，也在卡片内常驻显示已填写的自定义内容，无需再次点击「自己填写」才能查看。
   - **与底部全局输入框（Composer）解耦**：
     - 在 `unified-assistant.tsx` 中新增独立的 `questionDraft` 状态专门供 `UnifiedQuestions` 使用，底部全局 `<textarea>` 保持为空（供用户随时输入自由指令打断或直接提问）。
     - 当用户点击底部的自由发送按钮并输入了自定义指令时，直接发送用户的自由指令，不再被劫持为“下一题”。
   - **优化提交后的用户气泡展示（`src/lib/ai/unified/types.ts` & `unified-assistant.tsx`）**
     - 提交结构化问题回答时，后端仍接收完整的 `问题：回答` 结构以便 `parseStructuredReplies` 精确提取，但在前端展示用户气泡时，格式化为简洁易读的条目列表（去除冗长的核对反问句式）。

### Phase 3：修改建议卡片（`ChangeCard`）与「AI 帮我写」启动卡片优化（`src/components/ai-chat/unified-assistant.tsx`）

1. **`ChangeCard` 默认展示「完整改写」富文本 + 温和核对提示条**
   - 将 `ChangeCard` 的初始状态调整为 `const [diff, setDiff] = useState(false)`（默认激活「完整改写」按钮，展示带 `<ul><li><strong>核心维度：</strong>` 和 `[X]%` 琥珀色高亮胶囊的富文本视图；点击「查看差异」可查看红绿对比）。
   - 在 `ChangeCard` 的「完整改写」视图中，同步对 HTML 内的 `[X]%`、`[X]+`、`[建议补充：...]` 渲染琥珀色高亮标签（`<mark>`），提醒用户应用后替换为真实数据。
   - 若 `proposal.reviewNotes?.length` 存在，在卡片顶部展示一条浅琥珀色温和提示栏（`💡 请留意核对：...`），既保障合规真实，又不打断应用流程。
2. **PC 端「AI 帮我写（`generate`）」开箱即用职责点选卡片**
   - 新建轻量配置或辅助函数（基于当前目标 block 的 `type` 和 `meta.position / role`），在 `session.task.feature === 'generate' && session.turns.length === 0` 时，直接在面板内渲染**「AI 帮我写 · 快捷点选卡片」**：
     - 自动带出当前模块的职位/项目名称标签；
     - 提供 4~6 个贴合该岗位/模块的高频职责多选胶囊（如技术开发岗：`核心功能研发`、`架构设计与解耦`、`性能优化与排障`、`跨端/跨团队联调`、`兼容性适配`；通用职场岗：`核心业务推进`、`SOP流程搭建`、`跨部门协同`、`数据分析与复盘`；校园经历：`活动统筹策划`、`现场执行与物资管理`、`外联赞助与宣传`、`团队协作支持`）；
     - 提供 1 个选填输入框（`补充 1~2 句具体做过的事或成果数据（选填）`）；
     - 底部主按钮 **`[✨ 一键生成结构化要点]`**（附带 `直接根据已有信息生成` 快捷入口），点击后带着用户勾选的真实职责直达后端生成（携带 `followupTargetId: session.task.blockId` 直接跳过 Router 提问，1 次生成 3~4 条带加粗小标题的饱满要点）。

---

## 四、 影响边界与测试验证计划（Validation Plan）

### 1. 受影响的核心文件
- `src/lib/ai/unified/types.ts`（新增可选 `reviewNotes` 或展示摘要字段）
- `src/lib/ai/unified/policy.ts`（润色/生成提示词与规范）
- `src/lib/ai/unified/engine.ts`（单模块润色跳过 Router、温和核对保留草稿、多题局部保留原文）
- `src/components/ai-chat/unified-question-reply.ts`（支持多选选项拼接与切换）
- `src/components/ai-chat/unified-questions.tsx`（多选胶囊 UI、自定义文本常驻展示）
- `src/components/ai-chat/unified-assistant.tsx`（`questionDraft` 与底部输入框解耦、`ChangeCard` 默认完整改写视图与占位符高亮、`generate` 快捷点选启动卡片）
- 对应单元测试文件：`src/lib/ai/unified/engine.test.ts`、`src/components/ai-chat/unified-assistant.test.tsx`、`src/lib/ai/unified/policy.test.ts`

### 2. 验证命令与验收标准
1. **统一助手与 AI 核心单元测试**：
   - 执行 `pnpm run test:ai`（`vitest run --config scripts/vitest.unified-ai.config.ts`）
   - 更新并新增测试断言：验证单模块润色直达生成、多选胶囊拼接/取消、`questionDraft` 独立不污染底部输入框、`ChangeCard` 默认展示完整改写及切换查看差异、`generate` 点选卡片一键提交。
2. **编辑器 AI 回归测试**：
   - 执行 `npx vitest run --config scripts/vitest.editor-ai.config.ts`
3. **代码规范与类型检查**：
   - 执行定向 ESLint 与 TypeScript 类型检查，确保零警告、零报错。
