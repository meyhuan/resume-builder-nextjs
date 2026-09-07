# 网申自动填充与投递管理

## 数据流

1. 用户在 `/dashboard/application-profile` 选择默认简历并补充网申资料。
2. 服务端用 `APPLICATION_PROFILE_ENCRYPTION_KEY` 加密资料正文。
3. 用户首次确认隐私说明后，扩展通过 `/next-api/extension/silent-authorize` 静默复用网站登录态，并用 PKCE 换取独立 Token，不读取网站 Cookie。
4. 用户点击扩展后，扩展扫描当前标签页的可见表单控件。
5. 页面扫描器结合标签、附近文字、区块和记录序号提取字段上下文；后台用中英文别名字典映射资料，只将命中的值发送给填写脚本。
6. 至少填写一个字段后创建 `DRAFT` 投递记录；用户确认提交后更新为 `APPLIED`。

## 登录体验

- 首次打开只展示一次用途与隐私说明。
- 如果智简简历已经登录，确认后自动连接，不需要再次扫码或打开授权页。
- 如果尚未登录，插件打开登录页并在两分钟内自动检测登录结果；登录成功后无需再次确认授权。
- Token 到期后优先静默续接；网站登录也失效时才提示重新登录。
- 用户主动断开后关闭自动连接，直到再次手动启用。

## 招聘网站访问权限

- 扩展首次执行“一键填写”时，通过 Chrome 原生权限弹窗申请 HTTP/HTTPS 网页访问权限。
- 权限仅提供运行脚本的能力；扩展仍然只在用户点击“一键填写”后扫描当前活动页面。
- 扩展不会后台遍历标签页、浏览历史或未主动操作的招聘页面。

## 站点适配

- 京东招聘（`zhaopin.jd.com`）：通过页面字段 ID 映射个人信息、求职意向、工作经历、项目经历、教育经历、技能、证书和个人网站；支持只读日期控件以及按资料条数新增工作、项目、教育经历。页面里的 `nationality` 实际对应“民族”，已通过站点规则纠正，避免误填为国籍。
- 腾讯招聘（`careers.tencent.com`）：只扫描简历主体，排除顶部搜索框、电话国家区号、国家选择框和 Element UI 地区搜索框；支持姓名、当前城市、手机、邮箱、工作职位、公司、工作描述、学校、专业、学历、教育/工作年月和自我评价，并可按资料条数新增工作、教育经历。
- 其他招聘官网继续使用通用的中英文静态别名映射。若页面使用自定义日期或下拉组件，V1 会跳过无法可靠填写的控件。

## 重复区块兼容引擎

- 工作、教育和项目经历统一使用“定位候选按钮 → 点击 → 等待渲染 → 验证行数 → 必要时换候选节点重试”的执行流程。
- 执行器只把适配规则和期望行数传入页面主世界，不向招聘网站暴露简历正文。
- 每个结果都会记录资料条数、填写前行数、新增行数、最终行数、尝试次数和结构化失败原因。
- 腾讯和京东的脱敏 DOM 样本作为固定回归测试；后续每修复一个站点问题，都应增加对应样本。

## 填写效果埋点

- `extension_fill_result` 保存站点域名、适配器、耗时、字段填写数量、未匹配数量和重复区块诊断。
- `extension_fill_complete`、`extension_fill_partial`、`extension_fill_failed` 可直接在分析后台的事件排行中查看总体效果。
- 埋点不包含姓名、电话、邮箱、简历正文、字段填写值或完整职位链接。

## 0.4.0：OpenJobAutofill 通用能力接入

本次按 MIT 许可移植 OpenJobAutofill 的部分字段上下文提取逻辑，并改造通用选择控件流程。
来源、固定提交及改动范围见 `extension/THIRD_PARTY_NOTICES.md`；完整版权许可会随产物分发。

- 不依赖公司域名识别普通标签、ARIA 标签、附近字段标签及工作/项目/教育区块。
- 区块内按记录序号取资料，减少字段缺失造成后续经历错位；家庭、推荐人、紧急联系人区块不会套用本人信息。
- 按表单结构发现重复记录及明确的新增入口，复用新增执行器；结构不明确时仍跳过。
- 常见 ARIA、Ant Design、Element、Kuma 选择控件支持局部候选查找、异步等待和搜索。
- 下拉框只写进搜索框不算成功；原生字段写入后检查值是否保留。复杂日期、级联选择和超时异步控件仍可能需人工处理。
- `engineVersion`、`extensionVersion`、`detectedFieldCount`、`contextualFieldCount` 支持后续版本效果对比。
- 失败、缺资料、未识别数量按控件计数，独立于界面去重后的提示列表；不能直接当作用户业务字段数（例如单选项有多个控件）。
- 零识别、无有效填写或资料缺失不再标为完整成功；现有事件仍不是最终提交成功率。

本次没有引入上游 AI 调用、界面或 API Key 配置；运行不请求上游服务。现有账号、网申资料及投递管理继续复用。
自动化验证使用不绑定域名的合成 DOM，不代表任意招聘官网已通过实测。

本次验证（2026-09-05）：

- `pnpm --dir extension test`：34 项通过，包含 14 项新扫描/填写/适配器回归测试。
- `pnpm test:application-autofill`：7 项通过。
- `pnpm --dir extension typecheck`、`pnpm exec tsc --noEmit --incremental false`：通过。
- `pnpm --dir extension zip`：构建通过，ZIP 中已核对版本 0.4.0 及第三方许可。
- 当前本地生成的 ZIP 连接 `http://localhost:3000`；对外分发前须以线上 `WXT_API_BASE_URL` 重新构建，并部署新增埋点属性白名单。
- 未执行真实官网的登录态端到端测试，未验证线上埋点入库，不以单元测试代替实际填写率。

## 0.4.2：通用日期、城市路径与重复经历安全性

不新增招聘公司域名规则，在已有扫描/映射/执行流程中增加组件级驱动：

- `popup-date`：识别 Ant、rc-calendar、Kuma、Element 的已列举日期容器。通过弹出日历的可编辑输入提交，或点击具有完整、精确日期 title 的唯一可用单元格，再回读原字段验证。不强写 readonly，不猜日期精度。
- `cascader`：识别 Ant/RC/Kuma/Element 的已列举级联结构，按明确路径（例如 `广东省 / 深圳市`）逐列精确匹配，等待异步加载；同名歧义、缺上级路径、禁用节点、未确认选中时跳过。
- 重复经历计数忽略隐藏模板；新增入口排除隐藏、禁用、提交按钮及其子节点，限制最多 24 次尝试，避免无界重试。
- 补充“期望工作城市”字段别名。

边界：组件容器识别不代表该组件的全部变体受支持。当前不实现历史月份翻页、双面板日期范围确认、仅显示叶子名称的级联复验、悬停展开、城市名自动推断省份、无分隔符地址解析。未知日期控件仍跳过。腾讯/淘天实站结果不能由合成测试推断。

新代码参考公开组件交互约定，自行实现 DOM 驱动，未引入新的运行时依赖或复制上述组件源码：[rc-calendar](https://github.com/react-component/calendar)、[rc-cascader](https://github.com/react-component/cascader)、[Element Cascader](https://github.com/ElemeFE/element/blob/dev/packages/cascader/src/cascader.vue)。原 OpenJobAutofill 移植范围和许可不变。

### 效果统计

引擎版本 `openjob-context-v3`、插件 `0.4.2`。新增固定数值属性：

- `popupDateAttemptCount/FilledCount/ExistingCount/FailedCount`（分别使用完整 `popupDate` 前缀）。
- `cascaderAttemptCount/FilledCount/ExistingCount/FailedCount`（分别使用完整 `cascader` 前缀）。
- `controlInvalidValueCount`、`controlPopupUnavailableCount`、`controlOptionUnavailableCount`、`controlVerificationFailedCount`、`controlDriverErrorCount`。

这些指标仅覆盖本版两个新驱动，不代表所有控件。Attempt 包含原本有值；评估新增填写成功率时，分母应扣除 Existing。失败原因是固定计数，不发送字段标签、资料值、网页文本或异常原文。Next 接口同步增加属性白名单；上线必须同时部署后端改动，最终入库仍需单独验证。

### 验证与更新

- 插件测试 52/52、资料/投递测试 7/7 通过。
- 扩展与项目 TypeScript 检查通过，`git diff --check` 通过。
- `pnpm --dir extension zip` 构建通过，产物 `extension/.output/aijianliapplication-autofill-extension-0.4.2-chrome.zip`。
- 本轮未操作招聘网站，未保存或提交；本版真实登录态端到端测试未执行。
- 当前包为 localhost:3000 本地测试版，不是线上分发包。在 Chrome 扩展管理页重新加载并确认 0.4.2，关闭后重新打开侧栏即可测试；不用重新安装或重新取 Token。

## 本地开发

发布版请遵循 `docs/extension-release-checklist.md`，使用 `pnpm --dir extension run release`。普通 `build/zip` 仍可包含本地联调地址，不用于对外分发。0.5.0 已增加独立、去重的填写效果统计页面 `/admin/extension-metrics`。

```bash
pnpm install
pnpm extension:dev
```

开发构建输出到 `extension/.output/chrome-mv3`，可在 `chrome://extensions` 的开发者模式中加载。

本地联调时设置：

```dotenv
APPLICATION_PROFILE_ENCRYPTION_KEY=<long-random-secret>
EXTENSION_ALLOWED_IDS=<chrome-extension-id>
```

扩展默认连接 `https://aijianli.cn`。本地联调可在扩展环境中设置 `WXT_API_BASE_URL=http://localhost:3000`。

## V1 边界

- 只使用静态字段别名，不调用 AI。
- 不覆盖网页已有值。
- 不处理文件上传、验证码、协议勾选和最终提交。
- 已适配站点可按资料条数新增教育、工作或项目经历行；通用站点在没有可靠新增规则时不会盲目点击。
- 暂不操作腾讯的国家/期望城市等级联选择器；日期只有年月而控件要求具体日期时，默认留空并询问。用户明确选择后才可用当月 1 日，提交前仍需核对；“至今”不转换为结束日期。
- 不收集完整网页、浏览历史或未命中的表单内容。

填写完成后，扩展会分别报告已填写、原本有值、资料待补充、控件填写失败和未识别字段。重复经历不会在页面行数多于资料条数时重复使用最后一条数据。

## 0.4.4：日期精度确认

- 当已识别的日历或原生日期输入要求年月日、资料只有年月时，先填其他内容，并展示中文确认卡片。
- “使用当月1日继续填写”默认仅本次生效；可主动勾选“在此网站记住选择”。也可选择留空手动填写。偏好保存在本机插件中，按精确 origin 隔离，不同步到原始资料。
- 记住后在填写按钮下显示当前偏好，可点击“重新询问日期补全”取消。取消不清除网站已有日期。
- 已有日期、完整年月日、只要求年月的输入保持不变。回读验证成功后才计入 `dateCompletionAppliedCount`。
- fill result 埋点新增 `dateCompletionPolicy`（ask/first-day/manual）与 `dateCompletionAppliedCount`，延续 `controlDatePrecisionMissingCount`。不上传具体日期或简历正文；服务端白名单已更新。
- 本地验收和阻塞记录见 `docs/autofill-live-test-0.4.4.md`。当前包仍连接 localhost，不是线上分发包。
