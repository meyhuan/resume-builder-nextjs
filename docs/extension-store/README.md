# 智简网申助手：商店上架工作包

核对日期：2026-09-09。适用版本：0.5.1。

当前状态：本地准备，不代表已经上架、通过审核或完成生产验收。

## 1. 文件用途

- `listing.zh-CN.md`：商店名称、简介、详细介绍和素材清单。
- `privacy-and-permissions.md`：逐项权限理由、数据声明核对表。
- `review-instructions.md`：审核登录待办、可提供给审核人员的测试步骤。
- `qa.md`：本轮实际执行结果与未完成项。
- 网站 `/privacy#extension`：插件专用隐私说明，部署后才能填写为已上线地址。

## 2. 独立打包

在项目根目录执行：

```powershell
pnpm --dir extension run release:chrome
pnpm --dir extension run release:edge
pnpm --dir extension run test:release
```

产物位于：

```text
extension/.output/store/chrome/zhijian-autofill-0.5.1-chrome-store.zip
extension/.output/store/edge/zhijian-autofill-0.5.1-edge-store.zip
```

每个目录的 `store-artifact.json` 包含版本、大小、SHA-256、目标商店与待办项。只上传以 `-store.zip` 结尾的文件，不上传报告、源代码或带开发地址的包。

生成展示素材和执行隔离启动测试：

```powershell
node scripts/capture-extension-store.mjs
node scripts/test-extension-store.mjs
```

素材在 `extension/.output/store/assets/`：3 张 1280×800 图片、`promo-440x280.png`、`icon-128.png`。截图使用真实编译侧栏和合成消息响应，画面已标明“虚构资料·界面状态演示”；不是生产填写成功率证据。构建目录被 Git 忽略，需要在提交商店的电脑重新生成或保留本地文件。

两个商店均使用 Chromium MV3 构建；目录标签不是 Edge 运行时已经验收的证明。上传包根目录必须是 `manifest.json`。代码和第三方许可证随包分发，不带本地 sourcemap 或环境配置。

商店包不带手动版 `key` 或自建 `update_url`，由各商店管理身份和更新。此命令不会修改 `release-identity.json`、网站手动 ZIP、`src/features/extension-guide/release.json`。原 `pnpm --dir extension run release` 仍生成固定 ID 的手动安装版。

## 3. 草稿与 ID 对接

1. 由负责人注册开发者账号并接受条款。首次创建扩展草稿，上传对应 ZIP，但先不提交审核。
2. 分别记录商店实际扩展 ID；不要把商品 URL 中的不透明产品编号当成扩展运行时 ID。最终以安装后的 `chrome.runtime.id` 为准。
3. 服务器 `EXTENSION_ALLOWED_IDS` 支持英文逗号分隔多个 ID。保留现有手动版 ID，将两个经过核实的商店 ID 加入白名单，再重启/重新部署使配置生效。不要照抄以下占位符：

```dotenv
EXTENSION_ALLOWED_IDS=现有手动版ID,Chrome商店实际ID,Edge商店实际ID
```

4. 当前服务端仅接受 `https://<允许的ID>.chromiumapp.org/oauth2`。分别核对两种浏览器实际登录回调；不放开域名通配，不取消 ID 校验。
5. Chrome 草稿可取得公钥，在单独的本地测试副本中对齐商店 ID。不要覆盖手动版 `release-identity.json`。无 key 的解压目录 ID 不代表未来商店 ID。
6. 验证已有网站登录、首次登录、断开、撤销、授权过期、网页权限拒绝/恢复。不因本地包通过而标记商店安装版已通过。

## 4. 提交前门槛

- [ ] 审核人员有可独立使用的测试登录方式。负责人已确认当前没有，属于提交阻塞项。
- [ ] 确认运营主体、联系人及客服邮箱；仅在本人确认后使用现有网站联系方式。
- [ ] 部署并检查公开的指南、隐私政策和审核测试页面。
- [ ] 完成真实 Edge 与 Chrome 的账号连接和填写验收。
- [ ] 核实权限必要性，特别是所有 HTTP/HTTPS 网站的可选访问范围。
- [ ] 对照当前数据处理核实商店勾选项、服务端统计保留期限与删除流程；不得写“零数据收集”或“完全匿名”。
- [ ] 准备真实界面、虚构资料的图标/截图，不泄露账号、Token、第三方个人资料。
- [ ] 上传商店草稿、对齐实际 ID 与服务端白名单。
- [ ] 完成审核测试说明中的全部占位事项后，再点击提交审核。

## 5. 上线与更新

审核通过后，从商店新装一次，验证连接、保存资料后的同步、填写、拒绝权限恢复与投递记录；招聘页面不保存或提交。必要时用仅链接可见/测试分发进行小范围验证。

把 `/extension` 中的安装入口更新为真实 Chrome / Edge 商店链接；暂时保留手动下载入口，不伪造安装链接。手动安装用户不会因为上传商店就自动迁移。迁移前提示用户停用旧插件以避免两个侧栏混淆，并在新版本重新确认连接。后续在同一商店条目上传更高版本，由商店审核及分发更新。

## 官方参考

- [Chrome 上传包要求](https://developer.chrome.com/docs/webstore/prepare)
- [Chrome 发布流程](https://developer.chrome.com/docs/webstore/publish)
- [Chrome 公钥和 ID](https://developer.chrome.com/docs/extensions/reference/manifest/key)
- [Chrome 隐私与权限](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome 审核测试说明](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
- [Edge 发布流程](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [Edge 移植与浏览器验收](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)
