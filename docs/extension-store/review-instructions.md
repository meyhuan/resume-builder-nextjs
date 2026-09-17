# 审核测试说明：提交前必须补齐登录方式

## 当前阻塞项

负责人于 2026-09-09 确认：目前没有审核人员可独立使用、不依赖现场扫码或验证码转发的登录方式。因此本文件暂不能直接提交为完成的审核说明。

不要把数据库密码、管理密码、真实用户会话、长期 Token 或个人微信账号交给审核员。不要开放现有自动化测试接口、共享后台密钥或取消生产鉴权来绕过登录。

建议后续单独设计正式的邮箱验证登录/邀请制测试账号能力：使用正常身份与插件授权流程、账号级权限隔离、仅合成资料、限流与撤销能力。不是伪装成已登录的演示模式，也不是给审核员隐藏另一套行为。涉及身份系统修改，需另行确认实现范围后开发。

## 发布者准备

- [ ] 安全地提供审核人员能独立使用的测试登录方式，并亲自在未登录浏览器走通。
- [ ] 在该测试账号预置虚构的网申资料（如“测试用户”、`review@example.com`），不使用真实身份证和健康信息。
- [ ] 部署 `public/extension-review.html`，检查 `https://aijianli.cn/extension-review.html` 无需登录可打开。
- [ ] 将商店实际扩展 ID 加入服务器白名单，验证授权回调。
- [ ] 告知审核人员填写可能在测试账号创建“待投递”记录；不要调用真实招聘公司的保存/提交。

## 给审核人员的中文步骤（登录信息另填在商店私有测试栏）

1. 使用提供的测试登录方式进入 https://aijianli.cn 。
2. 打开 https://aijianli.cn/dashboard/application-profile ，查看测试资料已保存。仅使用虚构资料。
3. 打开扩展侧栏，阅读首次使用说明并选择“同意并开始使用”。网站登录有效时，插件应尝试自动连接；否则按提示完成登录并重新检测。
4. 打开 https://aijianli.cn/extension-review.html 。这是普通 HTML 表单，没有提交或自动保存逻辑，不是招聘公司的真实申请。它不绕过插件账号登录。
5. 点击“一键填写此页面”，按浏览器提示授权网页访问。检查已有测试姓名保持不变、空白邮箱/电话等按资料填写，并查看填写数量。
6. 再次填写，检查已有值不被覆盖。清空测试页可点击页面“重新开始”，刷新仅丢弃该页输入。
7. 重新加载测试页不会保留输入。插件可能已在智简简历测试账号创建“待投递”记录；这与测试页没有自动保存不冲突。不要点击“我已完成投递”，除非专门测试状态变更。
8. 拒绝网页权限时应显示说明；允许后可以重新检测。在商店/浏览器设置页应解释不能填写。
9. 在网站的插件授权管理中撤销连接，再尝试读取资料应要求重新授权。不能继续读到新的账号资料。

示例页只验证通用文本框、下拉和保留已有值，不代表腾讯、淘天等复杂网站兼容性均通过。

## English reviewer notes (complete access details before submission)

This extension fills recruitment forms using a profile saved in the user's Aijianli account. It does not submit job applications. A working, independently usable test sign-in method must be provided in the private test instructions before submission; it is not available yet.

After signing in to https://aijianli.cn with the supplied test access, open `/dashboard/application-profile` and check the synthetic saved profile. Open the extension side panel, read and accept the onboarding disclosure, and allow it to connect. Open https://aijianli.cn/extension-review.html and click “一键填写此页面” (Fill this page). Grant site access if requested. Existing values should remain; matching empty controls can be populated from the saved profile. Check the fill summary and repeat to check preservation of existing values.

The test page has no save or submit behavior. The normal extension may create a draft application record in the synthetic test account and send account-linked, value-free fill metrics. Do not submit applications to third-party employers. Refresh the test page to discard its input. This fixture demonstrates generic controls, not guaranteed support for every recruitment site.

参考：[Chrome 审核测试说明](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)。
