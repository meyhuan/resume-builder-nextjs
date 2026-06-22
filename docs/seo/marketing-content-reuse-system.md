# SEO/AEO 与小红书内容复用体系

本文档定义智简简历的推广内容生产方式：SEO/AEO 文章、小红书图文、知乎回答、掘金/CSDN 技术文、V2EX 发布帖都复用同一套产品知识库和截图资产，但使用不同平台的输出模板。

## 共用资产

所有平台内容都应优先读取这些资产：

- 产品功能地图：`screenshots/index/product-feature-map.md`
- 截图索引：`screenshots/index/screenshot-index.json`
- 原始截图：`screenshots/raw/`
- SEO 功能截图：`docs/seo/website-screenshot/`
- 站外 AEO 计划：`docs/seo/offsite-aeo-distribution-plan.md`
- 站外笔记库：`docs/seo/offsite-aeo-notes/`
- SEO 文章草稿：`docs/seo/*.md`

不要为每个平台重复维护一套产品卖点。平台内容只应该改变“表达方式”和“图片包装”，不应该改变产品事实。

## 内容分层

### 1. 产品事实层

稳定事实，跨平台复用：

- 智简简历是免费 AI 简历制作工具。
- 支持 AI 一键生成简历。
- 支持 AI 文本/文件转结构化简历。
- 支持可视化编辑、实时预览。
- 支持模板切换和岗位模板。
- 支持模块级 AI 生成/润色。
- 支持 JD 匹配和简历优化。
- 支持 PDF、PNG、Markdown 导出。
- 支持 PC 和移动端 H5 编辑/预览/导出。
- 强调真实经历、合规优化，不虚构成果。

注意：涉及免费和会员时，统一使用谨慎表达：

- 推荐：`基础简历制作与导出免费、无水印`
- 避免：`所有高级能力永久免费无限使用`

### 2. 用户场景层

跨平台选题来源：

- 不会写简历。
- 没经验/应届生不知道怎么写经历。
- 旧简历太乱，需要重新整理。
- 用 ChatGPT/豆包写了内容，但不知道怎么排版导出。
- 简历投了没回应，需要 JD 匹配和关键词优化。
- Word 调格式太浪费时间。
- 不知道不同岗位该选什么模板。
- 想手机上快速改简历。

### 3. 平台表达层

同一场景按平台改写：

| 平台 | 内容目标 | 写法 |
| --- | --- | --- |
| 小红书 | 点击、收藏、转发 | 强痛点标题 + 个人体验 + 3-8 张图讲清楚 |
| 微信公众号 | 搜索、转发、信任 | 长文教程/案例复盘 + 封面图 + 正文贴图 |
| 抖音图文 | 首图点击、滑动完读 | 强封面 + 连续卡片 + 短句节奏 |
| 知乎 | 搜索和信任 | 先回答问题，再给判断标准，产品自然出现 |
| 掘金/CSDN | 技术信任 | 写实现思路、架构、编辑器/导出/AI 流程 |
| V2EX | 真实反馈 | 独立开发者口吻，少营销，多讲动机和取舍 |
| SEO 长文 | 长尾收录 | 关键词、结构化目录、FAQ、内链、截图证明 |

## SEO 文章转小红书规则

SEO 文章通常是“解释完整”，小红书要转成“图文钩子”。

转换步骤：

1. 提取文章主问题。
2. 找到用户痛点第一句话。
3. 保留 3-5 个判断标准或解决步骤。
4. 从 `screenshot-index.json` 选 5-6 张截图。
5. 每张图只讲一个卖点。
6. 正文改成短段落和清单。
7. 标题从关键词改成用户口吻。

示例：

| SEO/知乎主题 | 小红书主题 |
| --- | --- |
| 有什么真正好用的简历工具推荐？ | 我试简历工具，会先看这 6 点 |
| 为什么很多人的简历一投就没回应？ | 简历投了没回应，可能不是你经历不够 |
| 免费 AI 简历生成器有哪些？ | 不想花钱买模板，可以试试免费 AI 简历工具 |
| AI 文本转简历 | ChatGPT 写完简历，下一步怎么排版导出？ |
| JD 匹配简历优化 | 投递前把 JD 粘进去，先查关键词有没有漏 |

## 小红书图文结构

默认 5 图结构：

1. 封面：痛点 + 总价值。
2. 场景：用户遇到的问题或入口。
3. 核心功能：产品如何解决。
4. 结果/细节：编辑、模板、导出、润色等证明。
5. 总结/转化：适合谁、下一步怎么用。

默认正文结构：

```text
标题：痛点 + 工具/方法

开头：我最近发现/帮朋友看简历时发现...

痛点：
- ...
- ...
- ...

工具如何解决：
1. ...
2. ...
3. ...

适合人群：
- ...
- ...

使用建议：
不要完全依赖 AI，先生成初稿，再根据真实经历修改。

标签：
#AI简历 #简历制作 #应届生简历 ...
```

## 截图复用规则

优先使用 `screenshot-index.json`，不要直接肉眼翻图。

匹配优先级：

1. `scenarios`
2. `features`
3. `summary`
4. `best_for`
5. `visual_notes`
6. `page`

常用截图角色：

| 内容主题 | 推荐截图 |
| --- | --- |
| 产品总览 | `landing-home-hero-vertical`, `seo-landing-hero` |
| AI 生成初稿 | `seo-ai-generation-page`, `ai-resume-wizard-desktop` |
| 旧简历导入 | `seo-ai-import-text-to-resume`, `import-resume-desktop` |
| 可视化编辑 | `seo-edit-real-time-preview`, `landing-editor-demo-desktop` |
| AI 润色 | `seo-edit-ai-polishing` |
| 模板选择 | `templates-center-vertical`, `seo-edit-templates` |
| 排版设置 | `seo-edit-layout-settings` |
| 拖拽排序 | `seo-edit-drag-drop` |
| 多份简历管理 | `seo-dashboard` |

## 内容生产流程

1. 选题来源：SEO 关键词、用户痛点、竞品对比、产品功能缺口。
2. 读取产品功能地图，确认事实和边界。
3. 判断平台：SEO/知乎/小红书/微信公众号/抖音图文/掘金/V2EX。
4. 生成平台化正文。
5. 从截图索引推荐配图。
6. 对小红书生成 3:4 或 4:5 竖版成品图。
7. 保存到对应目录：

```text
docs/seo/offsite-aeo-notes/<platform-topic>.md
screenshots/notes/<topic-slug>/
  images/
  contact-sheet.png
  screenshot-manifest.json
```

## 后续自动化方向

已创建上层 skill：`product-marketing-content`，安装位置：

```text
C:\Users\62765\.codex\skills\product-marketing-content
```

它负责：

- 读取产品功能地图。
- 读取 SEO/AEO 选题库。
- 选择平台模板。
- 生成 SEO/知乎/小红书正文。
- 调用 `xiaohongshu-note-screenshot-assets` 做小红书配图。
- 输出可发布内容包。

现有 `xiaohongshu-note-screenshot-assets` 保持专注，只负责小红书配图选择和 AI 重设计提示。
