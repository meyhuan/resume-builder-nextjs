# 数据库文章与 ISR

AI 工具写作与入库请先阅读 [AI 文章草稿与确认发布流程](ai-article-workflow.md)：默认保存草稿，展示完整内容和版本，由用户明确确认后发布。

## 使用入口

- `/admin/articles`：使用现有管理员登录，创建 Markdown 文章、预览、保存草稿、发布、更新发布、下架。
- `/articles`：公开列表及分类；数据库已发布文章与旧 JSON 攻略合并展示。
- `/articles/[slug]`：服务器输出完整正文、SEO metadata 和 Article JSON-LD，新链接首次访问时生成并缓存，无须重新打包。
- 首页推荐、岗位模板相关文章和 `/sitemap.xml` 同步使用公开文章数据源。

新文章发布后无需构建。**首次引入这套功能仍需要一次数据库迁移和代码部署。** 本次代码实现没有执行生产迁移或发布。

## 首次启用

1. 先在测试数据库验证迁移，再按现有数据库发布流程应用 `prisma/migrations/202611080001_articles/migration.sql`。已经由 Prisma Migrate 管理并完成基线登记的数据库可运行 `pnpm exec prisma migrate deploy`。该命令会执行全部待应用迁移，必须先核对状态；现有 `deploy.sh` 只生成 Prisma Client，不会自动迁移。
2. 对于历史上使用 `db push`、未完成迁移基线登记的数据库，不要直接运行全部迁移。由数据库维护流程应用本次 SQL 并正确登记迁移状态。**只运行 `db push` 不够**：它不会创建本次的更新时间触发器或 RLS。
3. 构建和运行环境均设置 `ARTICLE_DATABASE_ENABLED=true`，数据库连接沿用 `DATABASE_URL`；连接账号须拥有 Article 表的读写权限。Supabase 应使用服务器数据库角色，不能使用公开 anon 客户端。
4. `pnpm exec prisma generate`，完成构建并按项目发布指南部署。该功能开关在构建与运行时保持一致；默认未启用时沿用旧 JSON 内容，后台明确提示未配置，不会访问新表。
5. 在后台新增一篇唯一链接的测试文章，先验证草稿在前台为 404，再发布、更新、下架；检查正文、metadata、sitemap 和前台缓存。建议先访问不存在的测试链接，验证发布后负缓存也被清除。

发布遵循 `docs/nextjs-deployment-optimization.md` 和 `../RELEASE_GUIDE.md`，使用获批准提交的独立 worktree。没有明确部署请求时不上传、不重启、不执行生产迁移。

## Table Editor 写作

Supabase 的 `public.Article` 可以直接新增记录：

| 字段 | 填写方式 |
| --- | --- |
| `id` | 留用数据库默认 UUID，无需手工生成 |
| `slug` | 唯一链接，例如 `interview-preparation`；小写字母、数字、中文、短横线，最长 100 字符 |
| `title` | 标题，最长 200 字符 |
| `summary` | 摘要，最长 1000 字符 |
| `content` | Markdown 正文，最长 100000 字符；不支持嵌入 HTML |
| `category` | `resume-writing` / `fresh-graduate` / `interview-tips` / `career-guide` |
| `tags` | 字符串数组，默认 `[]`，最多 20 个标签，每个不超过 40 字符 |
| `status` | 默认 `DRAFT`；上线时改为 `PUBLISHED` |
| `createdAt` / `updatedAt` | 使用默认值，更新时数据库触发器维护 `updatedAt` |

后台会验证这些长度和格式；直接写数据库时也应遵守。不要修改已发布文章的 slug，否则旧链接会失效（没有自动重定向）。

Table Editor 不会主动通知 Next.js。保存后可以到 `/admin/articles` 点击“刷新前台缓存”，否则等待定时再验证。直接变更数据无需重启或重打包。

## 缓存语义

- Prisma 查询使用 `unstable_cache`，`revalidate: 60`，共享 tag `published-articles`；服务器同一渲染中的读取通过 React cache 去重。
- 文章详情返回空 `generateStaticParams`，允许新 slug 运行时生成；HTML 与 sitemap 的再验证间隔为 60 秒。
- 列表因读取查询参数使用服务端动态渲染，内容查询仍复用 60 秒数据缓存，首屏包含文章链接和摘要。
- 后台保存后，先失效数据 tag，再失效文章列表、全部详情（包括旧 404 和相邻文章链接）、sitemap、首页和岗位模板页。
- `revalidatePath` 是使缓存失效，**在后续访问时生成**，不是点击保存就预先渲染所有页面。定时 ISR 是请求触发的后台再生成；可能先返回旧页，不能承诺保存后 1 秒、或严格 60 秒内所有访问都已更新。
- Table Editor 下架同样受缓存窗口影响；需要及时隐藏时使用后台下架或刷新缓存。
- 数据库读取失败会抛错，避免用缺失数据库文章的结果覆盖已有成功缓存。已有 ISR 页面可继续使用最后成功内容；首次访问无缓存时可能失败，需要恢复数据库连接。
- 当前实现适合现有单实例 Next.js 部署。多实例各自持有缓存时，需要共享缓存或向所有实例广播失效。CDN 若额外缓存 HTML/XML，也需配置一致的缓存与清除策略。

官方语义：[Next.js 15 generateStaticParams](https://nextjs.org/docs/15/app/api-reference/functions/generate-static-params)、[revalidatePath](https://nextjs.org/docs/15/app/api-reference/functions/revalidatePath)。HTML 可供爬虫抓取不等于保证抓取、收录时间或排名。

## 旧文章与安全

- 保留 JSON 攻略，不做破坏性批量迁移；原链接继续有效。
- 相同 slug 的数据库记录覆盖旧文章。即使该记录是草稿，也会隐藏同 slug 的旧文章，避免下架后旧版本重新出现。通过后台下架而非物理删除保留覆盖关系。
- 后台每次读取、保存和刷新都在服务器验证管理员密码，响应 `no-store`。前端登录状态不代替接口鉴权。
- 编辑使用 `updatedAt` 版本比较，冲突返回 409，防止覆盖别人或 Table Editor 的修改；创建重复 slug 返回 409。
- Markdown 禁用原始 HTML，并过滤危险链接协议；JSON-LD 转义 `<`，避免正文标题等数据闭合 script 标签。旧仓库 HTML 仍按原可信内容方式渲染。
- 新表开启 RLS，无公开策略；浏览器不直连 Article 表。
- 当前使用轻量编辑模型：修改已发布文章时，点击“更新发布”直接更新线上；点击“下架并保存草稿”会下架原文。没有“线上旧版本与待发布草稿并存”的版本管理。
- 若保存成功但缓存刷新异常，后台返回“已保存”的提示及刷新建议，避免误认为保存失败而重复创建。

## 本地验证

```powershell
pnpm exec vitest run --config scripts/vitest.articles.config.ts
pnpm exec tsc --noEmit
pnpm exec next build
```

专项测试使用 mock 验证接口与数据源，使用真实内存 PostgreSQL（PGlite）执行 SQL 迁移并验证 UUID 默认值、唯一链接、草稿默认值、更新触发器和 RLS。不会访问生产数据库。

### 2026-11-08 验证记录

| 检查 | 结果 |
| --- | --- |
| `pnpm exec vitest run --config scripts/vitest.articles.config.ts` | 5 个测试文件、20 项测试全部通过；含后台读取、下架、编辑冲突和配置错误交互 |
| `pnpm exec tsc --noEmit` | 通过 |
| `pnpm exec prisma validate` | 通过 |
| 本次业务变更文件的 `pnpm exec eslint` | 通过 |
| `pnpm exec next build` | 最终通过，307 个静态页面生成完成；初次构建的首页未使用变量错误已修复 |
| `git diff --check` | 通过 |
| `pnpm exec next start -p 3107` + HTTP 验证 | sitemap 200、文章 200、分类列表 200、不存在文章 404、未授权管理接口 403 |
| 运行时按需生成及缓存 | 文章未在构建时预生成，首次响应 `x-nextjs-cache: MISS`，再次访问 `HIT`；去掉 script 后仍有文章正文和标题，原响应包含 JSON-LD |

限制与未执行项：

- 本轮生产构建和 HTTP 验证使用默认关闭的数据库开关，验证旧文章兼容和真实 Next.js ISR。启用状态的数据源、发布接口和缓存失效逻辑由 mock 测试覆盖，SQL 由 PGlite 实际执行。
- 本机对现有 Supabase 的连接不可达，首页统计构建时采用原有回退逻辑；未执行真实 Supabase 的新增、更新、下架端到端测试。
- 本机首次 `prisma generate` 遇到 Windows 引擎 DLL 被占用的 EPERM；随后使用临时输出目录成功生成客户端。正式部署仍需正常执行客户端生成。
- 构建有项目已有的浏览器兼容数据过期提示、Next ESLint 插件提示，以及 `LandingTemplates` 的 Hook 依赖警告；没有遗留阻断构建错误。
- 没有执行生产数据库迁移、发布、提交或推送代码；未修改已有其他 worktree 的用户改动。

结论：代码与本地验证完成。首次上线须按上述流程应用 SQL、启用环境开关并部署，再对真实数据库进行发布验收。此后日常增改文章不需要重新构建。
