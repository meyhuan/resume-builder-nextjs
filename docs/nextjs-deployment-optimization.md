# Next.js 发布提速：第一阶段

## 范围与约定

2026-10-05：保留 ZIP 上传、版本化 release 目录、PM2、健康检查和失败回滚。
本轮仅修改和离线验证脚本，未上传生产包、修改服务端环境变量或重启线上服务。
未修改业务页面、静态生成策略、依赖安装范围，也未引入 standalone、rsync、Docker 或 CI。

用户没有明确要求发布时，不执行真实部署。用户已有未提交改动不得回退，也不得默认纳入发布。
正式发布继续使用指定提交的独立 worktree；把最新版 deploy.ps1、deploy.sh 和 scripts/deploy-tools.psm1 一起带入构建目录。
脚本自身不会自动创建 worktree、安装依赖、运行测试、提交或推送代码，调用方仍需完成这些步骤。

## 已实现

- 本地阶段计时与 JSON 报告：缓存恢复、构建、缓存保存、整理文件、压缩、包校验、上传、远端部署、清理；失败也写报告。
- 服务端标准输出包含 `DEPLOY_TIMING stage=... seconds=...`，分别记录校验、解压、安装、Prisma、重启、健康检查和清理。
- ZIP 默认使用 7-Zip 标准压缩（`-mx=5`）；未安装 7-Zip 时使用 .NET ZipFile 的 Optimal 模式。两者都包含 `.next` 等点目录。
- 同一 Git 仓库的不同 worktree 共享本地编译缓存，仅恢复 `.next/cache/webpack` 和 `swc`，不恢复 fetch-cache、图片、页面产物或开发会话。
- 缓存按 Node 版本、系统与架构、依赖锁文件、配置、Prisma schema、环境文件及相关构建环境变量的指纹区分；不记录环境变量明文。
- `cacheHit` 只表示已恢复同一指纹的缓存快照，不代表 Webpack 内部必然命中；跨 worktree 路径变化仍可能使部分缓存失效。
- 成功构建后才保存缓存；缓存互斥锁避免同一缓存被并发写入。首次运行需要建立缓存，不能立即获得热缓存收益。
- 包生成后计算 SHA256，服务端在解压和切换版本前校验。RemoteOnly 的校验参数可选，兼容历史已上传包。
- 打包前检查 `.next/BUILD_ID`，防止把开发服务产物误当成生产构建；但 SkipBuild 仍需调用方保证产物对应当前提交和构建环境。
- 仅打包模式不会调用 SSH/SCP。失败上传保留 ZIP，成功部署默认删除 ZIP；KeepPackage 可以保留。

默认缓存和报告位置：`%LOCALAPPDATA%\Aijianli\deploy\<repository-id>\cache` 和 `logs`。
数据在仓库外，worktree 清理不会删除共享缓存；无需修改 `.gitignore`。构建缓存应视为本机私有文件，不要上传到公开存储。
依赖安装与测试由调用方执行，不包含在 deploy.ps1 的 totalSeconds 中。服务端细项目前在终端日志，本地 JSON 记录远端部署总时长。

## 命令

在项目目录执行，只构建和打包，不发布：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1 -PackageOnly
```

已有经过验证的生产构建，仅打包：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1 -SkipBuild -PackageOnly
```

只有用户明确要求上线时执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1
```

可选开关：`-DisableBuildCache`、`-Compression Fastest`、`-ArchiveTool DotNet`、`-ArchiveTool SevenZip`、`-CacheRoot <path>`、`-LogDirectory <path>`、`-KeepPackage`。
`Compression Optimal` 是默认值；慢上传链路不宜仅为节省压缩时间而扩大包体。

已有 ZIP 需要重试时，先从 JSON 读取 releaseId 和 packageSha256，确认 ZIP 哈希一致，再上传到该 releaseId 对应的 `.incoming/<releaseId>.zip`。
然后执行 `deploy.ps1 -RemoteOnly -ReleaseId <id> -PackageSha256 <hash>`，可免去重新构建和打包。
不要对当前正在运行的 releaseId 重新部署；目前服务端脚本会重新创建同名 release 目录。

## 本地验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-deploy.ps1
bash -n deploy.sh
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\benchmark-deploy-archive.ps1
```

离线测试用 fixture 模拟构建与 SSH/SCP，不触达生产；用真实 Python 解压代码检查 ZIP 兼容性和目录穿越拒绝。
29 项断言覆盖 worktree 缓存标识、指纹失效、缓存恢复与禁用、构建失败、ZIP 内容与解压、服务端校验和 fail-fast、仅打包不联网、上传失败留包、RemoteOnly 和清理路径边界。
基准脚本冻结同一份文件快照，校验每个 ZIP 的完整文件清单与 SHA256；不包含缓存和 `.env`。
可指定 `-Source <staging-directory>`，或通过 `-UploadMegabytesPerSecond <MiB/s>`估算压缩加上传时间。估算不是实测网络传输。

2026-10-05 的实际测试快照：469 个文件、323,018,135 字节，为当前开发构建和静态资源，不是完整生产构建。

| 方法 | 压缩耗时 | ZIP 字节 | 内容校验 |
| --- | ---: | ---: | --- |
| 原 Compress-Archive | 11.855 秒 | 78,745,861 | 通过 |
| .NET Optimal | 8.382 秒 | 78,744,729 | 通过 |
| .NET Fastest | 3.314 秒 | 91,746,158 | 通过 |
| 7-Zip Fast | 0.451 秒 | 81,173,973 | 通过 |
| 7-Zip Optimal（新默认） | 2.186 秒 | 76,867,868 | 通过 |

报告：`D:\Marker\GitHub\outputs\nextjs-archive-benchmark-20261005-complete\benchmark.json`。
测试没有复现先前约 6 分 40 秒的压缩耗时，不能据此断言此前原因或承诺节省 6 分钟。
缓存逻辑经离线测试，但完整应用的冷/热构建收益和线上端到端耗时尚未测量；下一次获授权发布时读取阶段报告验证。

## 首次生产验证（2026-10-05）

已发布 main 的 `619772ca0cb76746a7cc54588d2ed3767a41e784`，releaseId 为 `20261005-224311-619772c`。
业务代码来自独立 worktree，额外带入本轮已验证的发布脚本；其他未提交改动未纳入，未提交或推送代码。

| 阶段 | 实测耗时 |
| --- | ---: |
| 安装依赖 | 30.6 秒 |
| 编辑器回归（43 项通过） | 3.3 秒 |
| AI 回归（153 项通过、7 项实时测试跳过） | 12.2 秒 |
| 生产构建（414 页） | 95.3 秒 |
| 保存编译缓存 | 0.5 秒 |
| 整理文件 | 1.3 秒 |
| 7-Zip Optimal 压缩 | 97.9 秒 |
| 单连接 SCP 尝试（吞吐偏低，主动停止） | 88.6 秒 |
| 分块上传（10 块、每批 5 个连接） | 100.9 秒 |
| 服务端合并和 SHA256 校验 | 0.8 秒 |
| 上传服务端脚本 | 1.6 秒 |
| 服务端部署，含健康检查和旧版本清理 | 20.8 秒 |

发布包 19,871,537 字节，SHA256 为 `892d2d391fe73b2890e3638ea1d8db49dd287075591020ff8a8776ead57c0945`。
这次首次共享缓存未命中，成功保存了编译缓存；尚不能判断下一次构建的实际提速。
生产包约 2,185 个文件，压缩明显慢于上面的 469 文件开发快照，具体原因未定位；不能把快照结果直接外推到生产。
单连接上传约一分钟只有约 2 MB，因此本次使用人工分块传输后走 RemoteOnly；分块传输尚未集成到 deploy.ps1。
从开始检查到 22:54:42 完成线上核验约 12 分 31 秒，包含预检、操作间隔和失败上传尝试，不等于各阶段纯执行耗时之和。

线上 `/next-api/version` 与提交一致，`/next-api/health` 的 app/db 均正常；`/`、`/m`、`/m/preview` 返回 200。
PM2 online、重启次数 0；服务端 `.env` 的 SHA256 与发布前一致，没有更改环境变量。
完整日志、生产包和两阶段报告保存在 `D:\Marker\GitHub\outputs\20261005-224311-619772c\`，build-timings 与 deploy-timings 分开保存，避免 RemoteOnly 覆盖构建报告。
本地临时 worktree 的清理被执行安全策略阻止，保留在 `D:\Marker\GitHub\.release-worktrees\nj-619772c-20261005`，没有绕过限制继续删除；不影响线上部署。服务端上传分块已清理。

## 下一阶段

1. 用真实生产构建测量压缩、缓存恢复成本、编译缓存实际复用效果和传输速度。
2. 检查是否可避免发布 Next.js 时初始化 extension workspace，先验证依赖与生成步骤再调整。
3. 单独评估首页统计的数据库依赖，不牺牲 SEO 静态生成策略。
4. 将构建迁移至有缓存的 Linux CI，保存按提交标识的不可变产物，部署与构建分离。
5. 评估 standalone，验证 Prisma、Sharp、Chromium/PDF、public、.next/static、RELEASE 和环境加载后再上线。

参考：[Next.js 构建缓存](https://nextjs.org/docs/15/app/guides/ci-build-caching)、[standalone 输出](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output)。
