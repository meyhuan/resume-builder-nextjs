# DOCX 模板选择与专用模板方案

## 结论

现有 HTML 模板不应因为增加 DOCX 导出而修改原有视觉设计。HTML/PDF/PNG 继续使用原模板；DOCX 应新增独立的 Word 友好模板，使用 WordprocessingML 能稳定表达的版式基础。

当前验证过的 `simple`、`jingrui`、`chengyan` 不应作为最终的 DOCX 模板集合：

- `simple` 适合作为单栏排版参考，但不适合作为“原样导出”的承诺对象。它的浏览器预览依赖弹性布局、图标和可变文本宽度，直接映射到 Word 后仍然需要重排。
- `jingrui` 包含斜切装饰、渐变、`clip-path`、伪元素和大图区域。Word 表格可以近似结构，但不能稳定表达原始装饰。
- `chengyan` 的箭头标题依赖 `clip-path`、绝对定位和伪元素。用普通 Word 表格替代后，结构可读，但视觉已经是另一个模板。

这意味着之前对三个模板的 DOCX 专用渲染器只能作为技术验证，不能作为付费功能的最终模板。它们的 HTML/PDF 样式本身没有被修改，但继续把它们标记为“支持 DOCX”会造成用户对视觉一致性的错误预期。

## Canva 参考来源与已确认款式

本批采用 Canva 的真实模板页作为视觉参考，全部标记为“受参考启发的改编”，不声称是 Canva 原稿的逐像素复制，也不复制 Canva 素材。

| 新模板 ID | Canva 来源 | 视觉分类 | Word 适配策略 |
| --- | --- | --- | --- |
| `canva-minimal` | [Black and White Minimalist Professional Resume A4](https://www.canva.com/templates/EAGmJ13p8zE-black-and-white-minimalist-professional-resume-a4/)（EAGmJ13p8zE） | 黑白极简、单栏 | 普通段落、固定页边距、横线和行内头像 |
| `canva-columns` | [Black and White Minimalist Simple Clean Two Columns Project Manager Professional CV](https://www.canva.com/templates/EAHNAjwdi9Q-black-and-white-minimalist-simple-clean-two-columns-project-manager-professional-cv/)（EAHNAjwdi9Q） | 黑白正式、双栏 | 固定宽度 Word 表格承载左右栏，日期独立列 |
| `canva-sidebar` | [Blue and White Simple Modern Resume A4](https://www.canva.com/templates/EAGonoSpBcM-blue-and-white-simple-modern-resume-a4/)（EAGonoSpBcM） | 蓝白现代、彩色侧栏 | 纯色侧栏表格、行内头像、白色正文列 |

### 选型理由

- `canva-minimal` 作为单栏基准，用来验证长文本、分页和最少装饰下的 HTML/DOCX 同构。
- `canva-columns` 验证左右栏和日期列；不使用 CSS Grid 导出，HTML 预览和 DOCX 都按固定列宽实现。
- `canva-sidebar` 保留蓝色侧栏、头像和信息分区，但去掉渐变、斜切、伪元素等 Word 不稳定装饰。

## 候选模板适配度

| 模板 | 现有结构 | 直接导出风险 | 结论 |
| --- | --- | --- | --- |
| `simple` | 单栏、普通文档流、少量表格式信息 | 中 | 可作为 Word 专用单栏模板的视觉参考，不直接复用原模板 |
| `tablegrid` | 信息和章节已经接近固定表格 | 低到中 | 最适合作为 Word 专用模板的结构参考；需要把 HTML 预览也改成固定表格语义 |
| `timeline` | 日期列、内容列、时间轴线 | 中 | 可作为后续 Word 时间轴模板；时间轴线必须改为表格边框 |
| `elegant` | 深色页眉、头像、普通内容流 | 中 | 可做第二阶段 Word 模板，但头像和页眉高度需要固定 |
| `warm` | 双栏、渐变、复杂侧栏 | 高 | 不适合作为第一批 Word 模板 |
| `jingrui` | 双栏、斜切区域、渐变、伪元素 | 很高 | 不作为最终 DOCX 模板 |
| `chengyan` | 箭头模块标题、绝对定位、伪元素 | 很高 | 不作为最终 DOCX 模板 |

## 建议新增的模板

第一批新增 `canva-minimal`、`canva-columns`、`canva-sidebar` 三个模板。它们的目标不是复刻现有 HTML 模板，而是提供在 Word 中稳定、可编辑、可继续修改的三种版式。

### 布局约束

1. A4 页面和页边距使用固定毫米值。
2. 页面主体只使用普通段落、固定宽度表格、单元格底色、边框和行内图片。
3. 不使用 `clip-path`、CSS 渐变、伪元素、绝对定位、CSS Grid、依赖浮动宽度的装饰。
4. 头像、姓名、联系方式、求职意向、章节和经历块都有固定列宽。
5. 日期、标题、正文分别使用独立的 Word 段落/表格单元格，避免长文本挤压日期。
6. 富文本只承诺段落、换行、无序列表和基本强调；不把任意 CSS 当作 DOCX 能力。

### 预览与导出

三个 `canva-*` 模板的 HTML 预览和 DOCX 导出使用同一份布局规格（页面尺寸、列宽、字号、行距、间距和颜色），而不是分别手写两套近似样式。HTML 预览使用与 Word 表格同构的固定结构，DOCX 使用对应的 Word 表格结构。

Word 的实际分页仍由 Word/LibreOffice 的排版引擎决定，因此不能承诺所有 Word 版本达到像素级一致。付费功能的“最终预览”应使用同一份 DOCX 经过 LibreOffice/Word 兼容渲染后生成 PDF/PNG；这样用户看到的导出预览与下载文件来自同一个渲染链路。编辑器中的实时 HTML 预览用于编辑效率，导出确认页中的 Word 预览用于最终一致性。

## 现有模板的处理方式

- 原有 `simple`、`jingrui`、`chengyan` 的 HTML/PDF/PNG 逻辑保持不变。
- 不再为了 DOCX 去修改这些模板的 CSS 或视觉装饰。
- 新的三套模板完成并通过验证后，DOCX 导出优先对这三套开放；现有模板继续支持原有的 PDF/PNG 导出。
- 旧的三个 DOCX 验证分支应视为实验代码，不能直接作为产品承诺。上线前应移除或明确标记为 legacy，避免用户误以为它们与原模板一致。

## 验收标准

新模板至少需要通过以下验证后才适合进入付费功能：

1. 单页、两页和内容溢出三种数据量均能生成合法 DOCX。
2. HTML 预览、LibreOffice 渲染的 PDF/PNG 和 Word 打开后的页面结构一致，标题、日期、边框、头像和分页没有明显漂移。
3. 在 Windows Word 和 LibreOffice 各打开一次，确认表格不会自动改列宽、图片不会变形、中文不会出现意外换行。
4. 对空字段、超长公司名、超长邮箱、列表和中英文混排做回归测试。
5. 记录 DOCX 生成耗时、Word 预览渲染耗时和内存占用；超过产品可接受阈值时再做缓存和异步渲染。

## 分阶段实施

### 阶段一：Word 专用模板原型（已完成）

新增 `canva-minimal`、`canva-columns`、`canva-sidebar` 和对应的共享布局规格，只覆盖固定表格、段落、头像、列表和基础字段。原模板不改。

### 阶段二：同源预览和导出（已完成首轮）

HTML 预览与 DOCX 导出均从同一套 Word-safe 结构读取参数；已生成三套 DOCX 并用 LibreOffice 渲染为 PDF/PNG 做视觉验收。生产导出确认页仍应复用同一渲染链路。

### 阶段三：质量门禁（本次已建立）

建立固定样例、PNG 对比和分页回归。三套新模板已加入 `DOCX_SUPPORTED_TEMPLATE_IDS`；Windows Word 实机打开、不同字体环境和性能阈值仍应作为上线前门禁继续执行。

## 本次实现验收记录

- 模板缩略图：`template:thumbs canva-minimal canva-columns canva-sidebar`，生成三张真实 `.webp` 预览图。
- 模板 QA：三套均通过本地 PC、移动端、稀疏数据、长文本、富文本、英文数据、主题变更、颜色变更、字段编辑、头像入口、求职意向入口、区块操作、悬停交互和 PDF 分页检查。
- DOCX 导出：`vitest.docx.config.ts` 共 7 个样例（3 个新模板 + 3 个 legacy 验证模板 + 1 个拒绝路径）全部通过。
- DOCX 渲染：三套 DOCX 均由 LibreOffice 成功渲染为 PDF/PNG；输出位于 `test-artifacts/docx/canva-*-rendered/`。
- 模板目录：`vitest.template-taxonomy.config.ts` 的 14 个测试文件、65 个测试全部通过。
- 详细运行产物：`test-artifacts/reports/template-qa-canva-minimal-2026-10-15-200918.md`、`template-qa-canva-columns-2026-10-15-201854.md`、`template-qa-canva-sidebar-2026-10-15-202037.md`。

