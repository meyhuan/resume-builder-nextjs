# 账号与简历迁移架构

> 最后更新：2025-04

## 背景

系统由两个后端组成：

- **Java 后端**（旧）：账号、简历存储。用户身份用 wx `openid`，内部自增 `Long uid`。
- **Next.js 后端**（新）：Prisma ORM，`User.wxId = openid`，简历存 `ResumeData` 格式。

**核心原则：两端用同一个 wx `openid` 作为用户唯一标识，不能用 Java 数字 uid。**

---

## 一、SSO 登录流程（小程序 → 网页 web-view）

```
小程序                    Java 后端                 Next.js
  │                          │                         │
  ├─ wx.login() ────────────>│                         │
  │<─ code ──────────────────┤                         │
  │                          │                         │
  ├─ POST /sso/issue ────────>│                         │
  │  { code, appId }         ├─ jscode2session ──────> WeChat
  │                          │<─ openid ───────────────┤
  │                          ├─ 查 tb_user by openid   │
  │                          ├─ 生成一次性 token        │
  │<─ { token } ─────────────┤                         │
  │                          │                         │
  ├─ 打开 web-view ──────────────────────────────────>│
  │  URL: /m/sso?token=XXX&r=/m/edit/123              │
  │                          │                         │
  │                          │<─ POST /sso/verify ─────┤
  │                          │  { token }              │
  │                          ├─ consume token          │
  │                          ├─ findById(uid)          │
  │                          ├─ 返回 { uid, openid } ──>│
  │                          │                         ├─ upsert Prisma User
  │                          │                         │  where wxId = openid
  │                          │                         ├─ 设 auth_uid cookie
  │                          │                         │  值 = openid（非数字uid）
  │                          │                         ├─ 302 → /m/edit/123
```

**关键**：`auth_uid` cookie 的值必须是 wx `openid`，这样网页端和小程序端查的才是同一个 Prisma User。

### 相关文件

| 文件 | 职责 |
|------|------|
| `JavaBackend/.../SsoController.java` | `/sso/issue`（发 token）、`/sso/verify`（消费 token，额外返回 `openid`） |
| `src/app/m/sso/route.ts` | 调 Java verify，优先用 `openid` 而非数字 uid 作为 cookie 值 |

`sso/route.ts` 关键逻辑：
```ts
// 优先用 openid，fallback 到数字 uid（兼容旧 Java 版本）
return payload.data.openid || String(payload.data.uid)
```

---

## 二、小程序直接调 Next.js API 的认证方式

`wx.request` 无法携带 cookie，改用 **HMAC-MD5 签名**。

### 签名算法

```
message = `${timestamp}.${sid}`
sign    = HMAC-MD5(IMPORT_SECRET, message)
```

每个请求 body 携带：
```json
{ "sid": "oXxxx...", "timestamp": 1714200000000, "sign": "abc123..." }
```

服务端验证两步：
1. `|now - timestamp| ≤ 5min`（防重放）
2. 重算 sign 与传入值一致

### 相关文件

| 文件 | 职责 |
|------|------|
| `miniprogram/utils/apiSign.js` | `buildSign(sid)` 生成签名字段 |
| `src/lib/verify-mini-sign.ts` | `verifyMiniSign(fields)` 服务端验签 |
| `.env` | `IMPORT_SECRET=aijianli_import_2025` |
| `apiSign.js` 第 15 行 | 同一个 secret 硬编码（小程序无 env） |

---

## 三、简历迁移流程（Java → Next.js）

### 触发时机

小程序首页 `onShow` → `checkLoginStatus()` → 已登录时：

```js
// miniprogram/pages/home/home.js
migrateResumesIfNeeded(sid)
  .catch(e => console.error('[Home] migration error', e))
  .finally(() => this.loadResumes())  // 迁移完成后再拉列表
```

### 迁移步骤

```
小程序                         Java 后端           Next.js
  │                                │                  │
  ├─ 检查 wx.storage               │                  │
  │  key: migration_done_{sid}     │                  │
  │  已存在 → 直接跳过             │                  │
  │                                │                  │
  ├─ POST /resume/export-for-migration ──────────────>│
  │  { uid: Number(sid) }          │                  │
  │<─ { resumes: [...rawJson] } ───┤                  │
  │                                │                  │
  ├─ 本地 convertJavaResume()      │                  │
  │  Java格式 snake_case → ResumeData                 │
  │                                │                  │
  ├─ for each resume:              │                  │
  │  POST /next-api/resumes/import-java ─────────────>│
  │  { ...buildSign(sid),          │                  │
  │    javaId, title,              │                  │
  │    template, content }         │                  │
  │<─ { created: true }            │                  │
  │   或 { created: false,         │                  │
  │        reason: "already_exists" }（幂等）          │
  │                                │                  │
  ├─ 全部成功：                    │                  │
  │  wx.setStorage(migration_done_{sid}, true)        │
  │  下次 onShow 不再执行          │                  │
  │                                │                  │
  └─ 有失败：不标记，下次 onShow 重试                 │
```

### 幂等保证

`/next-api/resumes/import-java` 以 `(userId, meta.javaId)` 去重，重复导入返回 `already_exists`，不插入重复数据。

### Java 格式 → ResumeData 字段映射

| Java 字段 | ResumeData 字段 |
|-----------|----------------|
| `base_info.name` | `baseInfo.*` |
| `job_intention` | `jobIntention.*` |
| `experience[]` | `sections[type=experience]` 工作经历 |
| `intern[]` | `sections[type=experience]` 实习经历 |
| `program_experience[]` | `sections[type=project]` 项目经验 |
| `education[]` | `sections[type=education]` 教育经历 |
| `school_exps[]` | `sections[type=campus]` 在校经历 |
| `self_evaluation` | `sections[type=text]` 自我评价 |
| `skills` / `skill_certificate` | `sections[type=text]` 相关技能 |
| `qualifications` | `sections[type=text]` 奖项证书 |
| `custom_module_info[]` | `sections[type=text]` 自定义模块 |

### 相关文件

| 文件 | 职责 |
|------|------|
| `miniprogram/utils/resumeMigration.js` | 迁移入口、Java 数据拉取、格式转换、上传 |
| `src/app/next-api/resumes/import-java/route.ts` | 接收单条简历，幂等写入 Prisma |
| Java `ResumeController.java` | `/resume/export-for-migration` 端点 |

---

## 四、简历 CRUD（小程序端）

所有操作统一走 `POST /next-api/resumes/mini`，body 中用 `action` 区分，每个请求都带签名字段。

| action | 说明 | 额外字段 |
|--------|------|----------|
| `list` | 获取简历列表 | — |
| `create` | 新建空简历 | `title`, `template` |
| `copy` | 复制简历 | `resumeId` |
| `rename` | 重命名简历 | `resumeId`, `title` |
| `delete` | 删除简历 | `resumeId` |

小程序调用方式（`resumeManager.js`）：

```js
// 所有操作通过 miniRequest 统一处理签名
resumeManager.loadResumeListFromNextJs(sid)
resumeManager.createResumeInNextJs(sid, title, template)
resumeManager.copyResumeInNextJs(sid, resumeId)
resumeManager.renameResumeInNextJs(sid, resumeId, title)
resumeManager.deleteResumeInNextJs(sid, resumeId)
```

### 相关文件

| 文件 | 职责 |
|------|------|
| `miniprogram/utils/resumeManager.js` | `miniRequest()` + 各 CRUD 方法 |
| `src/app/next-api/resumes/mini/route.ts` | 统一 CRUD 接口，含签名验证 |

---

## 五、常见问题

### Q: 小程序和网页看到的简历列表不一样？

**根本原因**：`auth_uid` cookie 值是 Java 数字 uid，而小程序传的是 wx openid，两个值不同导致 Prisma upsert 出了两条 User 记录。

**解决**：`SsoController.verify` 额外返回 `openid`，`sso/route.ts` 优先用 `openid` 作为 cookie 值。

### Q: 迁移失败后怎么重试？

`migration_done_{sid}` 只有在全部简历迁移成功时才写入。失败的情况下下次进入首页会自动重试。

### Q: 如何强制重新迁移某个用户？

在小程序开发者工具中清除对应 key：
```js
wx.removeStorageSync('migration_done_' + sid)
```

### Q: 新用户（没有 Java 简历）的情况？

`fetchJavaResumes` 返回空数组时，直接标记 `migration_done_{sid}` 为完成，不做任何操作。
