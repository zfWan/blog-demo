# 博客系统 MVP 实施计划

- 日期：2026-11-12
- 依据：[设计文档](../specs/2026-11-12-blog-mvp-design.md)（2026-11-12-blog-mvp-design.md，已审阅通过）
- 每阶段完成后 git 提交一次；带 ◇ 的步骤为该阶段完成标志

## 阶段 0：脚手架

1. 根目录：`.gitignore`（node_modules/dist/*.db）、README 骨架
2. `server/`：手工搭建 NestJS 工程（package.json、tsconfig、nest-cli 不引入）
   - 依赖：@nestjs/common、@nestjs/core、@nestjs/platform-express、@nestjs/jwt、@nestjs/serve-static、reflect-metadata、rxjs、cookie-parser、class-validator、class-transformer、bcryptjs、markdown-it、@prisma/client
   - 开发依赖：typescript、@types/*、prisma、vitest、@nestjs/testing、supertest（可后置）
   - `src/main.ts`：全局前缀 `/api`、ValidationPipe、CookieParser、全局异常过滤器占位
   - ◇ `npm run start:dev` 能起在 3000 并返回 404
3. `web/`：`npm create vite@latest web -- --template vue-ts`，加装 vue-router、pinia、axios
   - ◇ `npm run dev` 起 5173，Vite proxy `/api` → 3000 配好

## 阶段 1：数据层

1. `server/prisma/schema.prisma`：User / Post / ShareLink + PostStatus 枚举（见设计文档第 4 节）
2. `npx prisma migrate dev --name init`，生成 PrismaClient 单例 `src/prisma.service.ts`
   - ◇ dev.db 生成，`prisma studio` 可见三张表

## 阶段 2：认证模块

1. `modules/auth`：DTO（class-validator）→ `register`（email/username 唯一，冲突 409；密码 ≥8；bcrypt cost 10）、`login`（失败 401）、`logout`、`me`
2. JWT：`@nestjs/jwt` 签发，载荷 `{ sub: userId }`，密钥 `JWT_SECRET`（.env），Set-Cookie HttpOnly + SameSite=Lax + 30d
3. `common/`：全局 `JwtAuthGuard`（APP_GUARD）、`@Public()` 装饰器、当前用户参数装饰器
4. 单测：注册唯一性、密码校验、JWT 签发/解析
   - ◇ curl 注册→登录→带 cookie 访问 /auth/me 全通

## 阶段 3：文章模块

1. `modules/posts`：`GET /posts`（PUBLISHED 全部 + 本人 DRAFT，updatedAt 倒序）、`POST /posts`、`GET /posts/:id`（他人 DRAFT → 404，响应含 contentHtml）、`PATCH`、`DELETE`（仅作者，否则 404）
2. `lib/markdown.ts`：markdown-it `{ html:false, linkify:true, breaks:true }`，单测覆盖 XSS 用例（`<script>` 应被转义）
3. 单测：权限矩阵 API 侧（他人草稿 404、非作者写 404）
   - ◇ curl 增删改查 + 越权用例全通

## 阶段 4：分享模块

1. `modules/shares`：
   - `POST /posts/:id/shares`（仅作者；可选密码→bcrypt；token = randomBytes(32).hex；返回完整链接）
   - `PATCH /shares/:id`（enabled 启停）、`DELETE /shares/:id`（仅作者）
   - 公开 `GET /share/:token`：不存在/disabled → 404；带密未解锁 → 401 `{needPassword:true}`；免密/已解锁 → 文章 + contentHtml
   - `POST /share/:token/unlock`：密码对 → Set-Cookie `share_<token前8位>` HttpOnly 24h
2. 单测：token 唯一、密码校验、enabled 开关、解锁 cookie
   - ◇ curl 创建免密/带密分享并按矩阵验证

## 阶段 5：前端

1. 基建：axios 实例（withCredentials）、Pinia auth store（me/login/logout）、路由守卫（未登录 → /login，/share/* 除外）、401 拦截
2. 页面：Login、Register（表单错误就地显示）、文章列表（含草稿标识、删除、分享管理入口）、编辑器（textarea + 预览切换，新建/编辑复用）、阅读页（contentHtml 直接渲染）、分享页（needPassword 时显示密码表单）
3. 分享管理：创建（可选密码）→ 展示完整链接可复制、启停、删除
   - ◇ 浏览器手工走通：注册→登录→建文章→发布→建分享→隐身窗免密/带密访问

## 阶段 6：集成与验收

1. ServeStaticModule 托管 `web/dist`；`web` 构建 + server 生产模式单进程验证
2. 验收 = 设计文档第 6 节权限矩阵全组合 + 文章 CRUD + 分享创建/启停/删除（清单逐项过）
3. README 完善：环境变量、`npm run dev`、生产构建运行说明
   - ◇ 验收清单全绿，最终提交

## 风险与备注

- Windows 下 Prisma/emoji 路径：工程路径无空格无中文（fact-demo 内），无风险
- `@nestjs/serve-static` 与全局前缀 `/api` 共存已验证可行（设置 `exclude: ['/api/(.*)']`）
- Vitest 与 Nest DI：service 单测用 Test.createTestingModule，必要时 mock PrismaService
