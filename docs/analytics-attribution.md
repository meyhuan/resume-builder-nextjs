# 渠道归因统计

推广链接使用标准 UTM 参数，例如：

`https://aijianli.cn/?utm_source=xiaohongshu&utm_medium=organic&utm_campaign=resume-template&utm_content=cover-1`

用户首次进入时，网页会把来源保存到本地归因信息，部分后续客户端事件会携带这份信息。新的推广链接再次进入时会更新来源；服务端支付事件不一定携带客户端来源。

后端管理接口：

`GET /analytics/admin/channels?days=30&platform=web`

请求需要 `X-Analytics-Admin-Token`（如果服务端未配置该 token 则不需要）。按 `source + channel` 独立统计各客户端事件的身份数；这些数不是同一批人，不能相除得到漏斗转化率。付费来自当前状态为已支付的订单：以付款时间向前 30 天，查找同账号、同订单端最近的一条带来源的客户端行为，无法匹配时归入 `unattributed / unknown`。这是基于已观察行为的估算，不代表完整触点或真实因果关系。没有 UTM 参数的客户端访问通常归入 `direct`；带普通外部 `document.referrer` 的访问通常归入 `referral`。

现有小程序客户端固定把普通行为的来源写为 `wechat`，这只标识小程序运行环境，不证明来自微信推广。统计将其显示为“小程序（来源未细分）”，订单不能仅凭该值归因。

弹窗自报来源统计接口：

`GET /analytics/admin/acquisition-sources?days=30&platform=web`

该接口统计各选项的回答事件次数、不同身份数、主动选择事件次数和跳过事件次数；对于“其他渠道”，还会返回具体来源明细。弹窗只在用户首次进入登录后的应用时出现一次，选择结果会和账号及匿名标识一起记录。自报来源与订单估算归因是两套数据，不能直接互相替代。

选择“其他渠道”时会先进入补充输入步骤。事件仍使用 `source=other` 归类，并在 `properties.sourceDetail` 保存用户填写的具体来源（例如 `B站`、`微博` 或 `同事分享`），便于后续对长尾渠道做二次分析。当前弹窗版本为 `v5`，PC Web 和微信小程序保持同一套交互和字段。

建议固定使用以下字段：

- `utm_source`：平台，例如 `xiaohongshu`、`douyin`、`zhihu`
- `utm_medium`：流量类型，例如 `organic`、`paid`、`kol`
- `utm_campaign`：活动或主题
- `utm_content`：素材或具体链接位置
- `utm_term`：关键词（如适用）
