# 100 款公开模板推进记录

## 当前基线

- 注册模板：114 款（`src/lib/templates/template-metadata.ts`）
- 当前公开模板：100 款（本批合格候选已切换到公开目录）
- 本分支新增候选：50 款，其中 45 款为本轮批量实现；50 款均已通过当前发布回归并切换为 `editor: true / catalog: true`
- 公开目录目标已达到 100 款；另外 13 款保留为 `editor` 备用，`lanxin` 仍按历史兼容策略保持非编辑器注册

## 已完成的实现与自动化验收

| ID | 名称 | Canva 来源 | 结构 | QA |
| --- | --- | --- | --- | --- |
| 5 款上一批 | `lanhe`、`lanjing`、`mujian`、`qianbiao`、`huabu` | 来源记录已存档 | 各自独立的页眉、栏位、密度和章节装饰 | 缩略图、控件回归、分类回归通过；仍待来源截图人工对照后公开 |
| 45 款本轮 | 见 `src/lib/templates/template-metadata.ts` | 来源记录见 `docs/template-references/canva-100/` | 共享编辑原语 + 独立布局/标题/配色配方 | 45/45 通过 24 组间距与 6 组单页（PC/移动/打印）控件回归；缩略图已按最终实现重生成 |

自动化收尾结果：`tsc --noEmit`、目标文件 ESLint、生产构建、全量模板静态验证（114 款）、模板分类 Vitest（63 tests）、公开目录测试、移动端筛选回归、页眉间距专项、通用间距专项和 100 款逐模板控件回归均通过。报告见 `test-artifacts/reports/template-qa-all-2026-10-11-083835.md`；运行时控件覆盖见 `test-artifacts/template-controls/2026-10-11T00-38-44-783Z/results.json`。

## 发布策略

本批 50 款在自动化验收通过后切换为 `catalog: true`，公开目录达到 100 款；另外 13 款保留为 `editor: true / catalog: false` 备用，`lanxin` 保持历史的非编辑器状态，后续不合格项可独立撤回而不影响目录主集合。

## 未覆盖的上线前人工项

真实账号保存/重开、真实移动端表单、真实导出服务、AI 权限与额度、线上字体和第三方 ATS 检查仍需在发布前单独验收。
