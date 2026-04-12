# OpenSkillHub — 开发蓝图

> **一个基于 [Agent Skills](https://agentskills.io/) 开放标准的技能注册中心**
> 让个人和团队存储、分享、发现 AI Agent 技能，并通过本地 skill 实现跨客户端的技能生命周期管理。

---

## 1. 项目愿景

OpenSkillHub 是一个 Agent Skills 的中央仓库（类似 npm 之于 Node.js 包）。
它解决的核心问题：**AI Agent 的技能散落各处，缺乏统一的发现、分发和版本管理机制。**

### 核心价值

| 角色 | 价值 |
|------|------|
| **技能作者** | 编写一次，发布到 Hub，多人多设备共享 |
| **技能使用者** | 搜索安装即用，自动检测更新，一键同步全部设备 |
| **团队/组织** | 私有技能库沉淀团队知识，控制可见性 |
| **Agent 生态** | 遵循 Agent Skills 开放标准，跨 Agent 通用 |

### 支持的 Agent 客户端

| Agent | 仓库 / 官网 | Skill 安装路径 | 格式 |
|-------|-------------|---------------|------|
| **OpenCode** | [anomalyco/opencode](https://github.com/anomalyco/opencode) (142k★) | `.opencode/skills/` · `~/.config/opencode/skills/` · `.agents/skills/` · `.claude/skills/` | Agent Skills 标准 (name+description 必需) |
| **OpenClaw** | [openclaw/openclaw](https://github.com/openclaw/openclaw) (355k★) | `<workspace>/skills/` · `<workspace>/.agents/skills/` · `~/.agents/skills/` · `~/.openclaw/skills/` | AgentSkills 兼容 + OpenClaw 扩展 (metadata.openclaw) |
| **Claude Code** | [code.claude.com](https://code.claude.com) | `~/.claude/skills/` · `.claude/skills/` | Agent Skills 标准 + 扩展 frontmatter |
| **Cursor** | [cursor.com](https://cursor.com) | `.cursor/skills/` | Agent Skills 兼容 |
| **Goose / Amp / 其他** | 参见 agentskills.io | 各自路径 | Agent Skills 标准 |

> **MVP 阶段优先支持 OpenCode**，后续快速适配 OpenClaw 和 Claude Code。

---

## 2. 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| **语言** | TypeScript | 全栈统一 |
| **包管理** | pnpm workspace (Monorepo) | backend / frontend / local-skill / shared / sdk |
| **后端** | Node.js + Fastify | 高性能 REST API，独立服务 |
| **ORM** | Prisma | 类型安全 + 迁移管理 |
| **数据库** | PostgreSQL | 元数据存储 |
| **文件存储** | 本地文件系统 → S3/MinIO | dev 阶段用本地，后续可插拔 |
| **前端** | Next.js 15 (App Router) | SSR/SSG + React，独立应用部署 |
| **认证** | JWT + API Key | Web 登录用 JWT，CLI/Agent 用 API Key |
| **部署** | Docker Compose + 源码部署 | 主力方案；docker compose 一键启动，也支持源码直接部署 |

---

## 3. Monorepo 结构

> 前后端分离架构：`backend/` 和 `frontend/` 是独立应用，分别启动、分别打包、分别部署。

```
openskillhub/
├── pnpm-workspace.yaml
├── package.json                  # root scripts: dev, build, lint, test
├── tsconfig.base.json
├── .env.example
├── docker-compose.yml            # PG + MinIO + backend + frontend 完整编排
├── Dockerfile.backend            # 后端镜像
├── Dockerfile.frontend           # 前端镜像
├── BLUEPRINT.md                  # 本文件
│
├── backend/                      # 后端 API（独立应用）
│   ├── src/
│   │   ├── app.ts                # Fastify 应用入口
│   │   ├── routes/               # API 路由
│   │   │   ├── auth.ts
│   │   │   ├── skills.ts
│   │   │   ├── versions.ts
│   │   │   ├── packages.ts
│   │   │   ├── categories.ts
│   │   │   └── stats.ts
│   │   ├── services/             # 业务逻辑
│   │   ├── middleware/           # 认证、错误处理
│   │   ├── storage/              # 文件存储抽象层
│   │   │   ├── interface.ts      # IStorageProvider
│   │   │   ├── local.ts          # 本地文件系统
│   │   │   └── s3.ts             # S3/MinIO
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # Next.js 前端（独立应用）
│   ├── src/
│   │   ├── app/                  # App Router 页面
│   │   │   ├── page.tsx                    # 首页：热门/最新技能
│   │   │   ├── skills/
│   │   │   │   ├── page.tsx                # 技能列表/搜索
│   │   │   │   └── [name]/page.tsx         # 技能详情
│   │   │   ├── categories/[slug]/page.tsx  # 分类页
│   │   │   ├── auth/                       # 登录/注册
│   │   │   └── dashboard/                  # 用户面板
│   │   ├── components/
│   │   └── lib/                  # API client, hooks
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   ├── shared/                   # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/            # Skill, User, Version 等类型定义
│   │   │   ├── constants/        # Agent 类型枚举、错误码
│   │   │   └── validators/       # Zod schemas
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                      # TypeScript SDK
│   │   ├── src/
│   │   │   ├── client.ts         # API Client 类
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── local-skill/              # 本地管理技能 (Agent Skills 格式)
│       ├── openskillhub/         # <- 这是技能目录
│       │   ├── SKILL.md          # 主指令文件
│       │   ├── scripts/
│       │   │   ├── osh.sh        # 核心 CLI wrapper
│       │   │   ├── install.sh    # 安装技能
│       │   │   ├── uninstall.sh  # 卸载技能
│       │   │   ├── update.sh     # 更新检测 & 执行
│       │   │   ├── search.sh     # 搜索技能
│       │   │   ├── publish.sh    # 创建 & 上传技能
│       │   │   └── list.sh       # 列出已安装技能
│       │   └── references/
│       │       ├── API.md        # API 参考文档
│       │       └── AGENTS.md     # 各 Agent 安装路径说明
│       ├── package.json
│       └── README.md
│
└── scripts/                      # 开发脚本
    ├── setup.sh                  # 初始化开发环境
    └── seed.ts                   # 数据库种子数据
```

> **pnpm workspace 配置**：`backend/`、`frontend/`、`packages/*` 均为 workspace 成员。
> `backend` 和 `frontend` 通过 `@openskillhub/shared` 共享类型，但各自独立打包发布。

---

## 4. 数据库设计

### ER 关系图

```
┌─────────┐       ┌──────────────┐       ┌────────────────┐
│  users   │──1:N──│    skills     │──1:N──│ skill_versions │
└─────────┘       └──────────────┘       └────────────────┘
     │                   │                        │
     │ 1:N               │ M:N                    │ 1:N
     ▼                   ▼                        ▼
┌──────────┐     ┌──────────────────┐    ┌─────────────────┐
│ api_keys │     │ skill_tag_rels   │    │ skill_packages  │
└──────────┘     └──────────────────┘    └─────────────────┘
                         │                        │
     ┌─────────┐         │                        │ 1:N
     │  teams  │──M:N──┐ │ M:1                    ▼
     └─────────┘       │ ▼                ┌─────────────────┐
          │        ┌─────────┐            │ download_stats  │
          │ 1:N    │  tags   │            └─────────────────┘
          ▼        └─────────┘
   ┌──────────────┐
   │ team_members │         ┌────────────┐
   └──────────────┘         │ categories │──自引用(parent)
                            └────────────┘
```

### 核心表结构

```sql
-- 用户
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(128),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys (设备同步 & Agent 认证)
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(128) NOT NULL,        -- "MacBook Pro", "Work Desktop"
  key_hash    VARCHAR(255) NOT NULL UNIQUE,  -- bcrypt hash of the key
  key_prefix  VARCHAR(8) NOT NULL,           -- 前 8 字符用于识别 "osh_a1b2..."
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 团队
CREATE TABLE teams (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(128) NOT NULL,
  slug      VARCHAR(64) UNIQUE NOT NULL,
  owner_id  UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',   -- owner, admin, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- 分类（支持层级）
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(64) NOT NULL,
  slug        VARCHAR(64) UNIQUE NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id),
  sort_order  INT DEFAULT 0
);

-- 标签
CREATE TABLE tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) UNIQUE NOT NULL,
  slug VARCHAR(64) UNIQUE NOT NULL
);

-- 技能（核心实体）
CREATE TABLE skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(64) UNIQUE NOT NULL,   -- 全局唯一标识，同 Agent Skills name
  display_name  VARCHAR(128) NOT NULL,
  description   TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES users(id),
  team_id       UUID REFERENCES teams(id),     -- NULL = 个人技能
  category_id   UUID REFERENCES categories(id),
  visibility    VARCHAR(10) DEFAULT 'public',  -- public, team, private
  homepage_url  TEXT,                           -- 可选：源码仓库
  license       VARCHAR(64),
  download_count BIGINT DEFAULT 0,             -- 冗余计数，定期同步
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 技能版本
CREATE TABLE skill_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version     VARCHAR(32) NOT NULL,            -- "1.0.0", "1.1.0"
  changelog   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, version)
);

-- 技能包（每个版本 × 每个 Agent 一个 zip）
CREATE TABLE skill_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_version_id  UUID NOT NULL REFERENCES skill_versions(id) ON DELETE CASCADE,
  agent_type        VARCHAR(32) NOT NULL,       -- 'opencode', 'openclaw', 'claude-code', 'cursor'...
  file_path         TEXT NOT NULL,               -- 存储路径
  file_size         BIGINT NOT NULL,
  checksum_sha256   VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_version_id, agent_type)
);

-- 技能-标签关联
CREATE TABLE skill_tag_relations (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, tag_id)
);

-- 下载统计
CREATE TABLE download_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_package_id  UUID NOT NULL REFERENCES skill_packages(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),  -- NULL = 匿名下载
  ip_hash           VARCHAR(64),                 -- 隐私保护，hash 后存储
  user_agent        VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_visibility ON skills(visibility);
CREATE INDEX idx_skills_author ON skills(author_id);
CREATE INDEX idx_skills_category ON skills(category_id);
CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX idx_skill_packages_version ON skill_packages(skill_version_id);
CREATE INDEX idx_download_stats_package ON download_stats(skill_package_id);
CREATE INDEX idx_download_stats_created ON download_stats(created_at);

-- 全文搜索
ALTER TABLE skills ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
```

---

## 5. API 设计

### 基础信息

```
Base URL:  http://localhost:3001/api/v1
认证方式:  Bearer <jwt_token>  或  X-API-Key: osh_xxxxxxxx
内容类型:  application/json（上传用 multipart/form-data）
```

### 认证 (Auth)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 注册 | 无 |
| POST | `/auth/login` | 登录，返回 JWT | 无 |
| POST | `/auth/refresh` | 刷新 token | JWT |
| GET | `/auth/me` | 当前用户信息 | JWT / API Key |
| POST | `/auth/api-keys` | 创建 API Key | JWT |
| GET | `/auth/api-keys` | 列出 API Keys | JWT |
| DELETE | `/auth/api-keys/:id` | 删除 API Key | JWT |

### 技能 (Skills)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/skills` | 列表/搜索 | 无（公开） |
| GET | `/skills/:name` | 详情（含版本列表、支持的 Agent） | 无（公开） |
| POST | `/skills` | 创建技能 | 需要 |
| PATCH | `/skills/:name` | 更新元数据 | 需要（作者） |
| DELETE | `/skills/:name` | 删除技能 | 需要（作者） |

**GET /skills 查询参数:**

```
?q=keyword          # 全文搜索
&category=devops    # 分类 slug
&tag=git,testing    # 标签（逗号分隔）
&agent=opencode     # 筛选支持特定 Agent 的技能
&visibility=public  # 可见性
&sort=downloads     # 排序：downloads, newest, updated, name
&page=1&limit=20    # 分页
```

### 版本 (Versions)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/skills/:name/versions` | 版本列表 | 无 |
| POST | `/skills/:name/versions` | 发布新版本 | 需要 |
| GET | `/skills/:name/versions/:version` | 版本详情 | 无 |

### 包 (Packages)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/skills/:name/versions/:version/packages` | 上传包（multipart, 含 agent_type） | 需要 |
| GET | `/skills/:name/versions/:version/packages/:agent` | 下载特定版本包 | 无 |
| GET | `/skills/:name/latest/:agent` | 下载最新版本包 | 无 |

### 分类 & 标签

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/categories` | 分类树 | 无 |
| GET | `/tags` | 标签列表 | 无 |
| GET | `/tags/popular` | 热门标签 | 无 |

### 统计

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/skills/:name/stats` | 技能统计（下载趋势等） | 无 |
| GET | `/stats/popular` | 热门技能排行 | 无 |

### 更新检测

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/skills/check-updates` | 批量检测更新 | 无 |

**请求体:**
```json
{
  "installed": [
    { "name": "git-workflow", "version": "1.0.0", "agent": "opencode" },
    { "name": "code-review", "version": "2.1.0", "agent": "opencode" }
  ]
}
```

**响应:**
```json
{
  "updates": [
    {
      "name": "git-workflow",
      "current": "1.0.0",
      "latest": "1.2.0",
      "changelog": "Added rebase support..."
    }
  ]
}
```

---

## 6. Skill 包格式规范

### 标准结构

每个 zip 包内是一个符合 [Agent Skills 规范](https://agentskills.io/specification) 的目录：

```
skill-name/
├── SKILL.md              # 必需：YAML frontmatter + Markdown 指令
├── scripts/              # 可选：可执行脚本
│   ├── setup.sh
│   └── helper.py
├── references/           # 可选：参考文档
│   └── REFERENCE.md
└── assets/               # 可选：模板、资源
    └── template.md
```

### SKILL.md 格式

```yaml
---
name: my-skill                    # 必需：小写字母+数字+连字符，1-64字符
description: |                    # 必需：描述技能用途 & 何时使用
  Explains code with visual diagrams. Use when explaining how code works.
license: MIT                      # 可选
compatibility: Requires Python 3  # 可选：环境要求
metadata:                         # 可选：自定义元数据
  author: your-username
  version: "1.0.0"
---

# My Skill

实际的指令内容...
```

### 命名约定

| 组成 | 规则 |
|------|------|
| Skill 名 | 小写字母、数字、连字符，1-64 字符，匹配 `^[a-z][a-z0-9-]*[a-z0-9]$` |
| 版本号 | 简单 semver: `major.minor.patch` (如 `1.0.0`) |
| 包文件名 | `{name}-{version}-{agent}.zip` (如 `git-workflow-1.2.0-opencode.zip`) |
| Agent 类型 | `opencode`, `openclaw`, `claude-code`, `cursor`, `goose`, `amp` 等 |

### 上传流程

```
1. 创建技能 (POST /skills)  — 首次
2. 创建版本 (POST /skills/:name/versions)
3. 上传包   (POST /skills/:name/versions/:version/packages)
   - multipart/form-data
   - field: file (zip), agent_type (string)
   - 服务端验证：解压检查 SKILL.md 存在、frontmatter 合法、name 匹配
```

---

## 7. 本地 Skill 设计

"本地 Skill" 本身就是一个 Agent Skills 格式的技能，名为 `openskillhub`。
安装到用户的全局技能目录后，Agent 就获得了与 Hub 交互的能力。

### SKILL.md 核心设计

```yaml
---
name: openskillhub
description: |
  Manage AI agent skills from OpenSkillHub. Use when the user wants to search,
  install, update, remove, publish, or manage skills from the OpenSkillHub registry.
  Handles skill lifecycle including version management and multi-device sync.
metadata:
  author: openskillhub
  version: "0.1.0"
---
```

### 本地 Skill 赋予 Agent 的能力

| 命令 | 功能 | 示例 |
|------|------|------|
| `search` | 搜索 Hub 上的技能 | `bash $SKILL_DIR/scripts/osh.sh search "git workflow"` |
| `install` | 安装技能到当前 Agent 目录 | `bash $SKILL_DIR/scripts/osh.sh install git-workflow` |
| `update` | 检查并更新已安装技能 | `bash $SKILL_DIR/scripts/osh.sh update` |
| `update <name>` | 更新指定技能 | `bash $SKILL_DIR/scripts/osh.sh update git-workflow` |
| `remove` | 卸载技能 | `bash $SKILL_DIR/scripts/osh.sh remove git-workflow` |
| `list` | 列出已安装技能及版本 | `bash $SKILL_DIR/scripts/osh.sh list` |
| `info` | 查看技能详情 | `bash $SKILL_DIR/scripts/osh.sh info git-workflow` |
| `publish` | 打包并上传技能 | `bash $SKILL_DIR/scripts/osh.sh publish ./my-skill opencode` |
| `rollback` | 回退到指定版本 | `bash $SKILL_DIR/scripts/osh.sh rollback git-workflow 1.0.0` |
| `config` | 配置 Hub URL / API Key | `bash $SKILL_DIR/scripts/osh.sh config set api_key osh_xxx` |

### 本地状态管理

```
~/.config/openskillhub/
├── config.json          # Hub URL, API Key, 默认 Agent 类型
├── installed.json       # 已安装技能清单 (name, version, agent, installed_at)
└── cache/               # 下载缓存
```

**config.json:**
```json
{
  "hub_url": "https://hub.openskillhub.io",
  "api_key": "osh_a1b2c3d4...",
  "default_agent": "opencode",
  "auto_update_check": true
}
```

**installed.json:**
```json
{
  "skills": [
    {
      "name": "git-workflow",
      "version": "1.2.0",
      "agent": "opencode",
      "install_path": "~/.config/opencode/skills/git-workflow",
      "installed_at": "2026-04-12T10:00:00Z"
    }
  ]
}
```

### 安装目标路径自动识别

脚本根据 `default_agent` 或 `--agent` 参数自动确定安装路径：

| Agent | 全局路径 | 项目路径 |
|-------|---------|---------|
| opencode | `~/.config/opencode/skills/` | `.opencode/skills/` |
| openclaw | `~/.openclaw/skills/` · `~/.agents/skills/` | `<workspace>/skills/` · `<workspace>/.agents/skills/` |
| claude-code | `~/.claude/skills/` | `.claude/skills/` |
| cursor | `~/.cursor/skills/` (待确认) | `.cursor/skills/` |

---

## 8. Web 前端设计

### 页面结构

| 页面 | 路径 | 功能 |
|------|------|------|
| **首页** | `/` | 热门技能、最新发布、分类导航 |
| **技能列表** | `/skills` | 搜索、筛选（分类/标签/Agent）、排序 |
| **技能详情** | `/skills/[name]` | README、版本历史、支持 Agent 列表、安装指令、下载统计 |
| **分类页** | `/categories/[slug]` | 某分类下的技能列表 |
| **登录/注册** | `/auth/login` `/auth/register` | 用户认证 |
| **Dashboard** | `/dashboard` | 我的技能、API Key 管理、下载统计 |
| **发布** | `/dashboard/publish` | 创建/编辑技能、上传包 |
| **团队** | `/teams/[slug]` | 团队主页（后续） |

### 技能详情页要素

```
┌─────────────────────────────────────────────────────────┐
│  📦 git-workflow                          ⬇ 1,234 下载  │
│  一键管理 Git 工作流的 AI 技能                          │
│  by @zhangsan · MIT · v1.2.0 · 2 天前更新              │
│                                                         │
│  [OpenCode ✓] [OpenClaw ✓] [Claude Code ✓] [Cursor ✗]   │
├─────────────────────────────────────────────────────────┤
│  安装方式 │ 版本历史 │ 统计                              │
├───────────┴──────────┴──────────────────────────────────┤
│                                                         │
│  在 OpenCode 中安装:                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │ bash ~/...osh.sh install git-workflow       │  📋    │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  或手动下载:                                            │
│  ┌─────────────────────────────────────────────┐        │
│  │ git-workflow-1.2.0-opencode.zip  (12.3 KB)     │  ⬇    │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  ─── README ───                                         │
│  # Git Workflow Skill                                   │
│  这个技能帮助你管理 Git 工作流...                       │
│                                                         │
│  ─── 标签 ───                                           │
│  [git] [workflow] [devops] [version-control]            │
└─────────────────────────────────────────────────────────┘
```

---

## 9. 开发阶段规划

### Phase 1: 基础设施 (Foundation) ✅ 完成

> **目标: 跑通"上传 → 存储 → 下载"完整链路**

- [x] 初始化 Monorepo 脚手架 (pnpm workspace + tsconfig + prettier)
- [x] `packages/shared`: 定义核心类型 (Skill, Version, Package, AgentType)
- [x] `backend/`: Fastify 应用骨架 + Prisma schema 定义
- [x] `docker-compose.yml`: PostgreSQL + MinIO 服务
- [x] 实现文件存储抽象层 (LocalStorageProvider)
- [x] 实现核心 API:
  - Skills CRUD (创建/搜索/详情/更新/删除)
  - Versions 创建 & 列表
  - Packages 上传 (zip) & 下载 (按版本+agent / latest)
  - 上传时验证 zip 内容 (解压检查 SKILL.md)
- [x] `frontend/`: Next.js 骨架 + 技能列表页 + 技能详情页
- [x] `packages/local-skill`: 完成 SKILL.md + osh.sh 脚本
  - search, install, update, remove, list, info, publish, rollback, config 全部 9 个命令
  - 适配 OpenCode / OpenClaw / Claude Code / Cursor / Goose / Amp
- [x] 验证完整链路 (远程服务器端到端测试全部通过)

**Phase 1 总结 (2026-04-12)**:
- 后端 12 个 API 端点全部可用，通过 curl 端到端验证
- 前端 3 个页面正常渲染（首页 / 列表页 / 详情页）
- 修复了 BigInt 序列化、check-updates 字段名、shared 包导入等问题
- 已部署至测试服务器验证

**安全加固 (2026-04-12)**:
- 移除硬编码 JWT Secret，启动时强制校验环境变量
- Zip 路径穿越检测增强（绝对路径、null 字节、反斜杠）
- YAML 解析增加 `maxAliasCount` 限制防止 DoS
- 未认证请求强制只返回 public skill
- 下载计数改用 `$transaction` 保证原子性
- 注册接口增加邮箱/密码/用户名校验
- check-updates 消除 N+1 查询（批量 findMany）
- 支持 semver 预发布版本号
- Prisma 进程优雅退出

### Phase 2: 用户体系 (User System) 🔶 部分完成

> **目标: 注册用户可以发布和管理自己的技能**

- [x] 用户注册/登录 API (bcrypt + JWT)
- [x] API Key 管理 (创建/列出/删除)
- [x] 认证中间件 (JWT + API Key 双模式)
- [ ] Web 登录/注册页面
- [ ] 用户 Dashboard (我的技能列表)
- [x] 技能所有权校验 (仅作者可编辑/删除)
- [x] local-skill 支持 `config` 和 `publish` 命令

### Phase 3: 发现与分发 (Discovery) 🔶 部分完成

> **目标: 用户能高效找到需要的技能**

- [x] 分类系统 (CRUD + 技能关联 + 8 个种子分类)
- [x] 标签系统 (创建时关联 + 热门标签 API)
- [ ] 全文搜索 (PG tsvector) — 当前使用 ILIKE 模糊匹配
- [x] 按 Agent 类型筛选
- [x] 排序 (下载量 / 最新 / 更新时间)
- [ ] Web 搜索/筛选 UI (基础列表已有，筛选 UI 待完善)
- [x] 首页热门/最新推荐
- [ ] 分类导航页面

### Phase 4: 版本与生命周期 (Lifecycle) 🔶 部分完成

> **目标: 完成技能的全生命周期管理**

- [x] 版本比对 & 更新检测 API (`/skills/check-updates`)
- [x] local-skill update 命令 (自动检测 + 执行更新)
- [x] local-skill rollback 命令 (降级到指定版本)
- [ ] 下载统计收集与展示 (基础计数已有，DownloadStat 详细统计待实现)
- [ ] 技能详情页版本历史 & changelog
- [ ] Web 统计图表 (下载趋势)
- [ ] 技能作者数据面板

### Phase 5: 团队与可见性 (Team)

> **目标: 支持团队协作和私有技能**

- [ ] 团队创建/管理
- [ ] 团队成员角色 (owner/admin/member)
- [ ] 技能可见性: public / team / private (schema 已支持 visibility 字段)
- [ ] 可见性访问控制中间件
- [ ] 团队页面 (Web)
- [ ] 评分 & 评论系统 (后续考虑)

### Phase 6: 多 Agent 支持与完善 (Multi-Agent)

> **目标: 扩展到 OpenClaw、Claude Code、Cursor 等更多 Agent**

- [ ] 适配 OpenClaw skill 安装路径 (`<workspace>/skills/`, `~/.openclaw/skills/`) & metadata.openclaw 扩展
- [ ] 适配 Claude Code skill 安装路径 & frontmatter 差异
- [ ] 适配 Cursor skill 安装
- [x] local-skill 的 `--agent` 参数 (osh.sh 已实现多 Agent 路径检测)
- [ ] 按 Agent 类型的安装指引 (Web 详情页)
- [ ] 技能跨 Agent 兼容性标记
- [ ] ClawHub 集成探索（OpenClaw 已有 clawhub.ai 技能市场，考虑如何互操作）

### Phase 7: 生产就绪 (Production)

> **目标: 可部署、可运维**

- [ ] S3/MinIO 存储适配 (接口已定义，S3 实现待编写)
- [ ] Dockerfile.backend + Dockerfile.frontend 镜像构建
- [ ] Docker Compose 完整编排 (backend + frontend + PG + MinIO)
- [ ] 源码部署文档 (环境变量 + systemd/pm2 配置)
- [x] 环境变量管理 & 配置优化 (启动校验已实现)
- [ ] Rate limiting
- [x] 输入验证加固 (zip 路径穿越、YAML DoS、注册校验、10MB 上限)
- [ ] CI/CD 流水线
- [ ] 监控 & 日志

---

## 10. 关键设计决策

### 10.1 为什么遵循 Agent Skills 开放标准？

Agent Skills 已被 Claude Code、OpenCode、OpenClaw、Cursor、Goose、Amp、JetBrains Junie 等主流 Agent 采纳。
遵循标准意味着：
- **免适配成本**: 发布一个标准格式的 skill，大部分 Agent 直接可用
- **生态兼容**: 与 anthropics/skills 等社区资源兼容
- **面向未来**: 新 Agent 采纳标准后自动兼容

### 10.2 为什么每个 Agent 一个包而非统一包？

虽然基础格式相同（SKILL.md），但不同 Agent 有扩展差异：
- Claude Code 支持 `context: fork`, `agent`, `hooks` 等额外 frontmatter
- OpenCode 支持 `allowed-tools`，有原生 `skill` 工具进行按需加载
- OpenClaw 支持 `metadata.openclaw` 扩展（依赖检测、安装器、环境过滤）
- 指令内容可能因 Agent 工具差异而不同（如引用不同的 shell 命令）

一个 skill 的 OpenCode 版和 Claude Code 版 SKILL.md 可能有 80% 相同，但 20% 的差异需要分包。

### 10.3 本地 Skill vs MCP Server vs CLI

| 方案 | 优点 | 缺点 |
|------|------|------|
| **本地 Skill (✓选)** | 零安装成本、Agent 原生集成、纯提示词驱动 | 需要 Agent 支持 bash 工具 |
| MCP Server | 结构化工具、类型安全 | 需要额外进程、配置复杂 |
| CLI 二进制 | 高性能、跨平台 | 需要编译分发、安装步骤 |

选择本地 Skill 因为：
1. **零摩擦**: 复制一个目录到 skills 路径即可
2. **自解释**: Agent 读 SKILL.md 就知道怎么用
3. **可演进**: 后续可加 MCP Server 作为增强方案

### 10.4 文件存储策略

```
开发阶段: ./storage/packages/{name}/{version}/{name}-{version}-{agent}.zip
                                                 ↓ (Phase 7)
生产阶段: S3://openskillhub-packages/{name}/{version}/{name}-{version}-{agent}.zip
```

通过 `IStorageProvider` 接口抽象，切换存储仅改配置。

---

## 11. 安全考量

| 威胁 | 防护措施 | 状态 |
|------|---------|------|
| Zip 炸弹 | 限制上传大小 (10MB)、解压后大小限制、限制文件数 | ✅ 10MB 上限已实现 |
| 路径穿越 | 验证 zip 内文件路径不含 `../`、`/`、`\0`、`\\` | ✅ 已实现 |
| YAML DoS | `maxAliasCount` 限制解析深度 | ✅ 已实现 |
| 恶意脚本 | SKILL.md 的 scripts/ 由 Agent 在沙盒执行，Hub 不执行任何脚本 | ✅ 设计保证 |
| SQL 注入 | Prisma ORM 参数化查询 | ✅ 已实现 |
| XSS | Next.js 默认转义、CSP 头 | 🔶 默认转义已有，CSP 待配置 |
| 暴力破解 | 登录 rate limit、API Key 哈希存储 | 🔶 哈希已有，rate limit 待加 |
| IDOR | 所有资源操作校验所有权 | ✅ 已实现 |
| 敏感信息泄露 | API Key 仅在创建时返回原文，后续仅显示前缀 | ✅ 已实现 |
| 环境变量泄露 | 启动时强制校验 `JWT_SECRET`、`DATABASE_URL` | ✅ 已实现 |
| 输入注入 | 注册接口邮箱/密码/用户名格式校验 | ✅ 已实现 |
| 私有数据泄露 | 未认证请求强制只返回 public visibility 的 skill | ✅ 已实现 |

---

## 12. 启动命令

### 源码开发模式

```bash
# 开发环境启动
pnpm install
docker compose up -d postgres minio  # 启动 PG + MinIO
pnpm --filter @openskillhub/backend prisma migrate dev  # 数据库迁移
pnpm dev                             # 并行启动 backend + frontend

# 单独启动
pnpm --filter @openskillhub/backend dev   # http://localhost:3001
pnpm --filter @openskillhub/frontend dev  # http://localhost:3000
```

### Docker Compose 部署

```bash
# 一键启动所有服务
docker compose up -d

# 包含：backend (3001) + frontend (3000) + postgres (5432) + minio (9000)
# 前端通过环境变量 NEXT_PUBLIC_API_URL 指向后端
```

### 源码部署（无 Docker）

```bash
# 构建
pnpm build

# 后端（pm2 / systemd 管理）
cd backend && node dist/app.js

# 前端（Next.js standalone）
cd frontend && node .next/standalone/server.js
```

---

## 附录 A: 初始分类体系（种子数据）

| 分类 | Slug | 描述 |
|------|------|------|
| 开发工具 | `dev-tools` | Git、CI/CD、构建、调试 |
| 代码质量 | `code-quality` | 代码审查、测试、Lint、重构 |
| 文档 | `documentation` | README、API 文档、注释 |
| DevOps | `devops` | Docker、K8s、部署、监控 |
| 数据库 | `database` | SQL、迁移、建模 |
| 前端 | `frontend` | React、Vue、CSS、UI |
| 后端 | `backend` | API、架构、性能 |
| AI/ML | `ai-ml` | 提示词工程、模型、数据 |
| 安全 | `security` | 审计、漏洞扫描、加固 |
| 工作流 | `workflow` | 项目管理、自动化、脚本 |

## 附录 B: Agent 格式差异速查

| 特性 | Agent Skills 标准 | OpenCode (anomalyco) | OpenClaw | Claude Code |
|------|-------------------|---------------------|----------|-------------|
| 入口文件 | `SKILL.md` | `SKILL.md` | `SKILL.md` | `SKILL.md` |
| name | ✅ 必需 | ✅ 必需 | ✅ 必需 | ✅ 必需 |
| description | ✅ 必需 | ✅ 必需 | ✅ 必需 | ✅ 推荐 |
| license | ✅ 可选 | ✅ 可选 | ❌ | ❌ |
| compatibility | ✅ 可选 | ✅ 可选 | ❌ | ❌ |
| metadata | ✅ 可选 | ✅ 可选 | ✅ `metadata.openclaw` (依赖、安装器、环境过滤) | ❌ |
| allowed-tools | ✅ (实验性) | ✅ | ❌ | ✅ |
| context: fork | ❌ | ❌ | ❌ | ✅ 子代理执行 |
| agent | ❌ | ❌ | ❌ | ✅ 指定子代理类型 |
| hooks | ❌ | ❌ | ❌ | ✅ 生命周期钩子 |
| disable-model-invocation | ❌ | ❌ | ✅ | ✅ |
| user-invocable | ❌ | ❌ | ✅ (斜杠命令控制) | ✅ 控制菜单可见性 |
| paths | ❌ | ❌ | ❌ | ✅ 路径匹配激活 |
| `!command` 动态注入 | ❌ | ❌ | ❌ | ✅ Shell 预执行 |
| `$ARGUMENTS` 替换 | ❌ | ❌ | ❌ | ✅ |
| `{baseDir}` 占位符 | ❌ | ❌ | ✅ 引用技能目录 | ❌ |
| 原生 skill 工具 | ❌ | ✅ 按需加载 skill | ❌ (通过斜杠命令) | ❌ |
| 技能市场 | agentskills.io | ❌ | ✅ ClawHub (clawhub.ai) | ❌ |
| 全局路径 | `~/.config/agents/skills/` | `~/.config/opencode/skills/` · `~/.config/agents/skills/` · `~/.claude/skills/` | `~/.openclaw/skills/` · `~/.agents/skills/` | `~/.claude/skills/` |
| 项目路径 | `.agents/skills/` | `.opencode/skills/` · `.agents/skills/` · `.claude/skills/` | `<workspace>/skills/` · `<workspace>/.agents/skills/` | `.claude/skills/` |

> **注**: OpenCode 兼容 `.claude/skills/` 和 `.agents/skills/` 路径，这意味着为 Claude Code 打包的 skill 也可被 OpenCode 发现。
> OpenClaw 兼容 `~/.agents/skills/` 和 `<workspace>/.agents/skills/`，与 Agent Skills 标准路径一致。
