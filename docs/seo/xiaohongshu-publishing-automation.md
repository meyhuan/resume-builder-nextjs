# 小红书笔记发布自动化方案

本方案把发布拆成两层：内容生产自动化和创作后台半自动填充。默认不做无人值守发布，最后的发布/定时发布按钮由人工确认。

当前发布包脚本也支持微信公众号和抖音图文，详见：`docs/seo/multi-platform-content-playbook.md`。

## 目标

- 每篇小红书笔记生成一个标准发布包。
- 发布包包含标题、正文、话题、图片顺序、来源截图和审核状态。
- 发布前可以自动校验字段和图片是否齐全。
- 打开本地发布清单和小红书创作页，减少复制粘贴成本。
- 发布后记录链接、时间和复查状态。

## 为什么先做半自动

小红书开放平台能力和应用权限受类目限制，不应默认假设普通内容账号可直接调用官方发笔记 API。半自动流程保留人工审核和最终点击动作，更适合早期内容矩阵验证，也能降低账号误发和风控风险。

## 推荐流程

```text
选题/卖点
  -> 生成小红书笔记
  -> 从截图索引选图
  -> 生成或复制配图
  -> 生成发布包
  -> 自动校验
  -> 打开小红书创作页和本地清单
  -> 人工检查并发布
  -> 回填发布链接
```

## 发布包目录

```text
screenshots/notes/<note-slug>/
  note.md
  publish-task.json
  publish-checklist.html
  images/
    01-cover.png
    02-feature.png
    03-detail.png
```

## publish-task.json 字段

```json
{
  "platform": "xiaohongshu",
  "slug": "ai-resume-editor-click-to-edit",
  "status": "ready_for_review",
  "title": "做简历别再折腾 Word 了，点哪里就能改",
  "body": "正文内容",
  "hashtags": ["简历", "AI简历", "应届生简历"],
  "images": [
    {
      "order": 1,
      "file": "images/01-cover.png",
      "role": "cover",
      "source": "screenshots/process/process-lanzhe-rich-text-click-to-edit.png",
      "overlay_title": "简历点哪里，就能改哪里"
    }
  ],
  "publish": {
    "mode": "manual_confirm",
    "creator_url": "https://creator.xiaohongshu.com/publish/publish",
    "published_url": "",
    "published_at": ""
  }
}
```

## 命令

生成发布包：

```bash
pnpm xhs:package -- --slug ai-resume-editor-click-to-edit --title "做简历别再折腾 Word 了，点哪里就能改" --body-file docs/seo/offsite-aeo-notes/example.md --hashtags "简历,AI简历,应届生简历" --image screenshots/process/process-lanzhe-rich-text-click-to-edit.png:cover:简历点哪里，就能改哪里
```

校验并打开发布助手：

```bash
pnpm xhs:publish-assist -- screenshots/notes/ai-resume-editor-click-to-edit/publish-task.json --open
```

发布后回填链接，并自动同步发布记录总表：

```bash
pnpm xhs:mark-published -- screenshots/notes/ai-resume-editor-click-to-edit/publish-task.json --url "https://www.xiaohongshu.com/..."
```

单独同步某篇笔记到发布记录总表：

```bash
pnpm xhs:sync-log -- screenshots/notes/ai-resume-editor-click-to-edit/publish-task.json
```

回填发布后数据：

```bash
pnpm marketing:update-metrics -- --slug douyin-resume-click-to-edit --views 1200 --likes 18 --collects 9 --comments 2 --shares 1 --notes "24h"
```

常用字段：

- `--views`：浏览、播放、曝光可统一先记这里。
- `--reads`：公众号阅读数可记这里。
- `--likes`：点赞。
- `--collects`：收藏。
- `--comments`：评论。
- `--shares`：分享/转发。
- `--notes`：复查备注。

默认总表位置：

```text
docs/seo/marketing-publish-log.json
```

刷新营销工作台：

```bash
pnpm marketing:workbench -- --open
```

工作台默认输出：

```text
docs/seo/marketing-workbench.html
```

## 状态约定

- `draft`：内容还在生成。
- `ready_for_review`：图片和文案齐全，等待人工检查。
- `scheduled`：已经在小红书后台设置定时。
- `published`：已发布，并回填链接。
- `needs_fix`：字段、图片或内容需要修正。

## 边界

- 不自动绕过登录、验证码、风控或平台审核。
- 不批量高频无人值守发布。
- 不自动发布未经人工确认的内容。
- 不使用非官方接口伪造发布请求。
