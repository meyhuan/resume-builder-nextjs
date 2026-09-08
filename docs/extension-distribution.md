# 网申助手入口与分发

## 用户路径

- 工作台侧边栏底部「帮助与反馈」→ 插件安装与使用（外链图标，新标签页打开）。主导航只保留我的简历、网申资料、投递管理。
- 网申资料页 → 安装与使用插件；无连接授权时显示使用说明。
- 投递管理页 → 用插件填写网申。
- 以上引导入口在新窗口打开 `/extension`，不带走正在编辑的页面。
- 安装指南无需登录，包含下载、Chrome / Edge 安装、资料维护、填写与确认投递、更新和常见问题。

## 正式安装包

### 0.5.1：填写按钮禁用原因与权限恢复

- 修复首次使用或切换站点后，URL 因未获权限被 Chrome 隐去，导致填写按钮禁用、无法触发授权的闭环。
- 显示网站权限不足、无活动标签页、受限制页面、页面加载中、状态检测失败等原因；提供明确的授权 / 重新检测入口。
- 授权后只重新检测，不自动填写或提交。拒绝授权的提示不会被定时刷新清除。没有扩大 manifest 的默认权限，也没有加入 `tabs` 全标签页读取权限。
- 状态消息异常或 12 秒超时显示重试，避免无提示禁用或一直加载。
- 101 项插件测试、类型检查通过；实际正式包在隔离 Chromium 中复现 URL 被隐藏的情形并验证提示和恢复入口。授权成功 / 拒绝的 UI 路径使用模拟权限测试；另覆盖等待授权时重复点击、等待授权时切换标签页不误填、页面加载结束后恢复。未在用户正式账号中授权、填写或提交。

手动安装用户需把新包解压后的文件替换到原插件目录，再在 `chrome://extensions/` 点击该插件的重新加载，确认版本为 0.5.1；关闭旧侧栏后重新打开。仅更新网站服务器不会自动更新已手动安装的插件。

发布后还要验证公开下载地址返回 ZIP 且 SHA-256 与 `src/features/extension-guide/release.json` 一致；本地构建通过不等于线上可下载。如果新版本下载返回 404，检查 `public/downloads/extension/` 是否随部署上传、静态资源路由和 CDN 缓存。本轮公开地址检查时 0.5.1 返回 404，尚未完成线上分发验收。

2026-09-08 继续回归：插件 101 项测试、插件类型检查、实际发布包隔离浏览器测试均通过。本地已解压 0.5.1 目录通过发布配置校验，没有修改该目录。指南补充灰色按钮的排查说明，但本轮指南视觉回归未通过：本地 Next 服务的 `/_next/static/css/app/layout.css` 返回 404，导致无样式页面横向溢出；未修改服务或部署配置，不将这次视觉测试计为通过。

运行 `pnpm --dir extension run release`。

此命令先构建正式插件并校验固定 ID、正式域名、资源完整性与敏感配置，再把 ZIP 同步到 `public/downloads/extension/`，生成 `src/features/extension-guide/release.json`。
提交这两个产物并随 Next 应用部署。不要拿 `.output/chrome-mv3` 的本地测试包替换网站下载包。

下载界面校验 SHA-256 后才启动下载。下载就绪仅代表文件获取和校验完成，不代表安装、连接或填写成功。
发布时还需在正式服务器配置插件 ID 白名单、资料加密密钥和所需数据库表，并完成真实浏览器验收。安装指南不会绕过授权或改变这些配置。

## 统计

沿用网站的 analytics 通道，新增以下事件；只带固定入口、操作、浏览器选项及版本，不带简历字段：

- `extension_guide_open`：资料页 / 投递页进入指南。
- `sidebar_nav_click`：侧边栏入口，`itemKey=extension`。
- `extension_guide_view`：指南展示。
- `extension_guide_action`：切换浏览器、复制地址、打开资料 / 投递管理。
- `extension_download_start` / `extension_download_ready` / `extension_download_failed`：下载请求、获取并校验通过、失败。

这些是网站侧事件，不等同于插件 `extension_connect_success` 或填写埋点；不把下载数量当成安装数量。
网站统计服务若配置了事件白名单，需要同步允许新增事件；本地 UI 测试不证明生产统计已入库。

## 本地回归

启动本地服务后执行 `node scripts/test-extension-guide.mjs`。测试只读取静态下载包，浏览器中的所有 API 都使用合成响应，不修改账号数据。
截图输出到 `test-artifacts/extension-guide/`。

侧边栏调整后可执行 `node scripts/test-sidebar-extension-entry.mjs`。2026-09-08 回归通过：帮助分组位置、新名称与外链图标、新标签页保留原页面、无当前页面选中态、44px 点击区域、900 / 480 / 320px 桌面高度与 390 / 320px 移动宽度。侧栏在低高度下整体滚动，帮助入口与账号区域都可访问。测试使用合成接口响应，不修改账号数据。

## 安装截图维护

指南包含 Chrome 安装入口、网站资料页、插件侧栏三张真实 UI 截图，带编号标注与原尺寸放大。目录结构另以文字示意；Edge 选项明确说明图片是 Chrome 参考，不冒充 Edge 实拍。

截图文件：`public/images/extension-guide/`；标注位置：`src/features/extension-guide/screenshots.json`。
更新界面后，在本地服务运行、正式插件构建完成时执行 `node scripts/capture-extension-guide.mjs`，再运行指南回归。脚本使用全新的临时浏览器和虚构资料，插件截图通过模拟消息展示连接态，不安装扩展、不接受真实授权、不连接真实账号、不写数据库。不要用含有用户资料或其他个人扩展的截图替换。

截图放大支持鼠标点击、键盘操作、Esc 关闭与焦点恢复；窄屏原图可独立横向滚动。图片加载失败时保留文字指引。

截图版回归已覆盖三张图片实际加载、五个屏幕宽度、移动端放大和原图滚动、关闭按钮 / Esc、恢复到实际触发按钮、图片 404 的文字降级提示，以及原有下载与复制流程。`test-artifacts/extension-guide/zoom-mobile.png` 为窄屏放大验证截图。

### 2026-09-07 验证结果

- `pnpm --dir extension run release`：通过，生成并校验正式版 0.5.0 安装包。
- `pnpm exec tsc --noEmit --incremental false`：通过。
- `pnpm exec vitest run --config scripts/vitest.application-ui.config.ts`：10 项通过，包含指南新窗口入口与未保存资料保护。
- `node scripts/test-extension-guide.mjs`：通过，覆盖公开访问、真实 ZIP 校验、320 / 375 / 414 / 768 / 1440px 布局、浏览器切换、复制失败与恢复、HTTP 失败、损坏安装包拒绝、重试与常见问题展开。
- `node scripts/test-application-profile-ui.mjs`：通过，合成资料同步、刷新、中文日期、补全、保存失败重试与移动布局。
- `node scripts/test-application-ui-guards.mjs`：通过，投递筛选取消、未保存关闭保护、重复点击去重及三个宽度下的日期浮层。
- 尚未验证：正式部署后的下载、生产统计入库、用户真实安装至填写的完整链路。没有部署、修改账号数据或提交招聘申请。
