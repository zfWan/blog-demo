# 博客系统 MVP 设计文档

- 日期：2026-11-12
- 状态：已与需求方逐节确认通过
- 交付目标：可本机/自有服务器运行的多用户博客系统 MVP

## 1. 背景与目标

构建一个多用户博客平台的 MVP：

- 任何人可注册账号，各用户独立管理自己的文章
- 仅支持 Markdown 格式写作
- 全站私有：只有登录用户才能浏览文章
- 支持文章分享链接：匿名可访问，分为「免密」和「带密码」两种模式

### 非目标（MVP 明确不做）

- OAuth / 第三方登录
- 富文本编辑器、图片/文件上传
- 评论、点赞、标签、搜索
- 邮箱验证、找回密码
- Serverless 平台部署（Vercel 等）

## 2. 技术选型

| 维度 | 选择 | 说明 |
|---|---|---|
| 后端 | NestJS (TypeScript) | 模块化 REST API |
| 前端 | Vue 3 + Vite + TypeScript | SPA，配 Vue Router + Pinia |
| ORM/数据库 | Prisma + SQLite | 单文件数据库，Node 进程本地运行 |
| 认证 | 自建：bcryptjs + JWT（HttpOnly cookie） | 仅账号密码 |
| Markdown 渲染 | markdown-it（`html: false`） | 服务端渲染，统一防 XSS |
| 测试 | Vitest + @nestjs/testing | service 层单测 + 权限矩阵冒烟 |

备选方案对比结论（已与需求方确认）：

- Next.js 全栈：单工程简单，但需求方要求前后端分离
- iron-session 手写认证：可行，但 NestJS 生态下 `@nestjs/jwt` + 全局 Guard 更贴合
- Drizzle：迁移与类型体验不如 Prisma 顺手

## 3. 工程结构

```
blog/
  server/                     # NestJS
    prisma/schema.prisma
    src/
      main.ts                 # 全局前缀 /api、全局管道/过滤器、CookieParser
      app.module.ts
      common/                 # guards、filters、decorators(@Public)
      modules/
        auth/                 # register/login/logout/me
        users/
        posts/                # 文章 CRUD + Markdown 渲染
        shares/               # 分享链接管理 + 公开访问
  web/                        # Vue 3 + Vite
    src/
      views/                  # Login/Register/PostList/Editor/PostView/ShareView
      stores/                 # Pinia：auth
      api/                    # axios 封装
```

- 开发期：Vite dev server 代理 `/api` → `http://localhost:3000`
- 部署期：NestJS `ServeStaticModule` 托管 `web/dist`，单 Node 进程

## 4. 数据模型（Prisma + SQLite）

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  posts        Post[]
  createdAt    DateTime @default(now())
}

model Post {
  id        String     @id @default(cuid())
  author    User       @relation(fields: [authorId], references: [id])
  authorId  String
  title     String
  content   String     // Markdown 原文，渲染即用即算
  status    PostStatus @default(DRAFT)
  shares    ShareLink[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

enum PostStatus { DRAFT PUBLISHED }

model ShareLink {
  id           String   @id @default(cuid())
  post         Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId       String
  token        String   @unique // 随机 32 字节 hex
  passwordHash String?  // 空 = 免密分享
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

## 5. API 设计

统一前缀 `/api`，JSON in/out。错误响应统一为 `{ statusCode, message }`（全局异常过滤器）。

### 认证（公开）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/auth/register | body: email, username, password(≥8) |
| POST | /api/auth/login | 成功后 Set-Cookie: JWT，HttpOnly + SameSite=Lax，30 天 |
| POST | /api/auth/logout | 清除 cookie |
| GET | /api/auth/me | 当前用户信息（需登录） |

### 文章（需登录）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/posts | 列表 = 全部 PUBLISHED + 自己的 DRAFT，按更新时间倒序 |
| POST | /api/posts | 创建，body: title, content, status |
| GET | /api/posts/:id | 详情；他人 DRAFT → 404；响应含 `contentHtml`（服务端渲染） |
| PATCH | /api/posts/:id | 仅作者；非作者 → 404 |
| DELETE | /api/posts/:id | 仅作者；级联删除分享链接 |

### 分享链接管理（需登录，仅作者）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/posts/:id/shares | 创建分享；body: password(可选)；返回完整链接 |
| PATCH | /api/shares/:id | 启停：body: enabled |
| DELETE | /api/shares/:id | 删除 |

### 分享访问（公开）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/share/:token | token 不存在/disabled → 404；带密分享未解锁 → 401 `{ needPassword: true }`；免密或已解锁 → 文章内容 |
| POST | /api/share/:token/unlock | body: password；正确则 Set-Cookie: `share_<token 短哈希>`（HttpOnly，24h），错误 → 401 |

## 6. 认证与权限规则

- 密码用 bcryptjs 哈希（cost 10）存储，任何接口不回传
- JWT 载荷仅含 `sub: userId`，密钥来自环境变量 `JWT_SECRET`
- 全局 `JwtAuthGuard`，`@Public()` 标记公开路由；前端路由守卫仅做体验层跳转，权限以 API 层为准
- 权限矩阵（验收依据）：

| 访问者 | 他人 PUBLISHED | 他人 DRAFT | 自己文章 | 免密分享 | 带密分享（未解锁） | 带密分享（已解锁） |
|---|---|---|---|---|---|---|
| 未登录 | ✗(302 登录页) | ✗ | ✗ | ✓ | 输密码 | ✓ |
| 登录用户 | ✓ | 404 | ✓ | ✓ | 输密码 | ✓ |

- 写操作越权一律 404（不泄露资源存在性）
- CSRF：同源部署 + SameSite=Lax cookie，MVP 不再加 CSRF token

## 7. 前端页面

| 页面 | 路由 | 说明 |
|---|---|---|
| 登录 / 注册 | /login, /register | 表单错误就地显示 |
| 我的文章（首页） | / | 自己全部文章（含草稿），入口：新建/编辑/删除/分享管理 |
| 编辑器 | /posts/new, /posts/:id/edit | textarea + 预览切换，仅 Markdown 纯文本 |
| 阅读页 | /posts/:id | 服务端返回的 contentHtml 直接展示 |
| 分享页 | /share/:token | 免密直接看；带密显示密码表单，解锁后展示 |

- axios 拦截器：401（非分享页）→ 跳 /login；其余错误 toast
- Markdown 渲染只在服务端做（`markdown-it`，`html:false`、`linkify:true`、`breaks:true`），前端不渲染 Markdown

## 8. 错误处理

- NestJS 全局异常过滤器：已知业务错误返回 `{ statusCode, message }`，未知错误记日志并返回 500 通用文案
- Prisma 唯一约束冲突（email/username 重复）→ 409 友好提示
- 参数校验用 `class-validator` 全局 ValidationPipe，失败返回 400

## 9. 测试策略

- service 层单测（Vitest + @nestjs/testing）：
  - auth：注册唯一性、密码哈希/校验、JWT 签发
  - posts：权限矩阵中 API 层规则（他人草稿 404、非作者写 404）
  - shares：token 生成唯一性、密码校验、enabled 开关
- 前端不强制单测，以手工验收为准
- 验收冒烟清单 = 第 6 节权限矩阵全组合 + 文章增删改查 + 分享创建/启停/删除

## 10. 环境与运行

- Node.js ≥ 20；环境变量：`JWT_SECRET`、`DATABASE_URL`(file:./dev.db)
- 首次启动：`prisma migrate dev` 建库；`npm run dev` 同时起 server(3000) 与 web(5173)
- 生产：`web` 构建后由 server 托管，单进程 `node dist/main`
