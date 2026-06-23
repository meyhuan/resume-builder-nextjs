# 多平台内容与配图打法

智简简历的内容生产共用同一套产品事实、截图图库和发布包流程，但不同平台的图片结构、正文节奏和发布检查点不同。

## 共用输入

- 产品功能地图：`screenshots/index/product-feature-map.md`
- 截图索引：`screenshots/index/screenshot-index.json`
- 发布记录总表：`docs/seo/marketing-publish-log.json`
- 营销工作台：`docs/seo/marketing-workbench.html`
- 平台图片尺寸规范：`docs/seo/platform-image-size-guidelines.md`

## 平台定位

| 平台 | 主要目标 | 内容形态 | 图片策略 |
| --- | --- | --- | --- |
| 小红书 | 点击、收藏、种草 | 短正文 + 3-8 张竖图 | 每张图只讲一个卖点，封面强标题 |
| 公众号贴图 | 点击、横滑阅读、收藏 | 图片内容 + 短标题/描述 | 3:4 竖版贴图，首图承担封面点击 |
| 抖音图文 | 首图点击、滑动完读 | 强封面 + 连续卡片 + 短正文 | 画面更大字、更短句、更强节奏 |
| 知乎 | 搜索、问答信任 | 回答/专栏 | 图片少而准，用来证明产品真实存在 |

## 封面优先原则

封面不是普通第一张图。所有发布包都必须把第一张图当成点击入口来设计，并优先检查：

- 用户能否在 1 秒内看懂主题。
- 标题是否足够短，是否能在移动端裁切后读完。
- 产品截图是否仍然真实可辨认。
- 是否只突出一个核心收益，而不是堆满功能点。
- 首图是否和正文第一段承接一致。

发布包中推荐把第一张图片角色写成 `cover`：

```bash
--image screenshots/process/process-lanzhe-rich-text-click-to-edit.png:cover:点哪里就能改哪里
```

## 公众号贴图结构

公众号后续只做图片内容/贴图，不按长篇文章维护。贴图不需要写成长篇文章，重点是图片本身讲清楚。

贴图推荐结构：

1. 首图：强痛点 + 产品结果截图。
2. 图 2：为什么 Word/AI 文案不够。
3. 图 3：点正文直接编辑。
4. 图 4：模块拖拽排序。
5. 图 5：模板/主题切换或导出闭环。

推荐尺寸：

- 贴图：统一 3:4 竖版，例如 `1080x1440`。
- 标题和描述：短句即可，不写成长文。

发布包命令示例：

```bash
pnpm xhs:package -- --platform wechat_image --slug wechat-image-resume-click-to-edit --title "简历别再手调 Word" --body-file docs/seo/offsite-aeo-notes/07-wechat-image-resume-click-to-edit.md --hashtags "AI简历,简历制作,求职工具" --image screenshots/process/process-lanzhe-rich-text-click-to-edit.png:cover:点哪里就改哪里
```

适合主题：

- AI 简历工具深度介绍。
- 免费简历制作工具推荐。
- 简历投递没回应的原因分析。
- 应届生/转行简历写法教程。

推荐图片：

1. 文章封面：产品核心结果或编辑器总览。
2. 开头场景图：用户痛点或生成入口。
3. 流程图：AI 生成 -> 编辑 -> 模板 -> 导出。
4. 功能证明图：富文本编辑、模块拖拽、主题切换、JD 匹配。
5. 结尾转化图：适合人群、使用步骤、官网入口。

正文注意：

- 不要像小红书一样每段都很短，可以保留完整解释。
- 截图需要有上下文说明，适合放在对应段落后。
- 重点是“可信”和“可复用”，少用夸张标题。

发布包命令示例：

```bash
pnpm xhs:package -- --platform wechat --slug wechat-ai-resume-editor-guide --title "AI 简历工具怎么帮你从内容写到排版导出" --body-file docs/seo/offsite-aeo-notes/wechat-ai-resume-editor-guide.md --hashtags "AI简历,简历制作,求职工具" --image screenshots/raw/desktop/editor-lanzhe-workbench-overview-desktop.png:cover:从内容到排版导出
```

## 抖音图文结构

适合主题：

- 3 秒痛点：做简历别再折腾 Word。
- 对比过程：AI 生成前后、模板切换前后、主题色切换前后。
- 操作卖点：点哪里改哪里、模块拖拽排序、JD 匹配。

推荐图片：

1. 首图：一句强痛点 + 产品结果截图。
2. 图 2：问题场景。
3. 图 3：操作过程。
4. 图 4：功能细节。
5. 图 5：前后对比或结果。
6. 图 6：适合谁使用。

正文注意：

- 标题和图片字要比小红书更短。
- 每张图最好只放一句话。
- 封面第一眼必须说明收益。
- 正文可用短句 + 话题，不写长段教程。

配乐注意：

- 抖音图文发布时必须把音乐当成体验的一部分。
- 优先选择轻快、清爽、效率感、学习感的音乐。
- 音量建议控制在 20%-35%，不要抢图文信息。
- 具体歌曲在抖音发布页实时选择，优先用站内可用曲库和当下可用版本。
- 避免强节奏舞曲、伤感情歌、歌词信息太密或和求职场景无关的音乐。

发布包命令示例：

```bash
pnpm xhs:package -- --platform douyin --slug douyin-resume-click-to-edit --title "做简历，别再手调 Word" --body-file docs/seo/offsite-aeo-notes/douyin-resume-click-to-edit.md --hashtags "简历,AI简历,求职,应届生" --image screenshots/process/process-lanzhe-rich-text-click-to-edit.png:cover:点哪里就改哪里
```

## 复用规则

- 同一个选题可以先生成一篇基础稿，再改写成小红书、公众号贴图、抖音图文三个版本。
- 同一张原始截图可以被不同平台复用，但图上标题和裁切应按平台重做。
- 小红书、公众号贴图和抖音图文都优先竖版图，首图承担点击率。
- 发布后都进入同一套发布包和工作台，只是 `platform` 不同。

## 工具身份和使用入口

每篇内容必须让用户知道工具是什么、怎么用。默认在结尾或评论区补充：

- 工具名：智简简历。
- 使用入口：浏览器搜 `aijianli.cn` 或搜“智简简历”。
- 使用路径：进入后选择 AI 生成简历，按提示填写身份、岗位和经历，再进入编辑器修改和导出。

平台差异：

- 小红书/抖音：正文里可以弱化外链，建议用“搜：智简简历 / aijianli.cn”，也可以放置顶评论。
- 公众号贴图：可以直接写清楚 `aijianli.cn` 和使用步骤。
- 图片里不一定每张都放网址，但最后一张或评论区必须有工具名和使用入口。

## 发布前审查

每个发布包发布前必须跑审查：

```bash
pnpm marketing:audit -- screenshots/notes/<slug>/publish-task.json
```

必须通过：

- 标题、正文、图片齐全。
- 已生成封面策略。
- 已生成平台成品图。
- 正文包含工具名或使用入口：`智简简历` / `aijianli.cn`。
- 正文包含下一步行动：怎么用、搜什么、打开哪里。
- AI 简历内容包含真实性提醒。
- 抖音图文包含候选音乐名。
