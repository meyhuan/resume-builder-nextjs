# H5 真实体验分享：功能核对与配图边界

核对日期：2026-10-18。核对对象为当前本地源码中的可达入口与实现，并不代表线上已部署相同版本，也不等于逐项完成真实 AI 调用测试。

## 功能支持

| 能力 | 小程序当前链路 | PC Web 当前链路 | 关键实现证据 |
| --- | --- | --- | --- |
| AI 生成（按身份、岗位、经历等选择和补充） | 支持，原生壳进入 H5 向导 | 支持，共用向导 | mini-aijianli/miniprogram/pages/aiWizardShell/aiWizardShell.js；src/app/m/edit/ai-generate/page.tsx；src/components/ai/resume-wizard.tsx |
| AI 润色 / 分段辅助写作 | 支持，经历、技能、自我评价等表单 | 支持，分段工具及编辑器 AI 面板 | src/features/edit/form-fields/rich-ai-textarea.tsx；src/app/m/edit/_components/experience-detail-client.tsx；src/components/ai-section/ai-polish-sheet.tsx |
| 简历导入 | 支持，微信文件、相册，以及 H5 编辑页的导入入口 | 支持，粘贴文本和文件上传 | mini-aijianli/miniprogram/pages/home/home.js 的 _importFileFromNextJs；src/app/m/edit/import；src/app/import |
| 模板选择与自动排版 | 支持，填内容后预览真实模板 | 支持，编辑器渲染真实模板 | src/app/m/preview/preview-client.tsx；src/components/ResumeEditor.tsx |
| 主题色、样式、字号、行距 | 支持，预览设置；部分模板固定颜色 | 支持，主题与排版设置；能力随模板变化 | src/app/m/preview/_components/preview-settings-sheet.tsx；src/ui/theme-panel.tsx |
| 一页模式 | 支持，有溢出检测；不是任意内容都能放下 | 支持，有溢出检测 | 两端引用 src/hooks/use-one-page-mode.ts；移动端溢出时阻止一页导出 |
| 模块顺序 | 支持，编辑页与模块管理中拖动排序 | 支持，拖拽与模块管理 | src/app/m/edit/_components/sections-list.tsx、module-manage-sheet.tsx；src/dnd/drag-drop-provider.tsx；src/ui/section-manager.tsx |
| 简历翻译 | 当前源码已支持，H5 编辑首页有独立入口 | 支持，编辑器顶栏入口 | src/app/m/edit/edit-home-client.tsx 引入 AiToolsEntry；src/app/m/edit/_components/ai-tools-entry.tsx；src/app/m/edit/tools/tools-client.tsx 复用 TranslateDialog；src/ui/editor-header.tsx |
| 所见即所得编辑 | 主流程为分模块填写＋成品预览，分享时不用 PC 编辑体验替代 | 支持，直接编辑简历画面并拖拽模块 | src/app/m/edit/edit-home-client.tsx；src/components/ResumeEditor.tsx；src/dnd/drag-drop-provider.tsx |
| 岗位匹配（独立工作流） | 未发现与 PC 顶栏同等的独立入口，暂不在手机分享中展示 | 支持，JD 对照分析与修改入口 | src/ui/editor-header.tsx；src/components/editor/jd-analysis-dialog.tsx；src/app/next-api/ai/jd-analysis/route.ts |
| 面试准备（独立工作流） | 未发现对应独立入口，暂不在手机分享中展示 | 支持，编辑器、仪表盘、独立页面；记录在当前浏览器 | src/components/interview-prep/interview-prep-dialog.tsx；src/app/interview-prep；src/lib/ai/interview-prep-history.ts |
| 简洁 UI | 两端可分享，是否顺手由用户主动选感受，不当成客观效果保证 | 同左 | 两端实际编辑入口 |

小程序当前编辑主链路通过 pages/editShell/editShell.js 与 SSO 进入 /m/*，不能仅以旧原生 preview_1 的能力判断。手机端已有翻译入口，所以本次将翻译列入共同能力。岗位匹配与面试准备的限定指独立完整入口，不代表通用 AI 对话不能谈及相关问题。

## 分享交互

- 当前端特色与共同能力分组，主动选择 1 个主要体验；可再选最多 2 个本次确实用过的功能。
- 每项提供两种具体感受以及“还在试，暂时没有明显感受”，不预选正面评价。
- 功能变化会清空旧感受与确认；切端会清空功能选择并移除公共示例。保留用户上传内容，但需要重新检查关联。
- 未实际使用的用户只能先去体验，不生成第一人称使用心得。
- 文案固定组合，不调用 AI；用户选填原话原样加入，发布前可编辑。
- 旧版本一页模式草稿使用不同的本地存储键，不自动迁入新体验。

## 截图实现与限制

- 本人简历成品复用现有 /print/[id] 与真实模板渲染器，只读，不修改原简历；仍需本人登录及所有权校验。
- 成品是通用结果图，不能伪装为润色前后、翻译过程或岗位匹配记录。
- 每项显示对应的拍图建议；上传时关联所选功能，隐私检查时可改为本人成品或某个已选体验。
- 公共图库按“端＋所选功能”精确筛选，不默认加入，也不能单独生成心得。导出的公共图片有“示例人物与数据”水印。
- 扩充的向导、导入、编辑首页、模块管理图片来自既有截图索引。原始截图不改动。导入图片为历史界面，额度等提示以当前产品为准。
- 手机端主题色、一页模式、AI 润色、生成向导、翻译等缺少已核实的对应图库截图时，直接提示上传个人操作图，不使用 PC 图替代。PC 岗位匹配、面试准备、翻译缺少对应图库图时同样处理。
- 尚未自动记录每个用户过去的功能使用过程，也不凭空重造这些过程画面。自动截图支持当前保存的简历成品，以及 PC 所见即所得编辑器的当前界面；其他个人功能过程截图通过上传接入。

### 所见即所得编辑截图

选择 PC 的“所见即所得编辑”后，选图页增加对应截图按钮，与成品图入口分别展示。服务端核验本人简历所有权后，在隔离浏览器会话中打开真实 `/editor/[id]`，复用完整生产编辑器与当前保存的简历，不另写展示模板。拦截所有非 GET 请求与外站请求，避免自动保存、AI 调用和外站统计；截图完成后关闭整个隔离会话。返回图片自动关联“所见即所得编辑”，进入个人信息检查，不冒充历史操作记录。手机端请求该截图会被拒绝。

该主要体验至少需要一张本人编辑器截图，不能只用简历成品图生成或导出。已在独立预览中使用“林知夏（虚构示例）”核验真实截图、功能关联、隐私确认与对应正文生成；原有用户草稿未改写。相关 Vitest 9 个文件、44 项通过，类型检查通过。

## 本地验证（2026-10-18）

- TypeScript 类型检查通过；小红书相关 Vitest 共 7 个文件、39 项测试通过。
- PC H5：验证功能分组、主要体验与最多 2 项补充、对应图库、上传与隐私检查、正文生成；更换体验后旧稿被拦截。
- 小程序来源 H5：使用端锁定手机端，不出现 PC 独立岗位匹配；未使用状态不能生成心得；翻译没有对应图库时不回退到 PC 图片。
- 选取已保存的“林知夏（虚构示例）”完成真实模板成品截图、隐私确认、中性感受正文生成及进入保存发布页。未向小红书发布。
- 本轮验证的是本地源码与 H5 分享链路，没有逐项调用所有 AI 功能，也未核验线上发布时间与小程序审核状态。

### 截图失败修复

本地热更新重新执行模块后，原先模块内保存的 Puppeteer 连接丢失，而旧 Chrome 仍占用按 PID 命名的 profile，导致后续请求返回 502。连接、页面计数和空闲计时器改为保存在进程全局状态中，并为每次浏览器启动分配独立 profile，避免与旧版本遗留进程冲突。接口增加脱敏的服务端错误日志。

已用原失败简历重试，成功进入图片隐私检查页；新增模块重载复用和启动失败后重试测试。相关测试现为 8 个文件、41 项全部通过，类型检查通过。
