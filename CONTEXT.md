# OpenSkillHub — LLM 开发上下文

> **用途**: 跨设备/跨会话开发时，将此文件作为首条消息喂给 LLM，即可快速接续进度。
> **更新时机**: 每次开发结束前更新此文件并推送。

---

## 项目简介

AI Agent 技能注册中心，基于 [Agent Skills](https://agentskills.io/) 开放标准。
支持 OpenCode / OpenClaw / Claude Code / Cursor 等多个 Agent。
用户可搜索、安装、发布、管理技能包。

## 技术栈

- **Monorepo**: pnpm workspace, TypeScript 5.9
- **后端**: Node.js + Fastify 5 + Prisma 6 + PostgreSQL 17
- **前端**: Next.js 15 (App Router) + React 19
- **存储**: 本地文件系统 (→ S3/MinIO)
- **认证**: JWT + API Key 双模式
- **安全**: @fastify/rate-limit (多级限速) + zod (请求校验)
- **搜索**: PG tsvector + GIN 索引 + 自动更新触发器

## 项目结构

```
openskillhub/
├── backend/              # Fastify API 服务 (port 3001)
│   ├── src/
│   │   ├── app.ts        # 入口 + 中间件 + rate-limit + 启动校验
│   │   ├── routes/       # auth, skills, versions, packages, categories, teams, stats
│   │   ├── storage/      # 抽象层: local / s3
│   │   └── lib/
│   │       ├── prisma.ts # PrismaClient 单例
│   │       ├── validation.ts # 15 个 Zod schema + validate() helper
│   │       ├── errors.ts # AppError 类 + ErrorCode 枚举 + Prisma 错误映射
│   │       └── helpers.ts # 共用查找/权限/格式化 helpers
│   └── prisma/           # schema + migrations + seed
├── frontend/             # Next.js 前端 (port 3000)
│   └── src/
│       ├── app/          # 10 页面: 首页/列表/详情/分类/作者/团队/登录/注册/Dashboard
│       └── lib/          # API client, AuthProvider, hooks, constants, types
├── packages/
│   ├── shared/           # 类型 + 常量
│   └── local-skill/      # SKILL.md + osh.sh CLI
├── BLUEPRINT.md          # 完整设计蓝图 (7 阶段规划)
├── docker-compose.yml    # PG + MinIO
└── CONTEXT.md            # ← 你正在看的这个文件
```

## 远程测试服务器

- **地址**: `ssh root@192.168.20.199` (密码: 74107410)
- **项目路径**: `/root/openskillhub`
- **后端**: http://192.168.20.199:3001
- **前端**: http://192.168.20.199:3000
- **数据库**: Docker 容器 `openskillhub-postgres` (port 5432)
- **Node**: v22.22.0, pnpm: v10.30.3

## GitHub

- **仓库**: https://github.com/SoPudge/openskillhub.git
- **分支**: `main` (稳定), `dev` (开发)

## API 端点 (22 个，全部可用)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册 (email+username+password) |
| POST | /auth/login | 登录 → JWT |
| GET | /auth/me | 当前用户 |
| POST/GET/DELETE | /auth/api-keys | API Key 管理 |
| GET | /skills | 全文搜索/列表 (q→tsvector, category, tag, agent, sort, page) |
| GET | /skills/:name | 详情 |
| POST | /skills | 创建 |
| PATCH/DELETE | /skills/:name | 更新/删除 (需认证+所有权) |
| POST | /skills/check-updates | 批量检查更新 |
| POST/GET | /skills/:name/versions | 版本管理 |
| POST | /skills/:name/versions/:ver/packages | 上传包 (multipart + agent_type) |
| GET | /skills/:name/versions/:ver/packages/:agent | 下载包 |
| GET | /skills/:name/latest/:agent | 下载最新版本包 |
| GET | /skills/:name/stats | 下载统计 (?period=day\|week\|month&days=N) |
| GET | /teams | 列出我的团队 (需认证) |
| POST | /teams | 创建团队 (需认证) |
| GET | /teams/:slug | 团队详情 |
| PATCH | /teams/:slug | 更新团队 (owner/admin) |
| DELETE | /teams/:slug | 删除团队 (仅 owner) |
| GET | /teams/:slug/members | 成员列表 |
| POST | /teams/:slug/members | 添加成员 (owner/admin) |
| DELETE | /teams/:slug/members/:username | 移除成员 (owner/admin/自己离开) |

## 当前进度 (最后更新: 2026-04-17)

### ✅ 已完成
- **Phase 1 全部**: Monorepo 脚手架、shared 类型、后端 API、前端骨架、local-skill CLI、端到端链路验证
- **Phase 2 全部**: 用户注册/登录 API、API Key 管理、认证中间件、所有权校验、**Web 登录/注册页面** (AuthProvider + HeaderNav)、**用户 Dashboard** (技能列表 + API Key 管理 + 统计)
- **Phase 3 全部**: 分类/标签/筛选、**PG 全文搜索**、**搜索筛选 UI**(分类下拉+Agent+排序+标签)、**分类导航页**、首页分类区
- **Phase 4 全部**: check-updates API、local-skill update/rollback、**下载统计 API**、**SVG 趋势图**(30天/90天/26周/12月)、**作者面板**(`/authors/[username]`)
- **Phase 5 全部**: 团队 CRUD API + 成员管理、**可见性访问控制** (public/team/private, optionalAuthenticate)、**团队页面** (`/teams/[slug]`)、技能创建支持 teamId + 成员校验
- **安全加固**: JWT 强制校验、路径穿越增强、YAML DoS 防护、注册校验、下载原子性、N+1 修复、优雅退出、**@fastify/rate-limit (4 级限速: 全局/登录/上传/统计)**、**Zod 请求校验 (18 个 schema)**、**FTS 注入防护**、**trustProxy**、**团队角色升级保护**、**前端 API 超时控制**、**downloadCount 索引**
- **前端 (10 页面)**: 首页、技能列表(筛选)、技能详情(图表)、分类导航、作者面板、团队页面、登录、注册、Dashboard
- **代码质量优化 (2026-04-15)**:
  - 后端: 认证逻辑抽取 `resolveCredentials()` 消除重复、`USER_SELECT` 常量统一用户字段选择、技能删除时 storage 文件清理、版本/成员列表分页 (`PaginationSchema`)、PATCH 技能支持 tags 更新、teams.ts 全面 Zod 校验 (`SlugParamSchema`)、`downloadCount`/`fileSize` 改 BigInt (待迁移)
  - 前端: `API_BASE` 常量提取至 `lib/constants.ts`、`CategoryWithCount`/`SkillWithMeta`/`TeamDetail` 类型整合至 `lib/types.ts`、`AGENT_LABELS` 移入 shared 包统一引用、`SkillFilters` 使用 `AGENT_LABELS` 生成选项
- **日志体系 (2026-04-17)**:
  - Pino 结构化日志: 按 `LOG_LEVEL` 环境变量配置级别，开发用 pino-pretty，生产用 JSON + 敏感字段脱敏 (authorization, x-api-key)
  - 全局错误处理: `setErrorHandler` 捕获所有未处理 5xx 并记录完整错误栈
  - Request ID: `crypto.randomUUID()` 生成，全链路追踪
  - 业务日志覆盖: auth (注册/登录/API Key)、skills (CRUD+权限)、packages (上传/安全检测/下载统计)、versions (创建)、teams (CRUD+成员管理)
  - 优雅退出日志、storage 层 ENOENT 容错
  - 日志文件存储: pino-roll 按日轮转，写入 `<仓库>/logs/app.{日期}.log`，支持 `LOG_DIR` 环境变量自定义路径
- **错误处理体系 (2026-04-17)**:
  - `AppError` 类 + `ErrorCode` 枚举 (27 个错误码，按模块分组: AUTH/SKILL/VERSION/PACKAGE/TEAM/USER)
  - 全局错误处理器：AppError → `{ error, code }` 响应；Prisma P2002/P2025/P2003 自动映射；Fastify 原生错误兜底
  - 所有路由 `reply.status().send({ error })` 统一改为 `throw new AppError(statusCode, code, message)`
  - `authenticate()` 保持 null 返回模式（跨路由共用，未改为 throw）
- **代码 DRY 重构 (2026-04-17)**:
  - 新建 `lib/helpers.ts`: `getSkillOrThrow`, `assertSkillAuthor`, `getVersionOrThrow`, `assertTeamRole`, `upsertTags`, `slugifyTag`, `normalizeFileSize`, `formatSkill`
  - skills.ts: 内联 tag upsert → `upsertTags()`，skill 查找+权限 → helpers，移除本地 `formatSkill`
  - packages.ts: 两个下载 handler 合并为 `sendPackageDownload()` 共享逻辑
  - versions.ts: skill 查找+权限+BigInt 转换 → helpers
  - teams.ts: 重复权限检查 → `assertTeamRole()`
  - stats.ts: 迁移到 AppError 统一错误处理
  - 净减 ~130 行重复代码

### 🔶 下一步待做
- **Prisma 迁移**: `downloadCount`/`fileSize` BigInt 变更尚未生成 migration，需在远程服务器执行 `pnpm --filter backend prisma migrate dev`
- Phase 6: 多 Agent 适配完善 (OpenClaw/Claude Code/Cursor 安装路径)
- Phase 7: S3 存储、Docker 镜像、CI/CD

### ⚠️ 已知问题
- `packages/shared` 的 exports 指向 `./src/index.ts` 而非 `./dist/`（因为 tsx dev 模式不编译，生产构建时需改回）
- 远端 `.env` 使用符号链接 `backend/.env → ../.env`
- 前端 `tsconfig.json` 需显式 `baseUrl: "."` 覆盖 monorepo 基础配置
- 远端 `NEXT_PUBLIC_API_URL` 和 `CORS_ORIGIN` 需设为 `http://192.168.20.199:3001/api/v1` 和 `http://192.168.20.199:3000`（已配置）
- 远端多个后端进程残留时需 `pkill -f "tsx.*app.ts"` 清理后重启
- `downloadCount` / `fileSize` BigInt 迁移待执行 (schema 已改，migration 未创建)

### 测试数据
- **admin 账号**: admin@openskillhub.dev / admin12345
- **团队**: Alpha Team (slug: alpha-team, owner: admin)
- **技能**: git-workflow (public), my-private-notes (private), team-code-review (team/alpha-team)

## 常用命令

```bash
# 本地开发
pnpm install
pnpm --filter backend dev        # 后端
pnpm --filter frontend dev       # 前端

# 数据库
pnpm --filter backend prisma migrate dev   # 迁移
pnpm --filter backend prisma db seed       # 种子

# 远程部署
tar czf /tmp/osh.tar.gz --exclude=node_modules --exclude=.next --exclude=storage . && \
sshpass -p 74107410 scp /tmp/osh.tar.gz root@192.168.20.199:/root/openskillhub/ && \
sshpass -p 74107410 ssh root@192.168.20.199 'cd /root/openskillhub && tar xzf osh.tar.gz && rm osh.tar.gz'

# 远程重启后端
sshpass -p 74107410 ssh root@192.168.20.199 'cd /root/openskillhub && kill $(pgrep -f "tsx.*app.ts") 2>/dev/null; nohup pnpm --filter backend dev > /tmp/osh-backend.log 2>&1 &'

# Git
git push origin dev              # 推送 dev 分支
```

## 给 LLM 的提示

- 详细设计请查看 `BLUEPRINT.md`（约 800 行）
- 后端代码在 `backend/src/`，前端在 `frontend/src/`
- 所有 API 以 `/api/v1/` 为前缀
- 数据库 schema 在 `backend/prisma/schema.prisma`
- 测试时可用远程服务器 curl 验证
