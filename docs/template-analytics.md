# 模板使用统计（v1）

## 审计结果与改动

- 之前没有模板曝光；PC 编辑器、公开模板库、首页精选、移动首页缺主动选择事件，只有移动预览有 `template_select`。
- PC 有保存成功事件；移动正文保存、预览设置保存未形成相同口径。现在只在正文/设置保存 HTTP 成功后上报，封面刷新不算用户保存。
- PC PDF、PNG 和 H5 有导出成功事件，PC Markdown 和原生小程序 Markdown 补齐。PDF/图片预览生成不算成功导出，原生确认完成才计入。
- 原生小程序匿名标识与 web-view 不同。新增 URL 中的白名单关联字段，原生成功事件沿用 web-view 的匿名关联 ID；不传简历正文、姓名、联系方式。

## 事件与口径

| 事件 | 触发时机 |
| --- | --- |
| `template_impression` | 卡片至少 50% 可见、持续 500ms，页面需前台可见；滚动离开取消计时。同一列表/筛选视图内不重复曝光，重新打开列表或改变筛选视为新曝光。 |
| `template_select` | 用户点击使用或切换模板；编辑器重复点击当前模板不另起链路。首页预览入口表示主动选择预览，并不表示已保存。 |
| `resume_save_success` | PC、移动编辑、移动预览的内容/设置保存请求成功。自动保存保留原有标识，漏斗按链路去重。 |
| `export_success` | PDF/原生导出文件已就绪；PC PNG/Markdown 为下载发起。没有声称文件已在设备落盘。 |

共同属性：`templateSchemaVersion=1`、`templateJourneyId`、`templateActorId`、`templateId`、`selectionMode`、`occurredAt`。有曝光的选择还带 `impressionId`、`listId`、`position`（筛选后从 1 起）、`selectionEntry`、`filter`。保存和导出带 `resumeId`，持久化导出带 `exportId`。

`selectionMode` 分为 `active`（主动选择）、`default`（新建默认进入）、`restored_or_direct`（旧简历恢复或无法确认来源的直达）。不能从模板是 simple 推断默认。浏览器每标签页保存关联上下文，24 小时过期；不强行跨设备归并。

请求完成事件使用开始操作时的上下文快照，避免等待保存或导出时切换模板导致串链。新建 PC 简历将未分配简历 ID 的链路绑定到创建出的 ID。小程序从 H5 到原生导出页透传关联上下文；旧版小程序不回传，因此上线初期会低估完整漏斗。

## 后台

入口 `/admin/analytics` 的「模板使用漏斗」。BFF 类型 `templates`，转发 `GET /analytics/admin/funnel/templates?days=5&platform=all`，沿用管理员鉴权。统计区间为北京时间最近 N×24 小时，最大 90 天，以服务端收件时间筛选；同链路排序优先使用与服务端时间偏差 5 分钟以内的客户端发生时间。

- 曝光：唯一曝光 ID 数；曝光人数按匿名浏览器去重。
- 主动选择：唯一主动选择链路数，包含没收到曝光的快速点击。
- 有曝光的选择：收到前序曝光的主动选择链路数。
- 保存链路：前面已有曝光和主动选择的链路，正文保存成功；重复保存只算一次。
- 成功导出链路：同一匿名关联 ID、模板、链路内，导出简历 ID 与之前保存 ID 相同；重复导出和重试只算一次。
- 曝光选择率：被选择的唯一曝光数 / 唯一曝光数，不混用链路和曝光单位。
- 保存导出率：成功导出链路 / 保存链路；零分母显示空值。
- 默认保存：默认使用链路的保存数，单独展示，不填进主动选择漏斗。

只消费 v1 新事件。缺少前序、前序在区间之外、跨设备、浏览器阻止上报等都不补推；这不是历史数据库快照转化率，也不是财务/导出计费真值。客户端遥测为尽力上报，不具备事务投递保证。存储失败或埋点失败不得阻断产品操作。

## 验证与发布

运行 `pnpm typecheck`；`pnpm exec vitest run --config scripts/vitest.template-taxonomy.config.ts src/lib/templates/template-journey.test.ts src/components/templates/template-impressions.test.tsx src/components/templates/template-browser.test.tsx src/features/edit/draft/draft-store.test.ts`。

Java：`mvnw.cmd -q -Dtest=TemplateFunnelTest test`；小程序：`node --test tests/templateAnalytics.test.cjs`。

无需数据库迁移。发布顺序：Java（接收新事件、提供报表）→ Next.js → 小程序。部署是单独动作；本次代码修改没有发布。上线后用一份测试简历走曝光、主动切换、保存、导出，并核对管理页链路数及关联字段；等待新数据积累后才比较转化。
