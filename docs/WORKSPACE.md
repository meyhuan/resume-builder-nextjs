# 智简简历 (aijianli.cn) — 工作空间全局说明

> 本文档供 AI 辅助开发时快速理解项目整体架构与各模块关系使用。

---

## 一、项目概述

**智简简历**是一个面向中国求职者的 AI 简历构建平台，包含：
- 微信小程序（创建/编辑简历）
- 网页端（AI 辅助简历编辑器，Next.js）
- Java 后端（统一 API、微信支付、SSO）
- H5 支付页（微信内嵌支付）

---

## 二、项目列表与路径

| 项目 | 路径 | 技术栈 | 说明 |
|---|---|---|---|
| **aijianli-backend** | `d:\Marker\GitHub\aijianli-backend` | Spring Boot 2.5, MySQL, JPA | 核心后端，所有业务逻辑 |
| **mini-aijianli** | `d:\Marker\GitHub\mini-aijianli\miniprogram` | 微信小程序原生 JS | 小程序前端 |
| **resume-builder-nextjs** | `d:\Marker\GitHub\resume-builder-nextjs` | Next.js 15, React 19, TailwindCSS v4, Prisma (PostgreSQL) | 网页端编辑器 |
| **aijianli-h5-pay** | `d:\Marker\GitHub\aijianli-h5-pay` | React + Vite, TailwindCSS | 微信内嵌 H5 支付页 |

---

## 三、架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户入口                                        │
│                                                                             │
│   微信小程序 (mini-aijianli)         网页端 (aijianli.cn)                    │
│        │                             resume-builder-nextjs (Next.js)        │
│        │                                        │                           │
│        │ wx.request → Java API                  │ /next-api/* (BFF 层)      │
│        │                                        │        │                  │
│        │ webview SSO → /m/sso → auth_uid cookie │        │                  │
│        └─────────────────┬──────────────────────┘        │                  │
│                          │                               │                  │
│                          ▼                               ▼                  │
│          ┌───────────────────────────────────────────────────┐              │
│          │         Java 后端 (aijianli.cn/api)                │              │
│          │         aijianli-backend (Spring Boot 2.5)         │              │
│          │                                                   │              │
│          │  /user/*          小程序用户登录/注册               │              │
│          │  /cvstore/*       网站用户登录/VIP查询              │              │
│          │  /sso/*           跨平台 SSO (issue/verify)        │              │
│          │  /pay/*           微信支付                          │              │
│          │  /resume/*        简历 CRUD + 迁移导出              │              │
│          │  /invitation/*    邀请码系统                        │              │
│          │  /api/vip/configs VIP 套餐配置                     │              │
│          └───────────────────────┬───────────────────────────┘              │
│                                  │                                          │
│                            MySQL (tb_user, tb_cvuser, ...)                  │
│                                                                             │
│          ┌───────────────────────────────────────────────────┐              │
│          │  aijianli-h5-pay (React + Vite)                   │              │
│          │  微信内嵌支付页，URL 参数接收 userId                │              │
│          │  → Java /pay/createOrder → wx.chooseWXPay         │              │
│          └───────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 四、用户身份体系（关键）

微信有多个平台，同一用户在不同平台有不同 `openid`，但 `unionid` 全局唯一。

### 身份标识对照表

| 标识 | 范围 | 说明 |
|---|---|---|
| `openid` | 单平台唯一 | 公众号 openid ≠ 小程序 openid |
| `unionid` | 微信全局唯一 | 同一用户在所有微信平台相同 |
| `cvUserId` | Java 系统内 | `tb_cvuser.id`，网页端登录后 cookie `auth_uid` 存的是这个 |
| `sid` / `userId` | Java 系统内 | `tb_user.id`，小程序登录后 wx.storage 存的是这个 |
| `User.id` (cuid) | Next.js 系统内 | Prisma `User` 表主键，与 `wxId` 关联 |

### Java 两张核心表

```
tb_cvuser (CVUser)          — 公众号扫码注册的用户
  id (cvUserId)
  openid  ← 公众号 openid
  unionid ← 微信全局 unionid
  eventKey, name, ...

tb_user (User)              — 系统业务用户（VIP、支付等）
  id (userId / sid)
  openid  ← 小程序 openid 或公众号 openid
  unionid ← 微信全局 unionid（用于跨平台关联）
  vipStatus, vipType, vipExpireTime
  freeExportCount
```

### Next.js Prisma 表（PostgreSQL）

```
User
  id        String  @id @default(cuid())
  clerkId   String? @unique           // 预留 Clerk 认证（未启用）
  wxId      String? @unique           // = cvUserId（网页端登录）或 tb_user openid（小程序 SSO）
  javaUserId String? @unique          // = tb_user.id，VIP 信息回填
  email, name, avatar

Resume
  id, title, content(Json), template, thumbnail, meta(Json)
  meta.javaId — 迁移时记录来源 Java 简历 ID（防重复）

ResumeMigration
  userId, status, sourceCount, migratedCount  — 小程序→Next.js 迁移状态追踪

UserQuota
  quotas Json — { "ai:generate-resume": { used: 5, date: "2025-01-15" }, ... }

Feedback
  content, contact, attachment, status, adminReply
```

> **关键原则**：两张 Java 表通过 `unionid` 关联，防重复。Next.js `User.wxId` 存 cvUserId（网页端）或小程序 openid（SSO 登录）。

---

## 五、各项目详细说明

### 1. aijianli-backend (Spring Boot)

**路径**: `d:\Marker\GitHub\aijianli-backend`
**主入口**: `cn.aijianli.resume.AijianliApplication`
**配置**: `src/main/resources/application.properties`（`spring.profiles.active=dev|prod`）

**主要 Controller**:

| Controller | 路径前缀 | 调用方 | 功能 |
|---|---|---|---|
| `UserController` | `/user` | 小程序 | 小程序用户登录、注册、VIP 查询 |
| `AccessController` | `/cvstore/login` | 网页端 | 公众号扫码二维码生成、轮询登录状态 |
| `UserVipController` (cvstore) | `/cvstore/user` | 网页端 | VIP 信息查询（基于 cvUserId） |
| `SsoController` | `/sso` | 小程序/网页 | issue（发 token）/ verify（验 token） |
| `WxPayController` | `/pay` | H5 支付页 | 创建支付订单、支付回调更新 VIP |
| `ResumeController` | `/resume` | 小程序 | 简历 CRUD + `/resume/export-for-migration` |
| `ResumeModuleController` | `/resume/module` | 小程序 | 简历模块操作 |
| `InvitationController` | `/invitation` | 小程序/网页 | 邀请码系统 |
| `RedemptionCodeController` | `/redemption` | 网页端 | 兑换码系统 |
| `TemplateController` | `/template` | 小程序/网页 | 简历模板管理 |
| `AdminController` | `/admin` | 管理端 | 后台管理 |

**重要微信事件 Handler**:

| Handler | 触发时机 | 操作 |
|---|---|---|
| `ScanHandler` | 用户扫公众号二维码 | 创建/更新 CVUser（含 unionid） |
| `SubscribeHandler` | 用户关注公众号 | 创建/更新 CVUser（含 unionid） |

**数据库**: MySQL，配置在 `application-dev.properties`（`localhost:3306/spring_boot`），无 Flyway 自动迁移，SQL 需手动执行。

**AI 接口**:
- `ai.deepseek.api-key` / `ai.llm.api-key` — 调用 DeepSeek / 阿里云 DashScope
- `ai.aliyun.docmind.*` — 阿里云文档解析（简历导入）

---

### 2. mini-aijianli (微信小程序)

**路径**: `d:\Marker\GitHub\mini-aijianli\miniprogram`

**核心工具文件**:

| 文件 | 功能 |
|---|---|
| `utils/loginManager.js` | 单例，管理整个登录流程和状态 |
| `utils/resumeManager.js` | 简历列表管理，调用 Next.js `/next-api/resumes/mini` |
| `utils/resumeMigration.js` | 将 Java 简历一次性迁移到 Next.js（火-and-forget） |
| `utils/sso.js` | SSO token 申请 + web-view URL 构建 |
| `utils/fetch.js` | 直接调 Java 后端的简历相关请求 |
| `utils/apiSign.js` | HMAC-MD5 签名，用于调 Next.js `/next-api/resumes/mini` |
| `utils/domin.js` | 域名配置中心 |
| `utils/login/account.js` | `loginByWxCode()` / `register()` API 封装 |
| `utils/login/user.js` | `accountUser(sid)` 获取用户信息 |

**`domin.js` 关键配置**:
```js
aiserver    = 'https://aijianli.cn/api'        // Java 后端
aiH5Origin  = 'https://aijianli.cn'            // Next.js 网页端（prod）
             = 'http://localhost:3000'           // （dev，isProdEnv=false）
```

**小程序登录流程**:
```
1. wx.login() → code
2. POST Java /user/login { code }
   - 200: 已注册 → 存 sid(tb_user.id) + unionid
   - 404: 未注册 → result=openid, data={openid, unionid}
3. (404时) POST Java /user/register { openid, unionid }
   - 优先 unionid 查已有 User → 防重复
4. POST Java /user/getUserInfo { sid }
5. 再次 login 确保 unionid 回填
```

**小程序 web-view SSO 流程**:
```
1. wx.login() → code
2. POST Java /sso/issue { code } → { token, expiresIn }
3. 构建 web-view URL: https://aijianli.cn/m/sso?token=XXX&r=/m/edit?id=YYY
4. Next.js /m/sso → POST Java /sso/verify { token } → 设置 auth_uid cookie
5. 302 跳转到目标页
```

**简历迁移流程** (一次性，`resumeMigration.js`):
```
onShow 触发 → migrateResumesIfNeeded(identity, uid)
  → POST Java /resume/export-for-migration { uid } → resumes[]
  → 逐条 convertJavaResume() 转换格式
  → POST Next.js /next-api/resumes/import-java（带 HMAC 签名）
  → 成功后 wx.setStorageSync('migration_done_'+identity, true)
```

**身份存储** (wx.storage):
- `sid`: `tb_user.id`，调 Java 简历接口
- `unionid`: 调 Next.js 时用于 HMAC 签名的 identity

---

### 3. resume-builder-nextjs (Next.js 网页端)

**路径**: `d:\Marker\GitHub\resume-builder-nextjs`
**技术栈**: Next.js 15, React 19, TailwindCSS v4, Prisma (PostgreSQL), Zustand
**数据库**: PostgreSQL（`DATABASE_URL` env var），通过 Prisma ORM

**路由结构**:
```
/                    — 落地页
/login               — 微信公众号扫码登录页（轮询 /cvstore/login/state）
/dashboard           — 简历列表（受保护）
/editor/[id]         — 简历编辑器（受保护）
/editor/new          — 新建空白简历
/import              — 简历导入
/m                   — 小程序 web-view 嵌入页（无 header/footer）
/m/sso               — SSO 入口（GET，验 token → 设 cookie → 302）
/m/edit/[id]         — 小程序内编辑器
/admin               — 管理后台
/articles/*          — SEO 文章
/templates           — 模板展示
```

**中间件保护** (`middleware.ts`):
- 受保护路由: `/dashboard`, `/editor`, `/admin`
- 未登录 → 重定向 `/login?redirect=原路径`
- 已登录访问 `/login` → 重定向 `/dashboard`
- 认证凭证: `auth_uid` cookie

**BFF 路由层** (`src/app/next-api/`):

| 路由 | 方法 | 功能 | 认证方式 |
|---|---|---|---|
| `/next-api/resumes` | GET/POST | 简历列表/创建 | `auth_uid` cookie |
| `/next-api/resumes/[id]` | GET/PUT/DELETE | 单条简历 CRUD | `auth_uid` cookie |
| `/next-api/resumes/[id]/convert` | POST | 格式转换 | `auth_uid` cookie |
| `/next-api/resumes/mini` | POST | 小程序简历管理（list/create/copy/rename/delete） | HMAC-MD5 签名 |
| `/next-api/resumes/import-java` | POST | 小程序迁移导入单条简历 | HMAC-MD5 签名 |
| `/next-api/vip/info` | GET | VIP 信息 + 套餐价格 | `auth_uid` cookie → Java |
| `/next-api/vip/poll` | GET | 轮询 VIP 状态 | `auth_uid` cookie → Java |
| `/next-api/ai/generate-resume` | POST | AI 生成简历（SSE 流式） | quota 检查 |
| `/next-api/ai/generate-section` | POST | AI 生成单个模块 | quota 检查 |
| `/next-api/ai/optimize-resume` | POST | AI 优化简历 | quota 检查 |
| `/next-api/ai/polish-section` | POST | AI 润色模块 | quota 检查 |
| `/next-api/ai/import-resume` | POST | AI 从文本导入简历 | quota 检查 |
| `/next-api/ai/import-resume-file` | POST | AI 从文件导入简历 | quota 检查 |
| `/next-api/generate-pdf` | POST | Puppeteer 生成 PDF | quota 检查 |
| `/next-api/quota` | GET | 查询当前用户所有 quota 状态 | `auth_uid` cookie |
| `/next-api/consume-pdf-quota` | POST | 消耗 PDF 导出次数 | `auth_uid` cookie |
| `/next-api/feedback/upload` | POST | 上传反馈附件 | — |

**网页端登录流程**:
```
1. GET /login → 调 Java /cvstore/login/qrcode 生成二维码 ticket
2. 展示微信公众号二维码
3. 用户微信扫码 → ScanHandler 更新 CVUser → 设置 sceneStr 已扫
4. 前端轮询 POST Java /cvstore/login/state { sceneStr }
   → 返回 { uid(cvUserId), unionid }
5. 设置 auth_uid cookie = cvUserId（30天）
6. syncUserAction(wxId=cvUserId) → Prisma User upsert
7. 重定向到 /dashboard 或来源页
```

**Quota 系统**（`UserQuota` 表）:
- 按 feature key 计数，如 `ai:generate-resume`, `pdf:export`
- VIP 用户 bypass（无限制）
- 非 VIP 用户有每日/总量限制

**环境变量** (`.env`):
```
DATABASE_URL            — PostgreSQL 连接串
JAVA_API_BASE_URL       — Java 后端地址（默认 https://aijianli.cn/api）
DASHSCOPE_API_KEY       — 阿里云 DashScope AI
NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Supabase 存储
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY — Clerk 认证（预留）
ALIYUN_OSS_*            — 阿里云 OSS（可选）
```

---

### 4. aijianli-h5-pay (H5 支付页)

**路径**: `d:\Marker\GitHub\aijianli-h5-pay`
**技术栈**: React + Vite, TailwindCSS
**功能**: 微信内嵌 H5 支付页，由网页端或小程序跳转过来。

**URL 参数**:
- `userId`: `tb_user.id`，用于创建支付订单（必需）

**API 调用**（通过 Vite proxy 代理到 Java）:
- `GET /api/vip/configs?source=web` → 获取套餐列表
- `POST /pay/createOrder { userId, vipType }` → 创建微信支付订单 → `wx.chooseWXPay`

**注意**: 仅在微信浏览器内可完成支付，非微信环境显示提示。

---

## 六、关键数据流

### VIP 购买完整流程

```
网页端用户:
  /dashboard 点击升级
  → GET /next-api/vip/info (BFF, auth_uid=cvUserId)
  → Java GET /cvstore/user/{cvUserId}/vip-info
      → 查 CVUser → 用 unionid 查/创建 tb_user → 返回 userId(tb_user.id)
  → 同时 Prisma User.javaUserId 回填（fire-and-forget）
  → 前端跳转: https://aijianli.cn/h5-pay?userId={userId}
  → aijianli-h5-pay POST /pay/createOrder
  → 微信支付回调 → Java 更新 tb_user VIP → 前端轮询 /next-api/vip/poll

小程序用户:
  点击升级 → loginManager 获取 sid(tb_user.id)
  → 构建 H5 URL → aijianli-h5-pay（同上流程）
```

### 小程序进入 Next.js web-view 流程

```
小程序打开编辑器
  → sso.obtainWebViewUrl('/m/edit?id=xxx')
    → wx.login() → code
    → POST Java /sso/issue { code } → { token }
    → 构建 https://aijianli.cn/m/sso?token=XXX&r=/m/edit?id=xxx&miniVersion=x.y.z
  → <web-view src=上述URL>
  → Next.js GET /m/sso
    → POST Java /sso/verify { token } → { uid(cvUserId 或 openid), openid }
    → 优先取 openid 作为 wxId
    → Prisma User upsert(wxId)
    → 设置 auth_uid cookie
    → 302 → /m/edit?id=xxx
```

> H5 若调用小程序原生页面/API（例如导出结果页、分享文件等），入口必须按 `miniVersion >= 原生能力支持版本` 判断，避免 Next.js 先发布而小程序审核未通过时暴露旧壳不支持的功能。

### 防重复用户创建机制

```
同一微信用户可能触发两条创建路径：
  路径 A: 公众号扫码 → ScanHandler → CVUser → UserVipController → tb_user (openid=公众号openid)
  路径 B: 小程序登录 → /user/register → tb_user (openid=小程序openid)

解决方案：
  - /user/register 优先用 unionid 查找已有 tb_user
  - 找到则复用（更新小程序 openid），不创建新记录
  - UserVipController.getVipInfo 同样优先 unionid 查找
```

---

## 七、/user/login 404 响应格式（向下兼容设计）

```json
{
  "status": 404,
  "result": "ox9m55...",         // openid 纯字符串 — 旧版小程序直接用
  "data": {
    "openid": "ox9m55...",
    "unionid": "oj3IJj..."       // 新版小程序读 data.unionid
  }
}
```

---

## 八、邀请码系统

- `InvitationCode`: 用户生成邀请码，每用户只生成一次
- `InvitationUsage`: 记录每次邀请码使用（一对多）
- `InvitationReward`: 邀请奖励配置
- 新用户使用邀请码注册 → 获得 1 次免费导出次数
- 邀请人每成功邀请一人 → 获得奖励（配置化）
- 使用邀请码有时间限制（注册后 1 小时内）

---

## 九、待办 / 注意事项

1. **V8 迁移 SQL** 需手动执行（无 Flyway 自动运行）:
   ```sql
   UPDATE tb_user u
   INNER JOIN tb_cvuser cv ON cv.openid = u.openid
   SET u.unionid = cv.unionid
   WHERE (u.unionid IS NULL OR u.unionid = '')
     AND cv.unionid IS NOT NULL AND cv.unionid != '';
   ```

2. **网页端 `auth_uid` cookie** 存的是 `cvUserId`（`tb_cvuser.id`），调 Java 用 `/cvstore/user/{cvUserId}/...`；小程序 web-view SSO 后也是同一 cookie，但值可能是 openid（取决于 Java `/sso/verify` 返回）。

3. **小程序 `sid`** 存的是 `tb_user.id`，调 Java `/resume/*` 接口时作为用户标识。

4. **Next.js `User.wxId`** 统一存储微信身份标识（网页端=cvUserId，小程序SSO=openid），是 Next.js 侧的唯一用户 key。

5. **PDF 生成** 本地开发需要安装 Chrome，路径写死为 `C:\Program Files\Google\Chrome\Application\chrome.exe`；生产环境用 `@sparticuz/chromium`。

6. **小程序迁移**（`resumeMigration.js`）是一次性操作，完成后写 `wx.storage` 标记，不重复执行。
