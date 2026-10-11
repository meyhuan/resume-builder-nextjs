# 渠道归因统计

推广链接使用标准 UTM 参数，例如：

`https://aijianli.cn/?utm_source=xiaohongshu&utm_medium=organic&utm_campaign=resume-template&utm_content=cover-1`

用户首次进入时，网页会把来源保存到本地归因信息；后续页面访问、登录、创建简历、导出和支付事件都会携带同一份来源信息。新的推广链接再次进入时会更新为最近一次来源。

后端管理接口：

`GET /analytics/admin/channels?days=30&platform=web`

请求需要 `X-Analytics-Admin-Token`（如果服务端未配置该 token 则不需要）。返回结果按 `source + channel` 汇总访问人数、登录人数、创建简历人数、导出人数、付费人数和各环节转化率。没有 UTM 参数的访问会归入 `direct`；带普通外部 `document.referrer` 的访问会归入 `referral`。

弹窗自报来源统计接口：

`GET /analytics/admin/acquisition-sources?days=30&platform=web`

该接口统计弹窗中各选项的回答人数、已选择人数和跳过人数；对于“其他渠道”，还会返回具体来源明细。弹窗只在用户首次进入登录后的应用时出现一次，选择结果会和账号及匿名标识一起记录。

选择“其他渠道”时会先进入补充输入步骤。事件仍使用 `source=other` 归类，并在 `properties.sourceDetail` 保存用户填写的具体来源（例如 `B站`、`微博` 或 `同事分享`），便于后续对长尾渠道做二次分析。当前弹窗版本为 `v5`，PC Web 和微信小程序保持同一套交互和字段。

建议固定使用以下字段：

- `utm_source`：平台，例如 `xiaohongshu`、`douyin`、`zhihu`
- `utm_medium`：流量类型，例如 `organic`、`paid`、`kol`
- `utm_campaign`：活动或主题
- `utm_content`：素材或具体链接位置
- `utm_term`：关键词（如适用）
