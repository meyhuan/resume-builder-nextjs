# 商店发布准备验证记录

日期：2026-09-09；版本：0.5.1。仅本地准备，没有上传、提交审核或部署。

## 已验证

| 检查 | 结果 |
| --- | --- |
| `pnpm --dir extension run test:release` | 6 项通过：手动身份、商店身份隔离、正式域名、无自建更新 URL、未知渠道拒绝、WXT ZIP 名称与多版本选择。 |
| `pnpm --dir extension run release:chrome` | 通过，生成独立 Chrome 上传 ZIP 与报告。 |
| `pnpm --dir extension run release:edge` | 通过，生成独立 Edge 上传 ZIP 与报告；仍为 Chromium 编译目标。 |
| `pnpm --dir extension run typecheck` | 通过。 |
| `pnpm exec tsc --noEmit --incremental false` | 通过。 |
| `pnpm --dir extension run test` | 最终全量 102 项、16 个测试文件通过，包含新增示例页真实引擎回归。 |
| `pnpm --dir extension exec vitest run lib/review-fixture.test.ts` | 1 项通过：实际通用扫描、映射与填写引擎填入 5 个空控件，已有姓名保留，自我评价无资料留空，重复填写不覆盖；页面没有脚本、form、submit。 |
| `node scripts/test-extension-store.mjs` | 两个包均在全新隔离 Chromium 中启动，首次引导和图标正常，无登录、无全部站点权限。不是商店安装或 Edge 实机测试。 |
| ZIP 内容校验 | 使用 PowerShell 的 System.IO.Compression.ZipFile 逐文件计算 SHA-256，与已校验的编译目录一致；根目录存在 manifest，ZIP 总哈希与报告一致。 |
| `node scripts/capture-extension-store.mjs` | 3 张 1280×800 截图、440×280 宣传图、128×128 图标生成；无真实请求或账号写入。已查看画面，填写结果与权限提示可见；截图是明确标注的合成状态演示。 |
| 手动安装包保护 | `git diff --exit-code` 验证手动 ZIP、固定身份、网站下载元数据均未修改；原 ZIP SHA-256 仍为 `7fb5bfc235693fb7e8612ea6ae9eaa385f4392b2aad654a1658ec633e0f0699e`。 |

## 本轮修正

- 初次构建发现 WXT 对 scoped package 的 ZIP 命名会移除 `/`，改为从输出目录选择当前版本唯一 ZIP，并增加回归测试，不再猜包名。
- 示例页最初把学校和专业放在“个人信息”标题下，实际通用引擎按照个人信息区域保护规则跳过了这两个教育字段。示例页改为中性的“申请资料”标题；没有放宽引擎的防串填限制。真实网站把教育字段混入个人信息区域仍可能跳过，需另做兼容性改进，不能据本示例宣传所有字段都支持。
- 补充隐私文字：统计账号关联、事件时间、业务记录与统计的 URL 区别、断开与服务端删除的区别。

## 尚未完成 / 提交门槛

- 审核人员可独立使用的登录方式（负责人已确认当前没有）。未新增任何鉴权绕过或审核后门。
- 商店实际 ID、服务器白名单、两种浏览器的正式登录回调。
- Edge 实机、商店安装版、生产 API / 数据库 / 统计入库端到端验收。
- 新隐私内容与 `/extension-review.html` 的正式部署；未检查线上新内容。
- 隐私页浏览器视觉回归；本轮只做了类型检查，未声称网站 UI 已验收。
- 发布者确认运营身份、客服邮箱、数据分类勾选、服务器保留期限与删除流程。
- 以上截图可作为展示素材候选，是否符合最终商店展示要求以发布者确认及审核为准。

结论：可创建商店草稿以获取 ID；不能视为已满足正式审核或发布全部条件。
