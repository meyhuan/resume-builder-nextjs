# 网申助手 0.5.0 发布验收

工作分支：`codex/application-autofill`。本文件是验收状态，不代表已经上线。

## 当前已完成

- [x] 独立生产构建：`pnpm --dir extension run release`，强制 https://aijianli.cn，输出到 `.output/release`，不覆盖开发包。
- [x] 发布清单固定公钥与 ID：`eokmcmmadffnejmkmpfgipahenelpmbl`。开发包保留原有路径 ID。
- [x] 自动检查版本、生产地址、权限、必要资源、安装说明；拒绝本地地址、源码测试文件、私钥/数据库连接配置；生成 ZIP SHA-256。
- [x] 原始 MIT 第三方声明随包分发。
- [x] 隔离 Chromium 127 全新配置加载实际发布包，验证 ID、后台启动、首次说明与 Logo，不访问用户浏览器配置、不授权登录/主机权限。
- [x] 修复上述实测发现的 WXT 包装层缺少 setAccessLevel 导致后台崩溃问题，使用可选的原生 Chrome API。
- [x] 授权码条件更新：并发兑换只有一个成功；严格校验回调来源、路径和 PKCE。
- [x] 本地统计队列：仅已连接且完成首次说明后记录，剔除正文；7天/100条上限，定时重试，账号隔离，断开清理。
- [x] 服务端按用户+事件 ID 去重，落库成功才返回204；Java旧统计后台转发为次级通道。
- [x] 测试数据库迁移 `202609060001_extension_telemetry` 已完成，无重置或修改简历数据。
- [x] HTTP→实际测试数据库→管理员查询验证成功；并发重试只留1条，正文被丢弃，撤销授权后401。仅清理本轮合成测试账号及其数据。
- [x] `/admin/extension-metrics` 按站点/版本展示效果；已有值不计入新增填写成功率。使用合成数据截图验收，非真实用户成功率。
- [x] 网络请求超时有中文提示；投递记录同步失败不会丢弃已经验证的填写结果。
- [x] 本地生产构建→真实测试数据库授权验收：匿名回调307/login_required；并发兑换200/400且只创建1条授权；重放、错误PKCE、过期码拒绝；过期/撤销Token读取资料401。本轮合成账号与授权码已清理，未读取真实资料。
- [x] 统计后台拒绝null、数组、非法JSON、超大请求与非数字时间范围；新增5项测试，服务端共17/17通过。包含该修复的生产构建重新通过（413页，退出码0），实际启动后HTTP复验400/413/403均符合预期。
- [x] 隔离Chromium执行实际通用引擎：普通及14层嵌套合成页面均从1条新增到4条，12个字段按记录顺序填写，二次执行新增0条/写入0项/保留12项，保存与提交均为0。原生日历默认留空，合成资料明确允许后补为1日；不等同于真实网站日历验收。
- [x] 网申资料/投递管理可靠性修复与生产构建浏览器回归完成：真实测试数据库保存、同步、刷新、插件读取、状态/备注/时间及删除；网页撤销授权后插件读取401。范围及会话/故障注入边界见 `docs/application-pages-release-qa.md`，不替代生产登录与数据库稳定性验收。

## 尚未完成的发布门槛

- [x] 网站生产构建完成（413页生成，退出码0）；存在原有 Hook/Browserslist 提醒，构建期公共站点统计读取测试数据库失败后降级，不能据此宣称数据库稳定。
- [ ] 腾讯、淘天空白草稿完整验收：自动新增足够的经历、不串行、不覆盖已有内容、不触碰保存/提交。
- [ ] 真实日历确认补日与“记住/重置”浏览器验收；当前只验证了默认提示/保持空白，补日驱动有自动化测试。
- [ ] 生产或同构预发布环境中的已登录网站→新装插件自动连接、退出/撤销/过期处理。
- [ ] 线上部署对应后端与数据迁移，并配置固定发布 ID。只读探测线上 `/next-api/extension/silent-authorize` 当前返回404，不能直接分发包。
- [ ] 上线前由目标部署环境验证资料、投递、统计接口和数据库稳定性。
- [ ] 人工确认最终分发与服务端部署，不擅自发布。

## 测试命令与产物

```text
pnpm --dir extension run test
pnpm --dir extension run typecheck
pnpm --dir extension run test:release
pnpm exec vitest run --config scripts/vitest.extension-server.config.ts
pnpm run test:application-autofill
pnpm run typecheck
pnpm run build
pnpm --dir extension run release
node scripts/test-extension-package.mjs
node scripts/test-extension-metrics-ui.mjs
node scripts/test-extension-engine-browser.mjs
node --env-file=.env scripts/test-extension-auth-live.mjs <明确的测试数据库主机>
node --env-file=.env scripts/test-extension-telemetry-live.mjs <明确的测试数据库主机>
```

真实统计测试必须连接本地测试服务器，设置 `EXTENSION_TELEMETRY_FORWARD_ENABLED=false`，避免合成事件进入外部 Java 分析系统。脚本不打印密码/Token，仅创建并清理唯一前缀测试账号。数据库不得指向生产。

- 发布包：`extension/.output/release/aijianliapplication-autofill-extension-0.5.0-chrome.zip`
- 包校验信息：`extension/.output/release/release-artifact.json`
- 全新安装截图：`test-artifacts/extension-release/fresh-install.png`
- 管理后台合成数据截图：`test-artifacts/extension-release/metrics-desktop.png`
- 通用引擎四条合成经历截图：`test-artifacts/extension-release/synthetic-four-experiences.png`

## 运营查看方式

部署后访问 `/admin/extension-metrics`，使用现有管理员认证，选择最近1/7/30/90天。
以 `extension_fill_result` 为唯一统计入口，不把 start/complete/partial 等伴随事件重复相加。
写入成功率 = 新增填写 /（新增填写 + 写入失败）；未识别、资料缺项、已有值另外展示。
单次查询最多读取最近10000次，超限有明确提示。上报受用户离线、撤销或队列过期影响，不等同全体用户的绝对使用量。

## 服务端部署步骤（需发布负责人执行/授权）

1. 确认生产 User/Resume 基础表存在，备份数据库；不要使用 reset 或破坏性 db push。
2. 配置 DATABASE_URL、APPLICATION_PROFILE_ENCRYPTION_KEY、ADMIN_PASSWORD，以及原有认证/Java接口环境变量。加密密钥必须稳定保留，不要生成新密钥覆盖已有加密资料。
3. 将 `eokmcmmadffnejmkmpfgipahenelpmbl` 追加到 `EXTENSION_ALLOWED_IDS`，保留仍需使用的旧 ID；不要放开任意 ID。
4. 核对 `prisma migrate status` 后执行所需迁移，部署当前分支网站代码与生成的 Prisma Client。
5. 验证匿名静默授权返回登录提示而不是404/400；再通过已登录浏览器实际检查免二次登录流程。
6. 全部验收通过后再把 ZIP 放到官网供用户下载。手动安装说明随包提供；这种分发不自动升级。

固定ID参考：[Chrome 官方 key 说明](https://developer.chrome.com/docs/extensions/reference/manifest/key)。当前公钥只用于手动加载包的稳定ID；没有保存私钥或用于CRX签名。若以后上架商店，需按商店分配的公钥/ID重新规划迁移，不能默认沿用。
