# 城市、学校和专业输入联想验收

日期：2026-10-03。分支：`codex/editor-choice-pagination`。
环境：Windows、本地 Next.js 开发服务、Chrome headless、`http://127.0.0.1:3011`。

## 完成内容

- 意向城市、现所在地、户籍改为在原输入框直接输入和联想；常用城市支持中文、拼音及首字母，保留原有自定义和多城市文本。
- 学校和专业在简历字段内联编辑时显示建议；学校支持名称片段、常用简称和所在地搜索，候选显示所在地。选择学校不修改专业、学历或个人城市。
- 学校数据来自教育部 2026 年普通高校名单，覆盖 2952 所；专业为经 2026 年本科专业目录核对的 67 个常见专业。来源见 `src/data/dictionaries/education-sources.md`。
- 未找到建议仍能直接保存。只有主动点击候选或使用方向键后按 Enter 才替换输入；普通 Enter/Tab 不自动选择。取消不写入未保存的表单草稿。
- 输入期间候选面板不切换上下方向；列表支持滚轮、触摸和键盘滚动；选择后保留输入焦点；第一次 Esc 收起建议，第二次取消字段编辑或关闭表单。
- IME 组合输入期间隐藏候选并阻止回车向父级编辑器传播。字段失焦保存选中的完整值，不保存搜索简称。
- 候选数量限制为 80 条，避免学校全集同时生成大量 DOM；继续输入可缩小范围。

## 命令与结果

| 命令 | 覆盖 | 结果 |
| --- | --- | --- |
| `corepack pnpm exec tsc --noEmit --incremental false` | 全项目类型检查 | PASS |
| `corepack pnpm exec eslint` + 本次修改的 TS/TSX 文件 | 组件、字段集成、字典、测试 | PASS |
| `corepack pnpm exec vitest run --config scripts/vitest.editor-experience.config.ts` | 输入联想、IME、学校完整值提交、状态/薪资、hover、分页、导出 | 85/85 PASS |
| `node scripts/verify-editor-autocomplete.mjs http://127.0.0.1:3011` | 直接输入、拼音/首字母、歧义简称、选择后焦点和保存、自由输入、Esc、滚轮、1024/1400 PC、导出清洁 | 11/11 PASS |
| `node scripts/verify-editor-choice-scroll.mjs http://127.0.0.1:3011` | 城市/户籍/行业滚轮、边界、触摸、Esc；320/375/414/768/1400 宽度 | 14/14 PASS |
| `node scripts/verify-editor-choice-placement.mjs http://127.0.0.1:3011` | 输入框和方向稳定、窄屏、低视口、视口缩小、邮箱候选方向 | 18/18 PASS |
| `node scripts/verify-editor-choices-pagination.mjs http://127.0.0.1:3011` | 城市/行业/状态/薪资保存、取消、响应式表单、页数、跨页定位、一页模式、中文保护、导出 | 18/18 PASS |
| `node scripts/verify-editor-click-interactions.mjs http://127.0.0.1:3011` | 正文光标、格式栏、切换字段、键盘编辑、当前条目操作 | 10/10 PASS |
| `node scripts/verify-editor-email.mjs http://127.0.0.1:3011` | 邮箱后缀、鼠标/键盘、保存、取消、滚轮、窄屏和到岗时间对齐 | 11/11 PASS |
| `node scripts/verify-template.mjs qingning --local --base-url http://127.0.0.1:3011 --scenario-loader-url 'http://127.0.0.1:3011/dev/scenario-loader?tpl=qingning' --report` | 青柠模板 PC/mobile 渲染、主题、hover、编辑、头像入口、稀疏/长/富文本数据和 PDF | 41/41 PASS |
| `git diff --check` | 空白和补丁完整性 | PASS |

浏览器用例合计 82 项，另有 85 项单元用例和 41 项模板 QA。

## 产物与视觉检查

- `test-artifacts/editor-autocomplete/results.json`：输入联想浏览器结果。
- `test-artifacts/editor-autocomplete/city-initials.png`：`sz` 展示深圳/苏州，输入仍在原表单。
- `test-artifacts/editor-autocomplete/school-suggestions.png`：`北大` 展示校名和所在地。
- `test-artifacts/editor-autocomplete/major-1024.png`、`major-1400.png`：专业内联候选。
- `test-artifacts/choice-scroll/results.json`、`test-artifacts/choice-placement/results.json`：滚动和位置回归。
- `test-artifacts/editor-choice-pagination/results.json`、`test-artifacts/editor-email/results.json`、`test-artifacts/editor-click/results.json`：相关功能回归。
- `test-artifacts/autocomplete-unit.log`：单元测试结果。
- `test-artifacts/reports/template-qa-qingning-2026-10-03-203716.md`：固定模板 QA 报告。
- `test-artifacts/templates/qingning/local-pdf-long-compact.pdf`：长内容 2 页，稀疏 PDF 1 页。已检查末页渲染图，候选 UI 没有进入 PDF。
- 已查看学校和城市候选截图：沿用轻色高亮和原字段输入，不新增第二个搜索框；学校地点为次级文字。

## 未覆盖与限制

- 未运行真实登录账户、线上保存/付费 PDF 服务、AI 服务、图片导出或系统输入法人工测试；IME 已通过组件事件用例验证。
- 本次未修改模板文件或打印布局，不重复跑全部 50 个模板的间距和一页模式矩阵；共享编辑逻辑以组件用例和青柠实际浏览器回归覆盖。
- Scenario Loader 为固定宽度 PC 画布，内联学校/专业在 1024/1400 下验收；窄屏覆盖的是共用表单和候选列表，不代表真实移动端教育表单已改造。
- 城市为 60 个常用城市；专业为常见本科名称；学校不包含成人、港澳台和海外名单。所有字段都允许保留用户原文，包括历史校名和其他专业。
- 多个意向城市继续兼容原有文本填写，本轮没有增加多选标签控件。

## 结论

本次输入联想及相关编辑回归通过，本地 3011 预览可查看。更早的失败试跑用于定位旧测试选择器和 Esc 事件顺序问题，以上结果为修复后的验收结果。
