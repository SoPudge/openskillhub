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
- **存储**: 本地文件系统 / S3(MinIO) 可切换 (STORAGE_TYPE 环境变量)
- **认证**: JWT + API Key 双模式
- **安全**: @fastify/rate-limit (多级限速) + zod (请求校验)
- **搜索**: PG tsvector + GIN 索引 + 自动更新触发器

## 项目结构

```
openskillhub/
├── backend/              # Fastify API 服务 (port 3001)
│   ├── src/
│   │   ├── app.ts        # 入口 + 中间件 + rate-limit + 启动校验
│   │   ├── routes/       # auth, skills, versions, packages, categories, teams, stats, admin
│   │   ├── storage/      # 抽象层: local / s3
│   │   └── lib/
│   │       ├── prisma.ts # PrismaClient 单例
│   │       ├── validation.ts # 15+ Zod schema + validate() + validateOrThrow() helper
│   │       ├── errors.ts # AppError 类 + ErrorCode 枚举 + Prisma 错误映射
│   │       └── helpers.ts # 共用查找/权限/格式化/搜索/清理 helpers
│   └── prisma/           # schema + migrations + seed
├── frontend/             # Next.js 前端 (port 3000)
│   └── src/
│       ├── app/          # 15 页面: 首页/列表/详情/分类/作者/团队/登录/注册/Dashboard/Admin(5)
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
- **MinIO**: Docker 容器 `openskillhub-minio-1` (API: 9000, Console: 9001, creds: minioadmin/minioadmin)
- **存储模式**: STORAGE_TYPE=s3 (MinIO)
- **Node**: v22.22.0, pnpm: v10.30.3

## GitHub

- **仓库**: https://github.com/SoPudge/openskillhub.git
- **分支**: `main` (稳定), `dev` (开发)

## API 端点 (36 个，全部可用)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册 (email+username+password) |
| POST | /auth/login | 登录 → JWT (含 role, banned 检查) |
| GET | /auth/me | 当前用户 (含 role) |
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
| **GET** | **/admin/stats** | **系统概览 (30天趋势)** |
| **GET** | **/admin/users** | **用户列表 (搜索+角色+封禁筛选)** |
| **GET** | **/admin/users/:id** | **用户详情** |
| **PATCH** | **/admin/users/:id** | **修改用户 (role/banned/displayName)** |
| **DELETE** | **/admin/users/:id** | **删除用户** |
| **GET** | **/admin/skills** | **技能列表 (含私有)** |
| **PATCH** | **/admin/skills/:name** | **修改技能 (featured/visibility)** |
| **DELETE** | **/admin/skills/:name** | **删除技能** |
| **POST** | **/admin/categories** | **创建分类** |
| **PATCH** | **/admin/categories/:slug** | **修改分类** |
| **DELETE** | **/admin/categories/:slug** | **删除分类** |
| **GET** | **/admin/tags** | **标签列表** |
| **PATCH** | **/admin/tags/:slug** | **重命名标签** |
| **POST** | **/admin/tags/merge** | **合并标签** |
| **DELETE** | **/admin/tags/:slug** | **删除标签** |

## 当前进度 (最后更新: 2026-04-20)

### ✅ 已完成
- **Phase 1 全部**: Monorepo 脚手架、shared 类型、后端 API、前端骨架、local-skill CLI、端到端链路验证
- **Phase 2 全部**: 用户注册/登录 API、API Key 管理、认证中间件、所有权校验、**Web 登录/注册页面** (AuthProvider + HeaderNav)、**用户 Dashboard** (技能列表 + API Key 管理 + 统计)
- **Phase 3 全部**: 分类/标签/筛选、**PG 全文搜索**、**搜索筛选 UI**(分类下拉+Agent+排序+标签)、**分类导航页**、首页分类区
- **Phase 4 全部**: check-updates API、local-skill update/rollback、**下载统计 API**、**SVG 趋势图**(30天/90天/26周/12月)、**作者面板**(`/authors/[username]`)
- **Phase 5 全部**: 团队 CRUD API + 成员管理、**可见性访问控制** (public/team/private, optionalAuthenticate)、**团队页面** (`/teams/[slug]`)、技能创建支持 teamId + 成员校验
- **管理后台 (2026-04-19)**:
  - **DB Schema**: User 新增 `role` (默认 "user") + `banned` 字段; Skill 新增 `featured` 字段
  - **后端 14 个 Admin API**: `/api/v1/admin` 前缀，pre-handler authenticate + requireAdmin 守卫
    - Stats: 系统概览 (用户/技能/下载量 + 30天注册/下载趋势)
    - Users: 列表搜索 (角色+封禁筛选) / 详情 / 修改 (role/banned/displayName) / 删除
    - Skills: 列表 (含私有) / 修改 (featured/visibility) / 删除
    - Categories: 创建 / 修改 / 删除
    - Tags: 列表 / 重命名 / 合并 / 删除
  - **前端 5 个 Admin 页面**: layout (侧边栏+角色守卫) + 概览 (SVG趋势图) + 用户管理 + 技能管理 + 分类管理 + 标签管理
  - **Auth 增强**: 登录封禁检查、响应含 role、HeaderNav 管理员入口链接
  - **远程部署完成**: 迁移已执行, admin 用户已设置 (admin@openskillhub.dev), 后端/前端已重启
- **安全加固**: JWT 强制校验、路径穿越增强、YAML DoS 防护、注册校验、下载原子性、N+1 修复、优雅退出、**@fastify/rate-limit (4 级限速: 全局/登录/上传/统计)**、**Zod 请求校验 (18 个 schema)**、**FTS 注入防护**、**trustProxy**、**团队角色升级保护**、**前端 API 超时控制**、**downloadCount 索引**
- **前端 (15 页面)**: 首页、技能列表(筛选)、技能详情(图表)、分类导航、作者面板、团队页面、登录、注册、Dashboard、**Admin 概览/用户管理/技能管理/分类管理/标签管理**
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
  - `authenticate()` 改为 throw AppError(401) 模式（不再返回 null，路由无需 `if (!userId) return;`）
- **代码 DRY 重构 (2026-04-17)**:
  - 新建 `lib/helpers.ts`: `getSkillOrThrow`, `assertSkillAuthor`, `getVersionOrThrow`, `assertTeamRole`, `upsertTags`, `slugifyTag`, `normalizeFileSize`, `formatSkill`
  - skills.ts: 内联 tag upsert → `upsertTags()`，skill 查找+权限 → helpers，移除本地 `formatSkill`
  - packages.ts: 两个下载 handler 合并为 `sendPackageDownload()` 共享逻辑
  - versions.ts: skill 查找+权限+BigInt 转换 → helpers
  - teams.ts: 重复权限检查 → `assertTeamRole()`
  - stats.ts: 迁移到 AppError 统一错误处理
  - 净减 ~130 行重复代码
- **前端代码审查与修复 (2026-04-19)**:
  - 全量审查 18 个前端源文件 + 3 个 shared 包文件，排查语法错误、类型错误、JSX 闭合、导入缺失
  - 修复: `packages/shared/src/index.ts` 和 `types.ts` 残留 `.js` 扩展名导致 `next build` 失败 (Module not found)
  - 修复: `skills/[name]/page.tsx` 和 `DownloadChart.tsx` 中 `AGENT_LABELS[string]` 索引 `Record<AgentType, string>` 的 TypeScript 类型错误 (添加 `as AgentType` 断言)
  - 修复: `skills/[name]/page.tsx` 中 `checksumSha256` 为 undefined 时显示 "SHA256: undefined" 的问题 (改为条件渲染)
  - 验证: `next build` 编译通过，9 个路由全部成功生成，远程前端服务重启正常 (HTTP 200)
- **后端代码精简优化 (2026-04-20)**:
  - `validateOrThrow<T>()`: 新增验证+抛错一体化 helper，替换全部 ~42 处 `validate()+if(!success)` 模式
  - `deleteSkillWithCleanup()`: 抽取技能删除+存储文件清理逻辑到 helpers.ts，skills.ts 和 admin.ts 共用
  - `authenticate()` 改为直接 throw AppError(401)，移除所有路由中 16 处 `if (!userId) return;` 守卫
  - Admin 技能搜索使用 `fullTextSearchIds()` (tsvector) 替代 LIKE 模糊搜索
  - `SkillListQuerySchema` 改为 `PaginationSchema.extend({...})`，消除重复字段定义
  - `getTeamOrThrow(slug)` 提取到 helpers.ts，teams.ts 5 处复用
  - 净减 88 行代码 (212 insertions, 300 deletions)
- **多 Agent 适配 Phase 6 (2026-04-20)**:
  - `AGENT_META` 常量: 每个 Agent 的安装路径、描述、官网 URL (shared/constants.ts)
  - 技能详情页: 各 Agent 安装路径区块 (按已有包动态展示)、Agent 徽章链接到官网
  - 技能列表页/首页: 每个技能卡片显示支持的 Agent 兼容性绿色徽章
  - osh.sh 已有完整多 Agent 路径检测 (`agent_install_path`)
  - 安装指引: 自然语言 / CLI (含 `--agent` 参数) / 直接下载
- **S3/MinIO 存储 Phase 7 (2026-04-20)**:
  - `S3StorageProvider`: 基于 @aws-sdk/client-s3，实现 save/get/delete/exists 四个方法
  - `storage/index.ts`: 工厂函数支持 `STORAGE_TYPE=s3` 分支，读取 S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY/SECRET_KEY 环境变量
  - MinIO 容器已部署 (docker-compose.yml)，bucket `openskillhub-packages` 已创建
  - 端到端验证通过: 上传→MinIO 存储→下载→MD5 一致
- **Docker 镜像构建 Phase 7 (2026-04-20)**:
  - `Dockerfile.backend`: 多阶段构建 (builder→runtime), pnpm deploy --legacy 打包, Prisma client 手动提取, 最终镜像 ~434MB
  - `Dockerfile.frontend`: 多阶段构建, Next.js standalone 输出, 最终镜像 ~222MB
  - `docker-compose.yml`: 完整编排 — postgres + minio + minio-init(自动创建bucket) + backend + frontend, S3 环境变量注入
  - `.dockerignore`: 排除 node_modules/.next/dist/logs/.env/.git
  - 两个镜像均在远程构建测试通过, 容器启动正常 (backend HTTP 200 API, frontend HTTP 200 页面)
  - `shared` 包 `.js` 扩展名修复: ESM import 需要 `.js` 后缀, Docker build 时 sed 替换 exports 指向 dist/

### 🔶 下一步待做
- Phase 6 剩余: ClawHub 集成探索（OpenClaw clawhub.ai 互操作）
- Phase 7 剩余: 源码部署文档 (环境变量 + systemd/pm2)、CI/CD 流水线

### ⚠️ 已知问题
- `packages/shared` 的 exports 指向 `./src/index.ts` 而非 `./dist/`（因为 tsx dev 模式不编译，生产构建时需改回）
- 远端 `.env` 使用符号链接 `backend/.env → ../.env`
- 前端 `tsconfig.json` 需显式 `baseUrl: "."` 覆盖 monorepo 基础配置
- 远端 `NEXT_PUBLIC_API_URL` 和 `CORS_ORIGIN` 需设为 `http://192.168.20.199:3001/api/v1` 和 `http://192.168.20.199:3000`（已配置）
- 远端多个后端进程残留时需 `pkill -f "tsx.*app.ts"` 清理后重启
- `downloadCount` / `fileSize` BigInt 迁移已完成 (2026-04-20)

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
