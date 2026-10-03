# AI 使用与采纳埋点口径

2026-09-26：统一助手埋点第二版。复用 Java 的 `analytics_events.properties`，不新增表、字段或迁移；沿用 `ai_assist_interaction` 白名单。此文描述上线后可采集的数据，不代表已有生产数据或已上线 AI 专项看板。

## 数据范围与标识

所有新版交互包含 `schemaVersion: 2`、`assistantVersion: unified`、`eventId`。使用现有 userId（已登录）、anonymousId（匿名）、clientType、page 和服务端入库时间。统计时优先使用带命名空间的 userId，缺失时使用 anonymousId；匿名到登录的身份合并需另行制定规则，不能直接相加为人数。

- `taskId`：同一次模块任务/对话；`requestId`：一次实际提交，手动重试创建新 ID。
- `requestedFeature`：任务初始功能，用于起点与终点一致的漏斗分组；`feature`：该响应实际处理的功能。二者可能不同。
- `entry`：任务原始来源 module / assistant；恢复模块任务后点击助手按钮不会改变任务原始来源。
- `surface`：入口物理位置 block / header / menu / workspace。入口事件描述点击位置，任务事件描述原始归因；不要据此推断所有助手打开都会创建新任务。
- `proposalId = requestId:proposal:index`：建议稳定 ID，从 0 开始，预览、应用、保留、撤销与冲突共用。
- `optionId = requestId:followup:index`：推荐问题稳定 ID，从 0 开始。
- `mode`：preview / direct，用户看过结果后主动采纳与提前授权直接执行分别统计。

只上报上述操作元数据、枚举、数量、耗时，不上报提示词、经历正文、建议正文、模块标题、推荐问题文案或原始异常信息。此约束针对新增的助手事件字段，公共采集器原有的页面、来源、账号字段继续保留。

## 行为

| action | 时机及字段 |
|---|---|
| entry_view | 入口进入视区；entry、surface、feature。模块按钮只统计启用新版且 PC 宽度下的实际可见按钮 |
| entry_open | 点击模块入口，或从关闭/其它面板进入助手；再次点击关闭不记录打开 |
| panel_view | 当前任务面板实际进入视区；后台挂载、隐藏面板不算曝光 |
| start | 请求真正提交；submissionSource、previousRequestId、previousResultType；追问的回答可由前一请求关联 |
| success / clarify | 收到完整结果；resultType=answer/proposals/clarification、elapsedMs、charged、proposalCount、questionCount、optionCount、mode |
| preview | 生成了可供预览的结果，带 proposalCount；这是结果可用事件，不声称用户已经看见 |
| proposal_view | 某条建议进入视区；proposalId、proposalIndex、proposalCount、mode |
| apply / keep | 单条建议成功应用／明确保留原文；proposalId、mode=preview |
| direct_apply | 明确授权后实际修改成功，每条建议分别记录；mode=direct |
| undo | 面板内撤销成功，每条被还原的建议分别记录；批量直接应用共用撤销凭据时记录所有被还原的建议 |
| conflict | 修改未执行；operation=apply/undo，并带 proposalId 和 mode。自动应用冲突也记录 |
| followup_view / followup_click | 推荐问题进入视区／被点击；optionId、optionIndex，曝光带 optionCount |
| quota_blocked / failed / cancel | 本次请求唯一的异常终态；elapsedMs、failureReason，HTTP 响应存在时带 statusCode |

曝光由 IntersectionObserver 和页面可见状态共同判断（至少部分进入视区，不代表完整阅读或满意）。每个挂载元素按稳定 ID 去重；重新挂载/刷新可能再次曝光，报表仍需按用户和业务 ID 去重。浏览器不支持观察器时不伪造曝光。未进入视区的结果仍会有 preview，不会有 proposal_view。入口无 taskId 时用用户、日期、surface、feature 做 UV 分析，不用重复悬浮产生的 PV 算点击率。

`submissionSource` 区分 typed / starter / followup / handoff / retry：

- 推荐问题点击立即提交，新的 start 通过 sourceRequestId + sourceOptionId 关联原选项；如果请求被前端阻止，就不会出现 start。
- 重试通过 retryOfRequestId 指向失败/停止的请求，保留原选项来源；不能把重试计为新的推荐问题点击。
- previousRequestId 指向最近一条成功返回的对话，previousResultType=clarification 可衡量追问继续率；并不以“用户回复内容包含某词”来推测。

失败分类：quota、auth、rate_limit、invalid_request、unavailable、server、network、invalid_response、timeout、cancelled。额度阻断不再同时记录 failed。耗时为用户提交到完整结果或异常返回的客户端耗时，包含网络与核验，不是纯模型推理时间。charged 是响应报告的计次状态，埋点不作为财务或余额账本。

## 指标计算

先筛选同一版本、设备、目标用户群和观察窗口。以开始请求的 cohort 为分母，结果允许在固定后续窗口内到达，避免跨日结果错位；去掉测试账号和内部环境。建议先用 24 小时观察采纳/撤销，报表显示尚未成熟的样本，不把它们当成拒绝。

| 指标 | 定义 |
|---|---|
| AI 使用率 | 同期编辑器用户中有 start 的去重人数 / 编辑器用户数（editor_open）；灰度期需限定已开放人群，否则仅代表全编辑器覆盖率 |
| 入口点击用户率 | 曝光用户中随后点击对应入口的人数 / 该入口曝光人数；按 surface、feature 拆分 |
| 模块启动率 | entry_open 后有 start 的模块 taskId 数 / 模块 entry_open 的 taskId 数 |
| 有响应率 | start 请求中匹配 success 或 clarify 的 requestId 数 / start 请求数；clarify 不算失败，也不算产出改稿 |
| 预览请求采纳率 | preview 请求中至少一条 apply 的 requestId 数 / preview 请求数，排除 direct_apply |
| 逐条可见建议采纳率 | 已有 proposal_view 且随后 apply 的 proposalId 数 / 可见的 preview 模式 proposalId 数 |
| 明确保留原文率 | 已有 proposal_view 且随后 keep 的 proposalId 数 / 可见的 preview 模式 proposalId 数；未处理不等于拒绝 |
| 面板撤销率 | 被 undo 的已采纳 proposalId 数 / 已采纳 proposalId 数，preview 和 direct 分开；只覆盖助手面板撤销，不覆盖全局撤销快捷键或用户手动重写 |
| 观察期内未撤销采纳率 | 观察期内 apply 且无对应 undo 的可见建议数 / 可见建议数；不称为最终保留率，导出前仍可能手动改动 |
| 追问继续率 | clarify 后有 start.previousRequestId 指向该请求的请求数 / clarify 请求数 |
| 推荐问题点击率 | 被点击的已曝光 optionId 数 / 已曝光 optionId 数；分子必须有对应曝光，缺曝光的点击另列采集完整性 |
| 推荐问题提交率 | 点击后有 start 且 submissionSource=followup 的 optionId 数 / 点击的 optionId 数；排除 retry |
| 额度阻断率 | quota_blocked 请求数 / start 请求数 |
| 故障率与耗时 | failed 请求数 / start 请求数；按 failureReason 拆分。成功、追问、失败各算 elapsedMs 的 P50/P95 |

同一预览请求可能部分 apply、部分 keep，两者请求级比例之和可以超过 100%。逐条统计必须使用 proposalId。普通问答没有可应用建议，不进入改写采纳率。

新旧版本数据不可直接混算：旧 undo 没有 requestId，旧 apply 没有 proposalId，无法追溯补齐。恢复旧历史后新增的 v2 交互可以保留，但严格漏斗应只纳入有 v2 start 的请求。sessionId 当前由公共采集器保存在 localStorage，并非超时切分的访问会话；不要拿它计算单次会话留存。

AI 使用后导出可以按用户和时间关联 export_success，反映相关性；当前新增元数据未包含简历 ID，不能据此证明导出的就是被修改的那份简历，也不能声称因果提升。

## 发布与验证

仍需 Java 的既有助手事件白名单修复 e115f5b；本次 action/字段扩充无需额外后端部署或数据库迁移。新版前端构建需 NEXT_PUBLIC_UNIFIED_AI_ASSISTANT=true。历史埋点和旧工具事件保持原口径。

本地验证：专项 Vitest 覆盖多建议采纳与批量撤销、隐藏面板曝光、历史不重放、推荐问题关联、追问继续、失败分类和采集失败不影响编辑。浏览器脚本 scripts/test-unified-ai-browser.mjs 拦截 AI 返回及埋点 HTTP 请求，核验真实观察器曝光、应用/撤销关联、点击/提交关联及不上传正文；不调用真实模型或真实埋点接口。产物位于 test-artifacts/unified-ai/analytics-report.json 和 browser-report.json。

生产上线后还需抽查事件入库与漏斗缺失率。当前管理员总览仍按事件名汇总，查看以上细分指标需要对 properties 做聚合，不能直接把“AI 助手任务交互”总次数当使用次数或采纳次数。


## 全文优化迁移后的统计口径

继续使用 ai_assist_interaction（schemaVersion=2），新增可选 scope=resume/module/chat、entry=resume_check/jd_match、批量 selectedCount。

- 自然输入全文优化的 start 和最终结果/应用事件 scope=resume；从检查或岗位匹配进入的新任务也可以按 entry 分组。不要把一次逐段生成计算成多次使用。
- 使用量按 start 的 requestId 去重；成功生成按 proposalCount>0 的 success 或 clarify 去重（局部追问可以同时有安全建议）。纯追问不算可接受结果。
- 建议接受率：已 apply/direct_apply 的 proposalId 数 / 实际 proposal_view 的 proposalId 数。查看未曝光的直接应用应单独统计，不能混入预览接受率。
- 任务接受率：至少应用一项建议的 requestId / 有可应用建议的 requestId；净接受率排除后续 undo 的 proposalId。批量应用仍逐建议发出 apply，共享一次撤销时每项发 undo。
- 旧 ai_result_apply / ai_optimize_panel / optimize_resume 停止新增，不删除历史记录；新旧漏斗分开查询，切勿直接拼接旧 acceptedCount 与新版事件数量。
- 不上报简历文本、检查报告、JD 或提示词，只记录任务范围、入口和计数。删除旧额度不删除历史统计数据。
