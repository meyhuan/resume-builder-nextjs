# DOCX Linux 运行与导出验证

适用代码：`codex/docx-template-export` 工作树。此文档不执行部署；由维护者自行上传、构建和启动待验证版本。不要把 Windows 的 `node_modules` 复制到 Linux。

## 运行条件与边界

- DOCX 导出使用 Node.js 的 `docx` 库生成可编辑文档，蓝色侧栏背景和头像处理使用 `sharp`。导出路由明确使用 `runtime = 'nodejs'`，不支持 Edge runtime。
- 生成 DOCX 不调用 Windows COM、Microsoft Word、LibreOffice、Chromium，也不需要服务器安装中文字体。现有 HTML/PDF 导出仍使用自身的渲染链路。
- 当前锁文件为 `docx@9.5.1` 和 `sharp@0.34.5`。后者声明的 Node 引擎范围是 `^18.17.0 || ^20.3.0 || >=21.0.0`；Next.js 15 的最低版本为 18.18。不要把这些最低要求理解为整个项目所有依赖或长期运维版本的推荐。
- 本次只读检查的服务器为 Alibaba Cloud Linux 4.0.3 / x86_64 / glibc 2.38，Node 18.20.4，pnpm 10.33.2；该服务器现有 `sharp@0.34.5` 可以加载，线上旧版本尚无 `docx`。**没有在 Linux 上运行本分支导出，不能据此宣称 Linux 验收通过。**
- 服务器需要可写的临时文件目录；真实在线导出还沿用原有数据库、身份认证、配额和 OSS 配置。孤立生成样本不验证这些服务。
- DOCX 中声明 `Noto Sans SC` 字体，但没有嵌入字体。最终用 Word/WPS 打开时，客户端字体替换可能改变换行与分页。若后续用 Linux LibreOffice 渲染对比，也需要在渲染服务器安装一致的字体；这是预览/兼容渲染的要求，不是生成文件的要求。

## 在 Linux 源码目录运行

下面的冒烟测试需要本项目源码、`public/avatar.jpg` 和开发依赖（Vitest）。最小生产发布包当前不包含 `scripts/`、`src/`、`docs/`，不能直接在该包中执行这些源码测试。可在服务器的独立源码目录验证，不必写入当前生产发布目录。

```bash
# 在 Linux 上根据锁文件安装，包括平台对应的可选原生依赖及开发依赖。
# 不要使用 --no-optional 或 --prod。跳过安装脚本可避免触发无关的扩展构建。
pnpm install --frozen-lockfile --ignore-scripts --prod=false

# 第一关：进程平台、Node、sharp 实际 PNG 编解码、docx 内存生成。
pnpm docx:check --require-linux

# 第二关：直接调用项目的 exportResumeToDocx，生成样本与耗时清单。
pnpm docx:smoke
```

每条命令都必须退出码为 0。`docx:check` 某项失败时会输出具体错误并返回非零退出码；不会静默通过。`sharp` 加载失败时，应在 Linux 上重新安装锁文件依赖并保留平台可选包，先解决原生库加载，不能通过跳过图片处理掩盖失败。

验证整个 Next.js 应用的构建时，另按项目原有配置准备环境变量，再执行：

```bash
pnpm exec prisma generate
pnpm build
```

这些是构建步骤，不会自动启动或重启服务。现有本地构建记录在收集页面数据时缺少 `NEXT_PUBLIC_JAVA_API_BASE_URL` 而中止；本次 DOCX 冒烟通过不能代替完整构建通过。

## 产物与对比

默认目录 `test-artifacts/docx/`，可用 `DOCX_QA_OUTPUT_DIR` 指定新的对比目录：

```bash
DOCX_QA_OUTPUT_DIR=test-artifacts/docx-linux pnpm docx:smoke
```

预期 16 项测试通过，生成 15 个 DOCX 和一个 `manifest.json`：

- 三款新模板 `canva-minimal`、`canva-columns`、`canva-sidebar` 的统一示例，各 1 个。
- 三款新模板各自的 `full`、`sparse`、`long` 资料，各 3 个，共 9 个。
- 旧验证模板 `single-column.docx`（simple）、`two-column.docx`（jingrui）、`complex-decorative.docx`（chengyan），共 3 个，仅作既有导出回归，不算新增 Canva 模板。

`manifest.json` 记录 Node/平台/架构、每个文件大小和生成耗时。该耗时包含本次导出调用，不含请求认证、上传、下载、Word 渲染，也不是并发压测或性能承诺。ZIP 签名和文件大小断言只证明基本生成成功，不证明完整 OOXML 兼容或视觉一致。

下载 Linux 产物后，用**同一个 Word/WPS 版本、同一套字体**分别打开 Windows 和 Linux 样本，再导出 PDF/图片比较。重点查看蓝色侧栏是否每页铺到底，头像是否存在，长文本、双栏分页是否丢字或遮挡。DOCX 的 ZIP 时间戳可能变化，不应把文件哈希相同作为版式一致的标准。

固定冒烟样本的头像来自本地内嵌数据，没有验证远程头像下载。完成应用部署后，还需要通过产品的真实导出入口检查保存后的简历、远程头像、主题设置、会员配额和下载链接。这一步涉及用户数据和外部服务，不由上述离线测试替代。

当前已知视觉边界：侧栏铺底修复已在本地兼容渲染中验证；长内容仍有原有字段标题在页边界拆行的问题。未完成 Microsoft Word/WPS 实机验收，也未证明 HTML、浏览器 PDF、DOCX 的全量视觉一致，不能标为付费功能整体验收完成。
