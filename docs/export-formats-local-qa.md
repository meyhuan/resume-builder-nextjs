# 四种导出格式本地验收

日期：2026-11-07。范围：PC 编辑器、移动 H5 预览、小程序原生导出与历史记录。仅本地实现和验证，未推送、上传、部署或进行真实支付。

## 当前行为

- 每次打开导出默认 PDF；PDF、Word、图片（PNG）、Markdown 四种格式始终展示图标和用途建议。切换后展示对应预览，加载完成后才能确认。
- Word 使用本次生成的 DOCX 经 LibreOffice 转为分页预览；确认下载同一份文件。图片下载同一 PNG，Markdown 展示实际文本。
- 模板不支持 Word 时选项置灰，点击只显示顶部 toast，提示返回模板列表筛选「支持 Word」。不会改变选中格式，也不会在导出界面切换模板。
- 小程序 H5 使用全屏预览，底部单行格式选择和确认按钮，预览区内悬浮放大镜。原生容器不重复显示标题、返回或关闭按钮；独立网页保留返回按钮。返回先关闭导出预览，再返回才离开简历预览页。
- 预览和格式切换不扣次数。PDF、Word、图片共用额度，确认时由服务端检查；Markdown 免费。免费次数用完仍可预览，确认引导会员；会员返回后刷新额度，不重新排版已有 Word 预览。
- 小程序原生 Word 支持预览、确认、打开文档、发送文件、复制链接、导出历史和重新导出。新客户端通过 `miniDocx=1` 声明能力；旧客户端显示更新提示。
- Word 转换进程预热并复用，最多三个进行中或排队任务；同一用户、内容和模板的预览缓存十分钟。缓存不包含用户额度或下载令牌。界面展示真实阶段、排队状态和已等待秒数。

## 本轮 review 修复

1. 发布包遗漏 `scripts/word-preview-worker.py`：现在显式打包，缺少文件时直接失败，离线打包测试校验 ZIP 包含该文件。
2. LibreOffice 宏策略使用命名常量 `NEVER_EXECUTE`，禁止转换时运行宏。
3. Word 转换与预览使用各自专用临时目录，避免 Next.js 构建追踪扫描整个系统临时目录；清理仍仅删除本次创建的目录。
4. 原生结果页未知额度不再被转换为 0，也不虚构剩余 1 次。零额度、未知额度、免费 Markdown 文案分别验证。
5. 浏览器测试明确检查真实 Word 测试素材的生成前置条件，避免缺少素材时留下浏览器进程。
6. Word 确认已扣次但文件下载失败时，保留本次确认状态；即使剩余额度变成 0，仍能重试下载同一文件，不会错误引导开会员或再次扣次。
7. 修复新预览组件和能力检测中的 React lint 问题，并修正既有移动端测试的类型声明以通过完整生产构建，没有跳过 lint 或类型检查。

## 发布前检查

| 检查 | 结果 |
| --- | --- |
| PC / H5 交互测试 | 26 项通过 |
| Word 生成、预览缓存/流式进度、接口额度和文件权限 | 最终 52 项全部通过，包括三种模板真实转换及性能测试 |
| 小程序候选提交独立目录测试 | 19 项通过，包含既有支付回归；不包含工作区未提交的支付组件改动 |
| 发布脚本离线测试 | 30 项通过，SSH/SCP 均为测试替身，未连接生产环境 |
| 本机 Word 运行依赖检查 | Node、sharp、DOCX、LibreOffice 与 Python UNO 全部通过 |
| 微信开发者工具 | 导出页 WXML / WXSS 编译通过；原生页面使用本地合成任务验证零额度文案、未确认及未就绪状态，随后返回原首页 |
| 移动端生成既有回归 | 4 项通过 |
| 独立目录生产构建 | 通过：代码编译、lint、类型检查和 431 个页面生成；仍有既有 LandingTemplates 依赖、ESLint 插件及浏览器兼容数据提示 |
| 生产构建上的浏览器全流程 | 通过：PC / H5 四格式、真实 Word 图片、同文件确认下载、三种小屏、返回层级、旧客户端、额度耗尽、会员返回、服务端拒绝及已确认 Word 失败重试；无页面运行错误 |

候选构建目录：`D:/Marker/GitHub/.review-worktrees/export-review-20261107`。小程序候选目录：`D:/Marker/GitHub/.review-worktrees/mini-export-review-20261107`。排除截图输出、环境文件、嵌套管理后台工作区以及已有的支付组件/支付测试改动。

## 复现命令

在网页仓库设置本机 `LIBREOFFICE_PATH`（Windows 安装目录的 `soffice.com`；Linux 为 `soffice`），然后执行：

```powershell
pnpm exec vitest run --config scripts/vitest.docx.config.ts --maxWorkers=1
pnpm exec vitest run --config scripts/vitest.template-taxonomy.config.ts --maxWorkers=2 src/components/templates/mobile-export-formats.test.tsx src/components/templates/docx-export-ui.test.tsx
node scripts/check-docx-runtime.mjs --with-preview
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-deploy.ps1
```

`docx-preview.test.ts` 生成 `test-artifacts/word-preview/canva-minimal.docx` 和分页 JPG，供浏览器测试使用。启动本地服务后，设置 `EXPORT_E2E_BASE_URL` 为本地地址，再运行 `node scripts/e2e-export-formats.mjs`。脚本拦截业务接口，使用合成账号和额度；测试包含四格式预览、失败重试、确认后下载、额度耗尽、会员返回、返回层级、旧客户端、顶部 toast 不遮挡及三种小屏尺寸。

最终浏览器验证地址为独立生产构建 `http://127.0.0.1:3137`。本地报告和截图位于 `test-artifacts/export-formats/report.json` 及同目录 PNG；这些生成文件不进入代码提交。

小程序仓库执行 `node --test tests/*.test.cjs`。原生流程通过真实页面代码与 wx API 替身验证，没有实际支付或发送文件。

## 性能与体验入口

最终本机实测：转换器冷启动 40.1 秒；预热后首份预览 5.6 秒，后续未缓存预览约 3.2–4.0 秒；缓存命中 1 毫秒，直接复用同一字节。此为服务端本地测试，不含真实网络传输、账号保存和手机图片加载。构建并行运行时曾发生一次真实转换失败，根因未确定；最终停止构建后完整复测 52 项全部通过，真实转换中双栏和侧栏分别约 3.1 秒。

网页开发服务：`http://127.0.0.1:3127/editor?template=canva-minimal`。小程序仅开发版 DevTools 可通过 `wx.setStorageSync('dev_h5_origin', 'http://127.0.0.1:3127')` 后重新编译连接本地 H5；删除该键可恢复正常地址。正式版、体验版、真机和非 localhost 地址均不会启用此开关，自动化测试已覆盖。

## 验证边界

- 未执行生产部署；生产 Linux 仍需配置 LibreOffice Writer、中文字体和 Python UNO，可通过 `LIBREOFFICE_PYTHON_PATH` 指定解释器。发布前必须在目标环境运行依赖检查和真实转换检查。
- 浏览器回归使用模拟业务 API；微信模拟器仅核对本地页面状态和编译。真实支付到账、手机上的 Word/WPS 打开、分享及合法下载域名仍需真机验收。
- LibreOffice 预览可能与不同版本 Word/WPS 的字体和分页有差异，界面已说明。本轮没有调整模板渲染器或模板排版。

## 发布前追加检查（2026-11-07）

- 对照生产 Nginx 配置补充 HTTPS 反向代理测试，发现确认接口直接比较内部 URL 会误拒绝正常来源。现按 Nginx 保留的 Host 和覆盖的 X-Forwarded-Proto 校验；同域 HTTPS 通过，异域、错误协议及 `null` 来源仍拒绝。接口测试由 18 项增加到 22 项并全部通过。
- 生产机器原先缺少 LibreOffice / UNO。已将官方 LibreOffice 26.2.7 RPM 包校验 SHA256 后解压到独立目录 `/opt/aijianli-word-preview/runtime`，未替换系统 Python。使用随包 Python 执行三种合成模板的真实转换全部成功，转换器启动约 2.1 秒。
- 正式运行需设置 `LIBREOFFICE_PATH=/opt/aijianli-word-preview/runtime/opt/libreoffice26.2/program/soffice` 和 `LIBREOFFICE_PYTHON_PATH=/opt/aijianli-word-preview/runtime/opt/libreoffice26.2/program/python`。该检查未使用用户简历或扣减真实账号额度。
