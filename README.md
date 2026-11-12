# Markdown 博客（MVP）

多用户博客平台：账号密码注册登录、Markdown 文章增删改查、全站私有 + 分享链接（免密/带密码）。

- 设计文档：[docs/superpowers/specs/2026-11-12-blog-mvp-design.md](docs/superpowers/specs/2026-11-12-blog-mvp-design.md)
- 实施计划：[docs/superpowers/plans/2026-11-12-blog-mvp-plan.md](docs/superpowers/plans/2026-11-12-blog-mvp-plan.md)

## 技术栈

- 后端 `server/`：NestJS 11 + Prisma + SQLite + @nestjs/jwt（HttpOnly Cookie）
- 前端 `web/`：Vue 3 + Vite + TypeScript + Vue Router + Pinia + axios
- Markdown 渲染统一在服务端（markdown-it，`html:false` 防 XSS）

## 环境要求

- Node.js ≥ 20（Windows/Linux/macOS 均可）

## 快速开始（开发模式）

```bash
# 1. 后端
cd server
npm install
copy .env.example .env        # Linux/macOS: cp .env.example .env
npx prisma migrate dev        # 初始化 SQLite（server/prisma/dev.db）
npm run start:dev             # http://localhost:3000（API 前缀 /api）

# 2. 前端（另开终端）
cd web
npm install
npm run dev                   # http://localhost:5173，/api 代理到 3000
```

浏览器访问 http://localhost:5173 注册、登录、写作。

## 生产模式（单进程）

```bash
cd web && npm run build       # 产出 web/dist
cd ../server && npm run build
npm start                     # NestJS 托管 web/dist，SPA fallback，端口 3000
```

## 测试

```bash
cd server
npm test                      # Vitest 单测（29 个）：渲染 XSS、认证、文章/分享权限
powershell -File smoke.ps1    # 验收冒烟（40 项，需服务器已在本机 3000 运行）
```

## 核心规则速览

| 访问者 | 他人已发布 | 他人草稿 | 分享链接 |
|---|---|---|---|
| 未登录 | ✗（跳登录） | ✗ | 免密直接看；带密输对密码后 24h 内免输 |
| 登录用户 | ✓ | 404 | 同上 |

- 密码：bcrypt 哈希；登录态：JWT 写入 HttpOnly + SameSite=Lax Cookie（30 天）
- 分享可随时停用/删除；删除文章级联删除其分享链接

## 环境变量（server/.env）

| 变量 | 说明 |
|---|---|
| DATABASE_URL | SQLite 路径，默认 `file:./dev.db` |
| JWT_SECRET | JWT 签名密钥，生产环境务必更换 |
| PORT | 服务端口，默认 3000 |
