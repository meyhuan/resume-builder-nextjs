# 10 款 Canva 短名单去重复核

> 2026-09-28 进度补充：用户要求在 Canva 参考素材基础上继续制作。第 3、4、9 款分别实现为 `huiying`、`shenke`、`kuangxu` 内部候选，供实物并排比较。下方 2026-09-27 的去重判断仍保留，候选不因此自动计入公开 50 款。

日期：2026-09-27。面向中国年轻求职者，按“公开可选且设计实质不同”计数；相似款不因换色、换岗位文案或改头像而算新增。用户已确认暂无专项授权，所有实现须独立改编，不能纳入 Canva 素材。

| 序号 | 目前判断 | 与现有款对比 | 处理 |
| --- | --- | --- | --- |
| 1 `EAF2vhXF-iQ` | 内部候选 `suxian` | 顶部竖向短姓名/细线分栏区别于蓝角、时间轴、墨序；正文日期轴与时间轴仍需同数据并排评估 | 34 项本地 QA 通过，长内容 PDF 两页已目视；不公开，待发布验收 |
| 2 `EAGFYt00kMw` | 内部候选 `zhangxu` | 圆章标 + 右端动态章节编号区别于时间轴、蓝营；须继续核对编号在实际编辑操作后重排 | 34 项本地 QA 通过，长内容 PDF 两页已目视；不公开，待发布验收 |
| 3 `EAF_ksaKwqY` | 高同构风险 | 灰阶页眉 + 左窄栏 + 右经历，与 `lanmu` 的彩色页眉 + 左窄栏 + 右经历大体一致 | 暂缓，不以灰色换皮计数 |
| 4 `EAF-zxQrtUQ` | 高同构风险 | 深色小标题/分隔线的单栏正文，与 `jijian`、`heijiao` 接近；“技术”文案本身不是版式差异 | 暂缓，需更独立的项目结构 |
| 5 `EAGCc0BCNoc` | 高同构风险 | 居中姓名 + 黑白细线 + 分节经历，与 `yiyetong`、`hengjian` 接近 | 暂缓，不因隐藏头像计数 |
| 6 `EAGCcx3H3eU` | 高同构风险 | 浅蓝章节线/圆点与 `qingning`、`timeline` 接近，原稿整页边框又有跨页风险 | 暂缓，需证明比现有款更好 |
| 7 `EAGCc_0s_2s` | 内部候选 `chengyan` | 独立改编为左侧章节栏 + 右侧正文，不仅是橙色单栏换皮 | 本地 QA 通过，待发布验收 |
| 8 `EAHPXtgAEdo` | 内部候选 `mixu` | 浅米色侧栏 + 右侧大动态章节编号，与 `warm`、`lifeng` 有结构差异 | 本地 QA 通过，待发布验收 |
| 9 `EAF9-DnaqKo` | 高同构风险 | 灰白分节盒与 `tablegrid`、`hengjian` 接近，顶部 “RESUME” 胶囊不是核心价值 | 暂缓，不以装饰差异计数 |
| 10 `EAF9-Gsh84w` | 内部候选 `lanqi` | 反向双栏：左经历卡、右信息栏，与现有左栏信息模板有差异 | 本地 QA 通过，待发布验收 |

第 3、4、5、6、9 款已完成 Canva 公开预览与现有中文样例封面的版式复核（见下节）。这些判断是结构去重，尚非把相同中文数据装进新模板后的测试；因此不应为了凑满本批 8 款强行上线。若用户同意，可按原岗位覆盖面重新选 Canva 参考稿，再逐款独立改编。即使新稿本地 QA 通过，真实账号编辑、移动端表单、图片/PDF 导出、AI 操作、原创性/许可核查及部署核对仍是公开前的门槛。

## 原短名单高同构项：公开原稿复核

2026-09-27 使用 Canva 公开模板页只读预览原稿，未点“编辑模板”、未下载或复用图片/素材。产品侧对照 `public/thumbnails/` 中现有模板的统一中文演示内容。判断依据是阅读顺序、主辅栏位置、章节容器和信息层级，不以颜色、头像或职位文案算设计差异。

| 原稿 | 原稿可见结构 | 产品中最近似款 | 结论 |
| --- | --- | --- | --- |
| [#3 灰色新媒体运营](https://www.canva.cn/templates/EAF_ksaKwqY/) | 顶部灰色头像/意向横带，左灰底联系/技能窄栏，右侧校园/实习正文 | `lanmu`：顶部头像/横带，左窄信息栏，右侧经历 | 主辅信息架构相同；灰阶与顶栏文案不构成新款，淘汰 |
| [#4 深蓝 Java 工程师](https://www.canva.cn/templates/EAF-zxQrtUQ/) | 单栏技术经历；通栏浅灰章节带上叠深色短标签，顶部深色标题片 | `heijiao`、`jijian`：单栏、深色短标签/标题与分隔线 | 深色标签和浅灰带的组合未形成新的阅读结构；技术岗位字样不能计数，淘汰 |
| [#5 黑白财务](https://www.canva.cn/templates/EAGCc0BCNoc/) | 姓名居中，黑白单栏，高密度工作/项目条目由细横线分段 | `yiyetong`、`hengjian`：单栏密集经历与横线分节 | 原稿优势是内容示例而非版式；照搬密度还会损害中文可读性，淘汰 |
| [#6 浅蓝互联网运营](https://www.canva.cn/templates/EAGCcx3H3eU/) | 单栏，浅蓝外框、圆形章节点和细分隔线，正文层级紧凑 | `qingning`：圆形章节点 + 细线单栏；`timeline` 亦有章节节点 | 外框易在长内容跨页时失效，移除后与现有款核心结构相同，淘汰 |
| [#9 灰白大学生](https://www.canva.cn/templates/EAF9-DnaqKo/) | 顶部灰条/RESUME 胶囊，信息框与一组组横框章节 | `hengjian`：浅灰章节容器 + 单栏；`tablegrid`：框格信息 | 从横框转为可分页普通段落后与现有款接近；顶端胶囊只是装饰，淘汰 |

这些原稿不是“尚未做完”的五个可直接发布模板；若要继续本批，应先确认是否替换参考稿。产品的五款已做内部候选仍需独立的发布验收，不因选款结论自动公开。

## 替补原稿初筛（尚未批准替换）

2026-09-27 对 Canva 公开预览逐张查看；以下仅记录版式方向，未下载、复制原稿素材。

| Canva 原稿 | 观察 | 初判 |
| --- | --- | --- |
| [黑白极简视觉设计师](https://www.canva.cn/templates/EAGm4UX_51c/) | 左侧大幅人像与简介，右侧分层经历卡；视觉岗位的作品呈现可独立改编 | 待与现有侧栏款进一步对照；无头像时须保持结构成立 |
| [蓝灰黄视觉设计师](https://www.canva.cn/templates/EAGszs2rucg/) | 顶部人物介绍、下方深浅错位色块与技能区形成独立版式 | 仅适合作为创意岗位候选；原稿文字偏小且装饰较重，改编必须降低密度 |
| [黑色 UI 视觉设计师](https://www.canva.cn/templates/EAHEADbUdqk/) | 横向深色信息带、带编号的项目章节；有区别于普通单栏的阅读顺序 | 可作为设计/产品岗位候选；不复制原稿图表，技能需要用现有可编辑数据表达 |
| [黄绿几何市场营销](https://www.canva.cn/templates/EAG7vkC0gs4/) | 浅色几何角饰 + 常规单栏 | 与已有浅绿几何稿高度接近，淘汰 |
| [白金技术工程师](https://www.canva.cn/templates/EAGCdBtVLmI/) | 常规左侧信息栏 + 右侧经历 | 与现有双栏款接近，淘汰 |
| [黑白艺术学生](https://www.canva.cn/templates/EAFz9rO3N64/) | 黑色左栏 + 人像、右侧经历 | 与现有侧栏款接近，淘汰 |
| [灰色设计师](https://www.canva.cn/templates/EAHDnXCBPF0/) | 灰底上叠白色经历卡 | 比现有盒式稿差异有限，暂不纳入 |

上述前三款也还不能直接计数；需补足适合校招、技术、职场的参考稿，且用户确认允许替换原短名单后再实施。

## 第二轮公开预览复核（2026-09-27）

继续按“中文投递可读性、结构差异、无照片和跨页适配”筛选。仅以 Canva 公开页作版式观察，未下载或使用其图像/素材。以下不是已获用户确认的替补名单。

| Canva 原稿 | 视觉复核与现有款对照 | 结论 |
| --- | --- | --- |
| [黑色 UI 视觉设计师 `EAHEADbUdqk`](https://www.canva.cn/templates/EAHEADbUdqk/) | 横向深色信息带 + 左侧日期/编号轨道 + 右侧经历，比现有普通单栏更明确；但与 `zhangxu` 的章节编号概念有交集 | 保留为创意作品候选；若选用，须以项目成果而非雷达图展示能力，验证与 `zhangxu` 的差异 |
| [米绿色视频剪辑师 `EAHOZ5HErcE`](https://www.canva.cn/templates/EAHOZ5HErcE/) | 上方大字号姓名、正文左长栏/右侧联络与大照片，比常规右侧信息栏更强调个人作品 | 保留为创意作品备选；与 `lanqi` 都有右侧信息栏，照片缺省及长内容是关键风险 |
| [黑白橙时尚 `EAG-YYzANNY`](https://www.canva.cn/templates/EAG-YYzANNY/) | 黑橙右侧栏与 `lanqi` 的反向双栏信息架构同构，差别主要是色块和照片 | 淘汰 |
| [蓝色内容运营 `EAGGfoG_EVw`](https://www.canva.cn/templates/EAGGfoG_EVw/) | 左窄栏 + 右经历，和现有 `lanmu` 等相近 | 淘汰 |
| [新媒体运营 `EAFS86DZn0k`](https://www.canva.cn/templates/EAFS86DZn0k/) | 左窄栏 + 右经历，渐变背景和多色胶囊是主要变化；原稿内容较小 | 淘汰 |
| [黄蓝电商运营 `EAG53ZCSnks`](https://www.canva.cn/templates/EAG53ZCSnks/) | 大量彩色标签、背景渐变和技能条，岗位投递可读性偏弱 | 淘汰 |
| [绿白应届 `EAHEMjkkUEU`](https://www.canva.cn/templates/EAHEMjkkUEU/) | 深绿纹理背景和大圆角正文容器；装饰主导且跨页不稳 | 淘汰 |
| [克莱因蓝内容运营 `EAGGgD9sZNM`](https://www.canva.cn/templates/EAGGgD9sZNM/) | 左侧照片/信息、右侧经历，与已有双栏形态接近 | 淘汰 |
| [黑白灰撕纸 `EAHSFPmCCSE`](https://www.canva.cn/templates/EAHSFPmCCSE/) | 撕纸纹理是主要识别点，若独立改编去掉纹理则退化为已有单栏 | 淘汰 |
| [灰白学生商务 `EAFxmPBmJPI`](https://www.canva.cn/templates/EAFxmPBmJPI/) | 圆角灰色章节胶囊 + 单栏经历，结构差异不足 | 淘汰 |
| [蓝灰校园 `EAGyvX6HeR0`](https://www.canva.cn/templates/EAGyvX6HeR0/) | 深灰页眉 + 灰底单栏，与现有校招单栏近似 | 淘汰 |
| [黑白高级 `EAHO5B2f7Pk`](https://www.canva.cn/templates/EAHO5B2f7Pk/) | 左侧照片/简介 + 右侧黑色圆头章节，与现有侧栏款近似 | 淘汰 |
| [蓝色销售 `EAHAJjG4Mcc`](https://www.canva.cn/templates/EAHAJjG4Mcc/) | 横向顶栏 + 细线单栏正文，与 `timeline` / `hengjian` 等接近 | 淘汰 |
| [黑白设计 `EAHVWfHHDz4`](https://www.canva.cn/templates/EAHVWfHHDz4/) | 左侧照片/技能 + 右侧经历，侧栏形态近似；花纹背景不适合长内容 | 淘汰 |
| [蓝白后端 `EAGMH4esiJE`](https://www.canva.cn/templates/EAGMH4esiJE/) | 浅蓝分节条 + 单栏技术文案，与原 #4 的同构问题相同 | 淘汰 |

第二轮仍未得到可直接替换原 #3、#4、#5、#6、#9 的 **5 款合格参考稿**。尤其技术、正式商务和校招类，公开列表里大量款式仅换岗位文案或颜色，不能据此称为新增设计。用户确认替换方向前，保留原编号与内部状态；不将未选定候选注册为公开模板。
