# 岗位定制 V1 数据库上线步骤

仓库首次开始跟踪 Prisma migration。对已有数据库，禁止直接执行 baseline SQL。

1. 备份数据库，并确认当前结构与 `00000000000000_baseline` 等价。
2. 在 staging / production 各执行一次：

   `pnpm exec prisma migrate resolve --applied 00000000000000_baseline`

3. 保持 `JOB_FIT_ENABLED=false`，部署包含新 migration 的版本；部署脚本会执行 `prisma migrate deploy`。
4. 请求 `/next-api/health`，确认 `db` 和 `jobFitSchema` 均为 `ok`。
5. 先通过 `JOB_FIT_ALLOWLIST` 开放内部账号，再将 `JOB_FIT_ROLLOUT_PERCENT` 调整为 5、25、100。
6. 回滚应用代码时保留新增表和枚举，不执行 down migration。

全新数据库无需 resolve，直接运行 `prisma migrate deploy`，会依次应用 baseline 和 Job Fit migration。
