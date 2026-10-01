# 简历编辑区域的交互约定

编辑时区分模块范围、条目范围和当前字段，避免三层实线圆角框同时叠加。样式集中在 `src/styles/resume-editor-interactions.css`，模板仍负责正文排版、字号和间距。

| 范围 | 反馈 | 标记 |
| --- | --- | --- |
| 完整模块 | 中性弱虚线，不叠加背景；显示模块操作 | `data-resume-edit-region="section"` |
| 一段经历或内容条目 | 浅中性背景，不画额外边框；显示条目操作 | `data-resume-edit-region="block"`，hover 状态为 `active` |
| 单个字段 | hover 使用浅紫背景；日期打开、键盘聚焦或实际编辑时才使用强边界 | `data-resume-edit-field`，富文本值为 `rich-text` |

模块边界使用 `outline`，不会挤压内容或改变 A4 排版。交互圆角独立为 4px，不使用产品卡片的 12px 默认圆角。字段背景使用不透明的浅色，并同时设置文字颜色，保证深色侧栏中的内容可读。Hover 装饰仅用于支持 hover 的设备；键盘 focus 保留独立的强提示。只读渲染不生成这些标记。

## 操作按钮的归属

`useHoverActions` 是一个区域内所有浮动按钮的唯一状态所有者。父区域与工具栏不要各自建立隐藏定时器。

- 鼠标进入区域或键盘焦点进入区域时显示操作。
- 在正文与按钮之间、按钮之间移动时保持显示。
- 鼠标离开整个区域后等待 200ms 再隐藏；返回时取消待执行的隐藏。
- 区域中仍有键盘焦点时保留操作；编辑状态变化和组件卸载时清理定时器。
- 工具栏可以换行，避免在窄侧栏中超出可点击范围。

结构化字段、姓名和模块标题支持 Enter/Space 进入现有编辑器。富文本保留现有点击入口，不增加不能自动聚焦编辑器的键盘入口。

## 导出约定

所有浮动操作、拖动把手和字段删除按钮使用 `data-export-hide="true"`。

- 打印样式关闭编辑边界并隐藏工具栏。
- HTML 导出从克隆节点移除编辑标记及新增的焦点停靠点，移除操作节点。
- PNG 导出在根节点设置 `data-resume-exporting`，暂停编辑高亮及其过渡，避免截到尚未消退的背景。结束或失败时恢复原状态；同一节点的并发导出完成后再恢复。

## 回归检查

```powershell
corepack pnpm exec vitest run --config scripts/vitest.editor-hover.config.ts
corepack pnpm template:qa --all --hover-only --base-url http://127.0.0.1:3011 --report
corepack pnpm template:qa --all --local --jobs 3 --base-url http://127.0.0.1:3011 --scenario-loader-url "http://127.0.0.1:3011/dev/scenario-loader?tpl=qingning" --report
```

单元测试覆盖原按钮闪烁路径、定时器竞争、焦点保持、卸载清理及导出恢复。浏览器检查使用真实鼠标移动和命中测试，检查每款模板的代表条目、模块操作和字段样式，并检查图像捕获模式及打印样式。它不替代真实登录环境中的保存、AI 请求和会员权限验证。
