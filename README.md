# OpenSkillHub

> AI Agent 技能注册中心 — 基于 [Agent Skills](https://agentskills.io/) 开放标准

OpenSkillHub 是一个集中式的技能仓库（类似 npm 之于 Node.js），让个人和团队 **存储、分享、发现** AI Agent 技能，并通过本地 Skill 实现跨客户端的安装、更新和发布。

## 特性

- **多 Agent 支持** — OpenCode、OpenClaw、Claude Code、Cursor、Goose、Amp 等
- **版本管理** — 每个 skill 支持 semver 版本，按 agent 维度上传独立包
- **全文搜索** — PG tsvector 加权全文索引，前缀匹配，分类筛选、标签过滤、下载排行
- **认证体系** — JWT (Web 登录) + API Key (CLI / Agent)，Rate Limiting + Zod 请求校验
- **团队协作** — 团队 CRUD、成员管理、owner/admin/member 角色体系
- **本地 Skill** — 安装 `openskillhub` skill 后即可通过 AI Agent 直接搜索/安装/发布

## 技术栈

| 层       | 选型                          |
|----------|-------------------------------|
| 语言     | TypeScript                    |
| 包管理   | pnpm workspace (Monorepo)     |
| 后端     | Node.js + Fastify v5          |
| ORM      | Prisma v6                     |
| 数据库   | PostgreSQL 17                 |
| 文件存储 | 本地文件系统 / S3 (MinIO)     |
| 前端     | Next.js 15 (App Router)       |
| 部署     | Docker Compose + 源码部署     |

## 项目结构

```
openskillhub/
├── backend/                # Fastify REST API
│   ├── prisma/             #   Prisma schema + migrations + seed
│   └── src/
│       ├── routes/         #   auth, skills, versions, packages, categories, teams, stats
│       ├── storage/        #   本地/S3 存储抽象
│       ├── lib/            #   Prisma client, Zod validation schemas
│       └── app.ts          #   入口
├── frontend/               # Next.js 15 Web UI
│   └── src/
│       ├── app/            #   App Router 页面
│       └── lib/            #   API 客户端
├── packages/
│   ├── shared/             # 共享类型 + 常量
│   └── local-skill/        # Agent 本地 skill（SKILL.md + CLI）
├── docker-compose.yml      # PostgreSQL + MinIO
├── BLUEPRINT.md            # 详细开发蓝图
└── package.json            # Monorepo 根配置
```

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 10
- Docker + Docker Compose（用于数据库）

### 1. 克隆并安装

```bash
git clone https://github.com/SoPudge/openskillhub.git
cd openskillhub
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL、JWT_SECRET 等
```

### 3. 启动数据库

```bash
docker compose up -d postgres
```

### 4. 初始化数据库

```bash
cd backend
npx prisma migrate dev
npx tsx prisma/seed.ts    # 种子数据：8 个技能分类
```

### 5. 启动后端

```bash
cd backend
pnpm dev
# API 运行在 http://localhost:3001
```

### 6. 启动前端

```bash
cd frontend
pnpm dev
# Web 运行在 http://localhost:3000
```

## API 概览

所有接口基准路径：`/api/v1`

| 方法     | 路径                                        | 说明             | 认证  |
|----------|---------------------------------------------|------------------|-------|
| `POST`   | `/auth/register`                            | 注册             | —     |
| `POST`   | `/auth/login`                               | 登录             | —     |
| `GET`    | `/auth/me`                                  | 当前用户         | JWT   |
| `POST`   | `/auth/api-keys`                            | 创建 API Key     | JWT   |
| `GET`    | `/categories`                               | 分类列表         | —     |
| `GET`    | `/tags`                                     | 标签列表         | —     |
| `GET`    | `/skills`                                   | 搜索/列表        | —     |
| `GET`    | `/skills/:name`                             | Skill 详情       | —     |
| `POST`   | `/skills`                                   | 创建 Skill       | ✓     |
| `POST`   | `/skills/:name/versions`                    | 创建版本         | ✓     |
| `POST`   | `/skills/:name/versions/:ver/packages`      | 上传包           | ✓     |
| `GET`    | `/skills/:name/versions/:ver/packages/:agent` | 下载包         | —     |
| `GET`    | `/skills/:name/latest/:agent`               | 下载最新版       | —     |
| `POST`   | `/skills/check-updates`                     | 批量检查更新     | —     |
| `GET`    | `/skills/:name/stats`                       | 下载统计 (天/周/月) | —  |
| `GET`    | `/teams`                                    | 列出我的团队     | ✓     |
| `POST`   | `/teams`                                    | 创建团队         | ✓     |
| `GET`    | `/teams/:slug`                              | 团队详情         | —     |
| `PATCH`  | `/teams/:slug`                              | 更新团队         | ✓     |
| `DELETE` | `/teams/:slug`                              | 删除团队         | ✓     |
| `GET`    | `/teams/:slug/members`                      | 成员列表         | —     |
| `POST`   | `/teams/:slug/members`                      | 添加成员         | ✓     |
| `DELETE` | `/teams/:slug/members/:username`            | 移除成员         | ✓     |

### 搜索参数

```
GET /skills?q=git&category=dev-workflow&tag=git,workflow&agent=opencode&sort=downloads&page=1&limit=20
```

## 通过 AI Agent 使用

将 `packages/local-skill/openskillhub/` 目录安装到你的 Agent 的 skills 目录：

```bash
# OpenCode
cp -r packages/local-skill/openskillhub ~/.config/opencode/skills/

# Claude Code
cp -r packages/local-skill/openskillhub ~/.claude/skills/

# OpenClaw
cp -r packages/local-skill/openskillhub ~/.openclaw/skills/
```

安装后，在 Agent 对话中即可使用：

```
搜索 git 相关 skill
安装 skill git-workflow
发布当前目录的 skill
```

## Skill 包格式

每个 skill 包是一个 zip 文件，必须包含 `SKILL.md`：

```yaml
---
name: my-skill
description: 一句话描述
metadata:
  author: your-name
  version: "1.0.0"
  license: MIT
---

# My Skill

Skill 的详细说明...
```

## 环境变量

| 变量              | 说明                          | 默认值                         |
|-------------------|-------------------------------|-------------------------------|
| `LOG_LEVEL`     | 日志级别 (debug/info/warn/error) | `info`                        |
| `LOG_DIR`       | 日志文件目录                  | `<仓库>/logs/`                |
| `NODE_ENV`      | 运行环境 (production/development) | —                            |
| `DATABASE_URL`    | PostgreSQL 连接串             | —                             |
| `SERVER_PORT`     | 后端端口                      | `3001`                        |
| `JWT_SECRET`      | JWT 签名密钥                  | —                             |
| `STORAGE_TYPE`    | 存储类型 (`local` / `s3`)     | `local`                       |
| `STORAGE_PATH`    | 本地存储路径                  | `./storage`                   |
| `S3_ENDPOINT`     | S3/MinIO 端点                 | —                             |
| `S3_BUCKET`       | S3 Bucket 名称                | `openskillhub`                |
| `S3_ACCESS_KEY`   | S3 Access Key                 | —                             |
| `S3_SECRET_KEY`   | S3 Secret Key                 | —                             |
| `NEXT_PUBLIC_API_URL` | API 地址（前端用）        | `http://localhost:3001/api/v1`|

## Docker Compose 部署

```bash
# 启动 PostgreSQL + MinIO
docker compose up -d

# 手动启动后端 + 前端（或取消 docker-compose.yml 中注释的服务）
cd backend && pnpm dev &
cd frontend && pnpm dev &
```

## 开发路线

- [x] **Phase 1** — 核心脚手架 + 上传→存储→下载完整链路
- [x] **Phase 2** — 用户认证、API Key、登录/注册页面、Dashboard
- [x] **Phase 3** — PG 全文搜索 + 搜索筛选 UI + 分类导航页
- [x] **Phase 4** — check-updates、下载统计 API、SVG 趋势图、作者面板
- [x] **Phase 5** — 团队 CRUD、成员管理、可见性访问控制 (public/team/private)、团队页面
- [ ] **Phase 6** — 多 Agent 安装路径适配完善
- [ ] **Phase 7** — S3 存储、Docker 镜像、CI/CD

### 安全加固

- [x] `@fastify/rate-limit` — 全局 100 req/min，登录 10/15min，上传 10/hour
- [x] `zod` 请求校验 — 18 个 schema，覆盖所有路由
- [x] JWT_SECRET 强制 ENV，不含默认值
- [x] 路径穿越/YAML DoS/zip 炸弹防护
- [x] 下载计数 `$transaction` 原子操作
- [x] 启动时环境变量校验 + 优雅退出

## License

MIT
