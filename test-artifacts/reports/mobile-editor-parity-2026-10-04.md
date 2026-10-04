# 移动端编辑体验验收 — 2026-10-04（分页简化后）

分支：`codex/mobile-editor-choice-parity`。基于本地 `main`（`62e235f4476b1a57ac06066655681d73875598ab`）；本轮尚未合并 main。

## 完成内容

- 移动端已有的城市、学校、专业、岗位等建议继续共用 PC 数据。新增邮箱后缀建议、工作开始月份入口，修正城市字段读写，使 PC 和移动端都使用 `currentLocation`，兼容旧数据 `location`。
- 月份使用底部滑轮面板，兼容 `YYYY.MM` 和 `YYYY-MM`。关闭不提交，重新打开保留值。工作、实习、教育、项目、校园经历共用日期范围校验；结束月份不能早于开始月份，未来开始日期不能选择“至今”。
- 选择按钮扩大到 44–48px，输入文字为 16px；底部面板增加焦点管理、背景滚动锁定和安全区空间。修复独立 H5 模式的服务端/客户端首屏不一致。
- 按用户最新要求，手机分页只保留默认可见的细虚线参考线。无页数、页码标签、开关、跨页定位或 PDF 分页预览入口；参考线随手机缩放，不参与导出。
- 撤回本轮新增的单页参数调整说明和手机 PDF 画布预览实现。原有单页开关、可读性保护和导出功能保留。PC 分页界面保持现有行为。
- 修正弹窗打开时外层 `aria-hidden` 影响内容测量的问题；内部不参与导出的编辑控件仍从分页测量中排除。

## 检查结果

| 命令 / 检查 | 覆盖 | 结果 |
| --- | --- | --- |
| `corepack pnpm exec vitest run --config scripts/vitest.editor-experience.config.ts` | PC 与移动端编辑、建议、日期、分页、PC PDF 页数、导出辅助元素 | 16 个文件、166 项测试通过 |
| `corepack pnpm exec tsc --noEmit` | TypeScript 全项目检查 | 通过 |
| `corepack pnpm exec eslint src/app/m/preview/preview-client.tsx src/app/m/preview/_components/preview-settings-sheet.tsx src/components/editor/resume-page-feedback.tsx src/io/pdf-page-count.ts` | 分页简化的 TypeScript 变更 | 通过 |
| `git diff --check` | 补丁空白检查 | 通过 |
| `node scripts/verify-mobile-choice-parity.mjs` | 320×568、375×812、414×896 Chromium 触屏模拟 | 10 个场景通过，无客户端运行异常 |

浏览器场景包括邮箱建议触屏选择、城市触屏滚动、城市/邮箱/工作月份保存字段、月份滑动选择、取消不提交、“至今”、错误日期阻止保存、小屏面板、320px/414px 默认参考线位置与缩放、无页数及新增操作入口、无 PDF.js 加载、原有单页开关，以及运行异常检查。

参考线是估算位置，PDF 条目避断行可能造成差异。本轮按用户要求不展示预计页数，不生成 PDF 预览。

## 产物

- [手机效果截图集](../mobile-choice-parity/report.html)
- [10 项浏览器检查明细](../mobile-choice-parity/results.json)
- 截图：`mobile-base-375.png`、`mobile-month-375.png`、`mobile-city-scroll.png`、`mobile-work-375.png`、`mobile-month-320.png`、`mobile-pagination-414.png`、`mobile-pagination-320.png`、`mobile-one-page-settings.png`。

截图为本地生成产物；运行上述浏览器脚本可重新生成。

## 验证边界

- 浏览器使用 Chromium 移动端模拟；iOS/Android 真机软键盘和微信内置浏览器尚未验收。
- 简历、认证、计费 API 使用模拟响应；没有向用户账号写入测试简历，也没有生成 PDF。浏览器回归记录的 PDF 预览请求为 0。
- 未运行生产构建。未修改模板文件，因此本轮未重复模板创建 QA。

结论：移动端本轮填写和日期优化保留；分页已简化为参考线，自动化检查通过。
