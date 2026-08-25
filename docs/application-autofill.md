# 网申自动填充与投递管理

## 数据流

1. 用户在 `/dashboard/application-profile` 选择默认简历并补充网申资料。
2. 服务端用 `APPLICATION_PROFILE_ENCRYPTION_KEY` 加密资料正文。
3. 用户首次确认隐私说明后，扩展通过 `/next-api/extension/silent-authorize` 静默复用网站登录态，并用 PKCE 换取独立 Token，不读取网站 Cookie。
4. 用户点击扩展后，扩展扫描当前标签页的可见表单控件。
5. 后台脚本用静态中英文别名字典映射字段，只将命中的值发送给页面脚本。
6. 至少填写一个字段后创建 `DRAFT` 投递记录；用户确认提交后更新为 `APPLIED`。

## 登录体验

- 首次打开只展示一次用途与隐私说明。
- 如果智简简历已经登录，确认后自动连接，不需要再次扫码或打开授权页。
- 如果尚未登录，插件打开登录页并在两分钟内自动检测登录结果；登录成功后无需再次确认授权。
- Token 到期后优先静默续接；网站登录也失效时才提示重新登录。
- 用户主动断开后关闭自动连接，直到再次手动启用。

## 本地开发

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
- 不自动新增教育、工作或项目经历行。
- 不收集完整网页、浏览历史或未命中的表单内容。
