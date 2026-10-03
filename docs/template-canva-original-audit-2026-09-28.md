# Canva 登录后原稿获取与内部候选复核（2026-09-28）

本次通过用户已登录的 Canva 网页编辑器取得 8 张 A4 模板原稿的 1,414 × 2,000 PNG。第 2 款使用已打开的编辑稿；其余候选分别从公开模板创建了用户账号内的 Canva 副本，再导出原稿。Canva 专用连接仍返回需要重新认证；网页登录不等于连接授权。没有修改原稿内容或更改分享权限。

| 原稿 / 产品候选 | 本地高清原稿 | 带原稿 QA 报告 | 人工视觉判断 | 发布结论 |
| --- | --- | --- | --- | --- |
| [编号校招 `EAGFYt00kMw`](https://www.canva.cn/templates/EAGFYt00kMw/) / `zhangxu` | `docs/template-references/canva-shortlist-2026-09-28/EAGFYt00kMw-original.png` | `test-artifacts/reports/template-qa-zhangxu-2026-09-28-105734.md` | 顶/底深色线、圆章、右端章节号与紧凑单栏接近；同一批复验 35 项通过、0 失败，内容与头像样例不同 | 待真实账号确认后再决定公开 |
| [灰阶运营 `EAF_ksaKwqY`](https://www.canva.cn/templates/EAF_ksaKwqY/) / `huiying` | `docs/template-references/canva-shortlist-2026-09-28/EAF_ksaKwqY-original.png` | `test-artifacts/reports/template-qa-huiying-2026-09-28-082730.md` | 灰色侧栏与右侧经历栏方向一致；原稿顶部横幅、头像与侧栏比例更鲜明，需再修整 | 不宜公开 |
| [深蓝技术 `EAF-zxQrtUQ`](https://www.canva.cn/templates/EAF-zxQrtUQ/) / `shenke` | `docs/template-references/canva-shortlist-2026-09-28/EAF-zxQrtUQ-original.png` | `test-artifacts/reports/template-qa-shenke-2026-09-28-155056.md` | 页框、顶端短带、深浅标题带接近；产品版放大姓名并降低正文密度；34 项通过、0 失败，6 条 Java API 环境告警 | 继续内部候选 |
| [灰白校招 `EAF9-DnaqKo`](https://www.canva.cn/templates/EAF9-DnaqKo/) / `kuangxu` | `docs/template-references/canva-shortlist-2026-09-28/EAF9-DnaqKo-original.png` | `test-artifacts/reports/template-qa-kuangxu-2026-09-28-083159.md` | 灰色页顶、标题胶囊、基本信息框、逐节横框接近；与产品既有单栏模板的差异仍弱 | 不宜公开 |
| [黑白细线校招 `EAF2vhXF-iQ`](https://www.canva.cn/design?create&type=TADae_-2twE&template=EAF2vhXF-iQ&category=tACZCustSTA) / `suxian` | `docs/template-references/canva-shortlist-2026-09-28/EAF2vhXF-iQ-original.png` | `test-artifacts/reports/template-qa-suxian-2026-09-28-110606.md` | 竖排姓名、细线页框、窄日期栏与局部时间轴方向一致；产品版使用主题色和产品交互组件，头像为用户数据位 | 待真实账号确认后再决定公开 |
| [橙白用户研究 `EAGCc_0s_2s`](https://www.canva.cn/templates/EAGCc_0s_2s/) / `chengyan` | `docs/template-references/canva-shortlist-2026-09-28/EAGCc_0s_2s-original.png` | `test-artifacts/reports/template-qa-chengyan-2026-09-28-111234.md` | 浅橙页头、灰白信息卡、左侧连续导线和标签带已对齐；产品版移除原稿人物/图标，保留可编辑单栏区块 | 待真实账号确认后再决定公开 |
| [米白设计师 `EAHPXtgAEdo`](https://www.canva.cn/templates/EAHPXtgAEdo/) / `mixu` | `docs/template-references/canva-shortlist-2026-09-28/EAHPXtgAEdo-original.png` | `test-artifacts/reports/template-qa-mixu-2026-09-28-153056.md` | 浅米色信息侧栏、右侧 `01–05` 章节号、细线分隔与宽留白方向一致；产品版接入可编辑头像/区块、主题色和跨栏拖拽，不复制原稿人像、字体或图标 | 待真实账号确认后再决定公开 |
| [蓝白校招反向双栏 `EAF9-Gsh84w`](https://www.canva.cn/templates/EAF9-Gsh84w/) / `lanqi` | `docs/template-references/canva-shortlist-2026-09-28/EAF9-Gsh84w-original.png` | `test-artifacts/reports/template-qa-lanqi-2026-09-28-154404.md` | 浅蓝横向页眉、左侧宽栏灰白经历卡、右侧浅灰个人信息栏已对齐；产品版使用动态字段带、可编辑头像/区块和跨栏拖拽，不复制 Canva 图标、人像或固定联系卡 | 待真实账号确认后再决定公开 |

8 次固定 QA 均使用 `corepack pnpm template:qa <id> --local --base-url http://127.0.0.1:3000 --scenario-loader-url "http://127.0.0.1:3000/dev/scenario-loader?tpl=<id>" --report --reference-image <原稿 PNG>`；注册、编辑入口、主题调整、切换、移动端渲染、长内容分页、稀疏内容 PDF、模块操作与场景数据加载均通过，0 失败。最近的 `suxian`、`chengyan`、`mixu`、`lanqi` 和 `shenke` 复验各有 6 条 `127.0.0.1:18080` Java API 连接告警，不影响模板断言；其余报告与截图位于被 Git 忽略的 `test-artifacts/`，本地可查。人工并排视觉判断使用高清原稿与各候选的真实渲染缩略图，样例数据不同，因此不评价字句或人像一致性。

后续处理：已修整 `huiying` 的头像、横幅、侧栏比例和窄栏内技能排布，见 `template-qa-huiying-2026-09-28-085813.md`；同一中文样例与 `lanmu`、`mixu` 的产品缩略图并排后，尽管顶端轮廓不同，左右信息分配仍高度一致，保持内部候选。`kuangxu` 与同一中文样例的 `hengjian` 比较，均为单栏经历与横线分节；`tablegrid` 虽有完整格线，但基本信息框又与 `kuangxu` 接近。仅有灰色页顶和标题胶囊不足以算独立公开款，保留隐藏并建议换参考稿。公开可见性和公开模板计数未变。真实账号的移动编辑、保存重开、图片/PDF 导出、AI 操作及发布环境仍待验收。
