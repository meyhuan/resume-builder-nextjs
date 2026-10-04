# 移动端编辑体验验收 — 2026-10-04

分支：`codex/mobile-editor-choice-parity`。基于本地 `main`（`62e235f4476b1a57ac06066655681d73875598ab`）；本轮尚未合并 main。

## 完成内容

- 移动端已有的城市、学校、专业、岗位等建议继续共用 PC 数据。新增邮箱后缀建议、工作开始月份入口，修正城市字段读写，使 PC 和移动端都使用 `currentLocation`，兼容旧数据 `location`。
- 月份使用底部滑轮面板，兼容 `YYYY.MM` 和 `YYYY-MM`。关闭不提交，重新打开保留值。工作、实习、教育、项目、校园经历共用日期范围校验；结束月份不能早于开始月份，未来开始日期不能选择“至今”。
- 选择按钮扩大到 44–48px，输入文字为 16px；底部面板增加焦点管理、背景滚动锁定和安全区空间。修复独立 H5 模式的服务端/客户端首屏不一致。
- 手机预览增加预计页数、分页参考线、预计跨页位置定位。新增 PDF 逐页画布预览、翻页、放大与适屏，显示实际页数，预览不消耗导出次数。修改内容或排版后，实际页数失效，重新显示预计页数。
- 单页模式显示调整了哪些参数和中文可读性下限（行高 1.4、字号 12px）。参考线随手机缩放，生成 PDF 时移除手机缩放和辅助线。
- 修正弹窗打开时外层 `aria-hidden` 影响内容测量的问题；内部不参与导出的编辑控件仍从分页测量中排除。

## 检查结果

| 命令 / 检查 | 覆盖 | 结果 |
| --- | --- | --- |
| `corepack pnpm exec vitest run --config scripts/vitest.editor-experience.config.ts` | PC 与移动端编辑、建议、日期、分页、PDF 生命周期、导出辅助元素 | 17 个文件、171 项测试通过 |
| `corepack pnpm exec tsc --noEmit` | TypeScript 全项目检查 | 通过 |
| `corepack pnpm exec eslint <本轮变更的 TypeScript 文件>` | 本轮组件、公共工具及测试 | 通过 |
| `git diff --check` | 补丁空白检查 | 通过 |
| `node scripts/verify-mobile-choice-parity.mjs` | 320×568、375×812、414×896 Chromium 触屏模拟 | 10 个场景通过，无客户端运行异常 |

浏览器场景包括邮箱建议触屏选择、城市触屏滚动、城市/邮箱/工作月份保存字段、月份滑动选择、取消不提交、“至今”、错误日期阻止保存、小屏面板、分页定位、PDF 翻页和放大、单页说明，以及修改排版后页数失效。

长简历样例预计 3 页；实际 PDF 为 3 页，界面读数与 Python `pdfplumber` 独立计数一致。此结果验证该样例；编辑参考线仍是预计位置，PDF 的条目避断行可能造成差异。

## 产物

- [手机效果截图集](../mobile-choice-parity/report.html)
- [10 项浏览器检查明细](../mobile-choice-parity/results.json)
- [实际 PDF](../mobile-choice-parity/mobile-preview.pdf)
- 截图：`mobile-base-375.png`、`mobile-month-375.png`、`mobile-city-scroll.png`、`mobile-work-375.png`、`mobile-month-320.png`、`mobile-pagination-414.png`、`mobile-pdf-first-page.png`、`mobile-pdf-second-page.png`、`mobile-pdf-zoom.png`、`mobile-one-page-settings.png`。

截图和 PDF 为本地生成产物；运行上述浏览器脚本可重新生成。

## 验证边界

- 浏览器使用 Chromium 移动端模拟；iOS/Android 真机软键盘和微信内置浏览器尚未验收。
- 简历、认证、计费 API 使用模拟响应，仅本地 PDF 预览生成使用真实接口；没有向用户账号写入测试简历。
- 未运行生产构建。未修改模板文件，因此本轮未重复模板创建 QA。
- 开发热更新曾导致后台 PDF 浏览器实例引用丢失、临时目录被旧进程占用。清理本轮专用后台进程后，完整浏览器回归通过；本轮没有改动浏览器池实现。

结论：移动端本轮填写、日期和分页体验已实现，自动化检查通过，可继续进行真机验收。
