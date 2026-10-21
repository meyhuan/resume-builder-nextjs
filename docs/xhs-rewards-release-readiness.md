# 小红书分享奖励发布验收（2026-10-21）

本轮完成代码修复与本地发布验收，未上传或重启线上服务，未向真实账号发放奖励。

## 最终行为

- 奖励档位、浏览/互动门槛、48 小时时长、最多获奖次数均从 Java 配置透传。30/60 天是单篇累计奖励，基础7天→30天补23天，30→60天补30天；不展示为7+30+60。
- 活动关闭、次数用尽、存在待审笔记、资格回收、登录失效或状态读取失败时禁用提交。状态错误提供明确提示与重试按钮。
- 提交抽屉内展示失败原因并保留链接；有标题关联、输入标签、焦点限制、Escape关闭、滚动限制，小屏可滚动。
- 本人被驳回的同一篇笔记可重新送审，复用原记录与ID；跨账号和已通过笔记仍去重。重提预填原链接。看板展示全部历史记录。
- 看板初次加载、点击刷新、窗口重新获得焦点、页面重新可见时查询状态；页面可见时每60秒刷新，避免并发重复查询。
- 进阶奖励为**审核员核验后补发**。后台填写从公开笔记核验的实际发布时间（北京时间），后端验证发布满配置时长后才允许补发，首次成功保存后保留该时间，后续补发不能重新改写时间。提交时间不再冒充发布时间。
- 提交/审批/补发等变更按同一账号锁串行执行；审批时重新检查上限。先查标量owner，再锁用户，再加载并锁笔记，避免实体缓存旧状态；事务采用READ_COMMITTED，等待锁后按最新已提交的获奖数量校验。
- 状态查询只读，不再因为轮询而创建邀请码。后台令牌未配置时拒绝访问；审核口径统一为正文或首评自然提及工具，不再要求额外口令。指标禁止负数，互动汇总用long防止int溢出。
- BFF增加超时、无效JSON/超长输入校验，账户查询异常返回受控JSON。原有选图、AI草稿与复制/下载行为保留。

## 已执行检查

| 检查 | 结果 |
| --- | --- |
| `pnpm exec vitest run --config scripts/vitest.xhs-note.config.ts` | 11文件 / 60项通过 |
| `pnpm typecheck` | 通过 |
| 本轮前端/BFF/后台文件 ESLint | 0 errors |
| `pnpm build` | 通过；425个页面完成生成；已有2条无关Hook警告不阻塞 |
| Java `./mvnw.cmd '-Dtest=XhsNoteRewardTest,XhsNoteApprovalTest,XhsNoteLifecycleTest,XhsNoteControllerTest' package` | 22项测试通过，JAR打包成功；结果见后端target/xhs-review/release-package.log |
| `pnpm story:verify-rewards` | 对最终生产构建通过；11组检查，含多屏宽、抽屉报错、成功送审、刷新审批、历史驳回重提、关闭/次数/资格/登录/网络边界、后台发布时间与补发差额 |
| `pnpm story:verify` | 对最终生产构建通过；原有选图、12组素材、AI异常、草稿恢复、原图字节下载及复制回归 |
| 本地后台令牌配置一致性 | 已核对一致，仅比较结果，不输出密钥 |

截图与逐项浏览器报告：`outputs/xhs-rewards-release/`；构建日志`build.log`；旧分享回归报告`outputs/story-sharing-ui/sage-release-v3/e2e-report.json`。

## 发布顺序与数据库

1. 只发布审批确认的改动，从隔离worktree构建；当前工作区还有其他用户改动，不应直接整仓上线。
2. **先发布Java，再发布Next.js**。前端依赖新的`/xhs-note/admin/config`以及状态返回的`bonusAfterHours`、`tier1Engagement`、`blocked`字段。后台令牌和Next的`XHS_ADMIN_TOKEN`应保持一致；缺失令牌会拒绝审核请求。
3. Java实体新增nullable `tb_xhs_note_submission.published_at` DATETIME字段。仓库生产配置为`spring.jpa.hibernate.ddl-auto=update`；按现有流程启动新Java版本时应更新该字段，并检查启动日志。若目标环境禁用自动DDL，应在发布窗口由数据库维护流程添加该列（只在列不存在时执行）：

   ```sql
   ALTER TABLE tb_xhs_note_submission ADD COLUMN published_at DATETIME NULL;
   ```

   无需回填猜测的发布时间；旧记录在首次补发前由审核员填写真实发布时间。回滚旧版本时可保留这个nullable列。
4. 同步发布Next.js；随后在测试账号完成提交→管理员通过→基础VIP到账→核验满48小时数据→只补差额→用户看板更新的真实联调，核对数据库会员到期时间和审核记录。

本轮浏览器接口与Java仓库均使用mock进行验证，未执行生产数据库迁移、真实会员到账或MySQL并发压测。因此“构建/测试通过”不等同于“已上线验收通过”。本地3000端口当前运行最终生产构建，便于检查页面。
