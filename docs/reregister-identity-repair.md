# 注销后重新注册的身份恢复

## 事故与处理

2026-10-20，Java 用户 363080 注销后，同一微信身份重新注册为 371915。
Next.js 原用户仍引用已删除的 363080，触发身份冲突。
已在生产事务中将原 Next.js 用户的 javaUserId 更新到 371915；
修改前保存私有备份，修改后比较全部 23 份 Resume 的完整内容，确认无变化。

## 修复行为

统一入口 syncUserIdentity 遇到旧关联冲突时，向 Java 的只读
POST /user/identity-relink-check 请求证明。服务端同时确认：

- 旧 Java 用户不存在。
- 新 Java 用户存在，unionid 或 openid 与登录键完全相同。
- 该微信标识在 Java 库中只有一个拥有者。
- 数字兜底登录键不允许用于证明。

Next.js 还要求新 Java ID 没有被其他网页账号占用，并使用旧 ID 作为
updateMany 条件进行并发比较更新。仅修改 javaUserId；用户主键、登录键、
简历、配额等关联数据保持不变。不合并两个已有网页账号。
错误响应、超时、证明缺失均继续拦截，不因查不到接口而认定账号已删除。

Java SSO verify 同时拒绝为已删除用户签发身份，防止注销前生成的票据复活旧关联。
本次不改变账号注销的数据保留政策，也不迁移旧 Java 账号会员或订单。

## 发布

先发布 backend-reregister-identity 中的 Java 改动，再发布本分支的 Next.js 改动。
无数据库 schema 变更。Java 接口未发布时，Next.js 保持原有冲突拦截。
观察 Next.js 日志中的 `[identity-relink]`，其中记录旧、新 Java ID 和原网页用户 ID。
生产尚未发布此代码；371915 的单用户修复已独立完成。

## 验证

- `node node_modules/vitest/vitest.mjs run --config scripts/vitest.identity.config.ts --silent`：28 项通过。
- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- Java：`mvn -q "-Dtest=IdentityRelinkControllerTest,SsoDeletedAccountTest" test`：9 项通过。
- 两个 worktree 的 `git diff --check`：通过。
- 原配额身份测试仍假定旧额度 5 次；主目录中复现相同失败后，改为读取当前配置
  设置边界测试数据，继续检验达到上限时拒绝扣费，而不修改实际额度。
- 未在生产部署通用修复，未代替用户进行微信客户端点击验收。
