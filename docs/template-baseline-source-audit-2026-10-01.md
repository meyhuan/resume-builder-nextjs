# 26 款存量公开模板来源审计

本记录核对实际仓库历史与现存原稿，不把历史“原创”标签、Git 提交标题或用户提供文件自动当作外部权属结论。24 款本轮 Canva 参考改编另见 [批次来源清单](template-canva-batch-2026-09-28.md)。当前共 50 个公开 ID；隐藏商蓝不重复计数。

核验工作区：`codex/template-taxonomy`，基线 HEAD `f09353e`。使用 `git log --diff-filter=A -- src/templates/<id>/index.tsx`，没有用 `--follow` 的相似文件推测冒充真实来源。

## 实现历史：22 款

每款入口均为 `src/templates/<id>/index.tsx`。以下是入口首次引入记录；部分共享实现此后多次修改。提交历史可以证明项目实现可追溯，不能证明未知外部原稿、作者或 Canva ID。

| ID | 引入日期 | 提交 | 核验类型与待补项 |
| --- | --- | --- | --- |
| simple | 2025-10-03 | ce14a6ba69bdd211144278474bcc38ab299fbb15 | 项目内置历史实现；无可核验外部 Canva ID |
| elegant | 2026-02-17 | 936c011f5c0812ce6862cca686d7cc8a41fff906 | 项目内置历史实现；深色页头/金色强调的引入记录 |
| warm | 2026-02-18 | 51e396bee06fc9325bd4742d78e2b69278119e27 | 项目内置历史实现；双栏布局引入记录 |
| timeline | 2026-02-24 | 562d6dc85551cca26683fef7792760cf58a15698 | 项目内置历史实现；时间轴/页签引入记录 |
| tablegrid | 2026-05-30 | 2ebe7352751c2e3d9abd0a21fdd5a9e367ee5013 | 项目内置历史实现；另有 `docs/biaoge-template-preview.html`，不称为 Canva 原稿 |
| xinghe | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 项目设计批次实现；概念文档并非外部来源证明 |
| lifeng | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 同上 |
| qingsui | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 同上 |
| yuanshan | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 同上；本轮章节索引分轨为项目独立绘制，最新成品运行/PDF 复测通过 |
| hengjian | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 同上 |
| yiyetong | 2026-06-03 | f294c08a3d1c7ebbf4a03a6ebeea5dacc5aece45 | 同上 |
| lanzhe | 2026-06-04 | 534d2b6222d85b8a39feec31d96d536e40c9aceb | 历史参考实现；没有确认外部原稿/模板 ID |
| dense | 2026-06-19 | e7399d2d76990c312213c91cd1f7d264cc4f46aa | 历史参考实现；没有确认外部原稿/模板 ID |
| ziji | 2026-06-19 | e7399d2d76990c312213c91cd1f7d264cc4f46aa | 同上 |
| lanjiao | 2026-07-06 | bf6b09efc629ccb9bd79ebcbce535db98f0ba9dc | 历史参考实现；没有确认外部原稿/模板 ID |
| lanmu | 2026-07-06 | bf6b09efc629ccb9bd79ebcbce535db98f0ba9dc | 同上 |
| lanfa | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | HTML 批次适配；提交未归档外部 HTML 原稿，来源待补核 |
| lanying | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | 同上 |
| qiance | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | 同上 |
| heijiao | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | 同上 |
| jinhang | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | 同上 |
| jijian | 2026-06-29 | d0f5e2b1064c0e90b0522df26d50ebc7427d5f1e | 同上 |

`d0f5e2b...` 的真实标题为 `feat: add html batch resume templates`，不是 6 月 3 日的原创设计批次。不可把这六款与 `f294c08...` 混为同一种来源。

## 已归档视觉原稿：4 款

每个目录均包含未改动的 `reference.svg`、794×1123 的 `reference.png` 和 `source.json`。归档位置是 `docs/template-references/legacy-2026-10-01/<id>/`，仅供来源测量与 QA，不放入产品公开图片目录或充当整页背景。

| ID | 实际来源 | ID 状态 | SHA-256 |
| --- | --- | --- | --- |
| qingning | 用户提供的《黄绿色几何风市场营销求职简历.svg》 | DAHVjpxMGM0 是设计 ID，公开模板 ID 未确认 | 39413ac53b2892b1032acdcd52b5412cf578df9f91c050fb6053735bdc6f2456 |
| jingrui | 用户提供的《蓝色商务风应届生求职简历模板.svg》 | 未确认公开模板 ID；当前 worktree 为未提交实现 | 4abd8bcc1758282edfb3bf6410e40e5b3ba9f4b60d58098f7f0b6dfceacf515c |
| lanzix | 用户提供的《蓝紫色极简风应届生求职简历.svg》 | 未确认公开模板 ID；入口引入于 d0f5e2b... | 308bbd7439b7422c213af07bbfadbc90410b4478cbf2429f8106a8737a2b1eb6 |
| moxu | 主工作区 `outputs/canva-resume-DAHVmV6BaSE/reference.svg` | 公开模板 EAGGgJLDRO8，设计 DAHVmV6BaSE | a4e3dfff3175244194bf202dfd2e72b9eb6f23291a5395a4b84e455ee83efcfb |

青柠、墨序的入口提交为 `442a6a03b9163c9bf97c3298f9fed9e57798d2f0`（2026-09-23）。原稿 SVG 为轮廓文字：四份均无 `<text>` 节点，包含 601–2242 个路径、1–2 个嵌入图片，无外链图片。原稿照片与文字不进入可编辑模板。主代理已查看四份渲染图。

蓝序与商蓝同构，现保留蓝序公开、商蓝隐藏以兼容旧数据，只算一个有效名额。蓝序在无头像场景中被发现“白字落到灰底”问题，本轮已改为独立头像面板与动态主题信息面板；最新 build 已重新导出并通过稀疏/长内容、主题和 PDF 复测，见最终发布修订报告。蓝紫元数据已取消“原创”标签，改为“参考改编”。

## 结果边界

- 当前公开集合中，本轮 23 款 JPG + 本记录 4 款 SVG + 章序高清 PNG = 28 款有同仓视觉原稿；另 22 款的实现历史可追溯。第 24 款批次 JPG 属于同构后隐藏的简擎，不再计入公开集合。
- 28 款不等于 28 个已确认公开 Canva 模板 ID；用户提供 SVG 是真实参考文件，但不补造未知链接。
- 22 款不能凭 Git 提交或 `_originals` 目录名自动通过外部来源验收。需要原作者/既有项目来源记录补核的项如上。
- 原稿归档、哈希通过和结构签名均不替代最新运行时、逐页 PDF、交互和差异性签收。
- 来源审计与用户账户、导出服务、AI 额度验收是不同维度。本记录不宣称任何未执行的项目已通过。
