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
│   │       └── validation.ts # 15 个 Zod schema + validate() helper
│   └── prisma/           # schema + migrations + seed
├── frontend/             # Next.js 前端 (port 3000)
│   └── src/app/          # 3 页面: 首页 / 列表 / 详情(含版本历史+安装指南)
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

## 当前进度 (最后更新: 2026-04-13)

### ✅ 已完成
- **Phase 1 全部**: Monorepo 脚手架、shared 类型、后端 API、前端骨架、local-skill CLI、端到端链路验证
- **Phase 2 部分**: 用户注册/登录 API、API Key 管理、认证中间件、所有权校验
- **Phase 3 完成**: 分类/标签/筛选、**PG 全文搜索**、**搜索筛选 UI**(分类下拉+Agent+排序+标签)、**分类导航页**、首页分类区
- **Phase 4 完成**: check-updates API、local-skill update/rollback、**下载统计 API**、**SVG 趋势图**(30天/90天/26周/12月)、**作者面板**(`/authors/[username]`)
- **Phase 5 部分**: **团队 CRUD API + 成员管理** (owner/admin/member 角色)
- **安全加固**: JWT 强制校验、路径穿越增强、YAML DoS 防护、注册校验、下载原子性、N+1 修复、优雅退出、**@fastify/rate-limit (3 级限速)**、**Zod 请求校验 (15 个 schema)**
- **前端**: 技能详情页重写 + 下载趋势图表 + 搜索筛选 UI + 分类页 + 作者面板

### 🔶 下一步待做
- Phase 2: Web 登录/注册页面、用户 Dashboard
- Phase 5: 技能可见性 (public/team/private) 访问控制、团队页面 (Web)
- Phase 6: 多 Agent 适配完善 (OpenClaw/Claude Code/Cursor 安装路径)
- Phase 7: S3 存储、Docker 镜像、CI/CD

### ⚠️ 已知问题
- `packages/shared` 的 exports 指向 `./src/index.ts` 而非 `./dist/`（因为 tsx dev 模式不编译，生产构建时需改回）
- 远端 `.env` 使用符号链接 `backend/.env → ../.env`
- 前端 `tsconfig.json` 需显式 `baseUrl: "."` 覆盖 monorepo 基础配置

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
