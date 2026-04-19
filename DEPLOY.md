# OpenSkillHub — 部署指南

本文档涵盖 **Docker Compose 一键部署** 和 **源码部署** 两种方式。

---

## 1. 系统要求

| 组件 | 最低版本 |
|------|---------|
| Node.js | 20+ (推荐 22 LTS) |
| pnpm | 10+ |
| PostgreSQL | 15+ (推荐 17) |
| Docker / Docker Compose | 24+ / v2 (Docker 部署时) |

---

## 2. Docker Compose 部署（推荐）

### 2.1 克隆项目

```bash
git clone https://github.com/SoPudge/openskillhub.git
cd openskillhub
```

### 2.2 配置环境变量

```bash
# 创建 .env 文件（docker compose 自动加载）
cat > .env << 'EOF'
JWT_SECRET=your-strong-random-secret-here
CORS_ORIGIN=http://your-domain:3000
NEXT_PUBLIC_API_URL=http://your-domain:3001/api/v1
STORAGE_TYPE=s3
EOF
```

> **安全提示**: `JWT_SECRET` 必须是强随机字符串，推荐 `openssl rand -hex 32` 生成。

### 2.3 启动全部服务

```bash
docker compose up -d
```

这将启动 5 个服务：
- **postgres** (5432) — PostgreSQL 17 数据库
- **minio** (9000/9001) — MinIO 对象存储
- **minio-init** — 自动创建存储桶（运行后退出）
- **backend** (3001) — Fastify API 服务
- **frontend** (3000) — Next.js 前端

### 2.4 初始化数据库

```bash
# 首次部署：执行数据库迁移
docker compose exec backend npx prisma migrate deploy

# 可选：导入种子数据
docker compose exec backend npx prisma db seed
```

### 2.5 验证

```bash
# 检查服务状态
docker compose ps

# 测试 API
curl http://localhost:3001/api/v1/skills

# 访问前端
open http://localhost:3000
```

### 2.6 仅启动基础设施（开发模式）

```bash
# 只启动 PG + MinIO，后端/前端用源码运行
docker compose up -d postgres minio minio-init
```

---

## 3. 源码部署

### 3.1 前置准备

```bash
# 安装 Node.js 22 (以 Ubuntu 为例)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 安装 PostgreSQL 17
sudo apt install -y postgresql-17
```

### 3.2 克隆 & 安装依赖

```bash
git clone https://github.com/SoPudge/openskillhub.git
cd openskillhub
pnpm install
```

### 3.3 配置环境变量

在项目根目录创建 `.env` 文件（后端通过 `dotenv` 自动加载）：

```bash
cat > .env << 'EOF'
# ─── 必填 ───────────────────────────────
DATABASE_URL=postgresql://openskillhub:your-db-password@localhost:5432/openskillhub
JWT_SECRET=your-strong-random-secret-here

# ─── 可选 (有默认值) ─────────────────────
NODE_ENV=production
SERVER_PORT=3001
SERVER_HOST=0.0.0.0
CORS_ORIGIN=http://your-domain:3000

# ─── 存储 ────────────────────────────────
# 本地存储 (默认)
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./storage

# 或 S3/MinIO 存储
# STORAGE_TYPE=s3
# S3_ENDPOINT=http://localhost:9000
# S3_REGION=us-east-1
# S3_BUCKET=openskillhub-packages
# S3_ACCESS_KEY=minioadmin
# S3_SECRET_KEY=minioadmin
# S3_FORCE_PATH_STYLE=true

# ─── 认证 ────────────────────────────────
JWT_EXPIRES_IN=7d

# ─── 日志 ────────────────────────────────
LOG_LEVEL=info
LOG_DIR=./logs
EOF
```

在 `backend/` 下创建符号链接（后端 dotenv 从 CWD 加载）：

```bash
ln -sf ../.env backend/.env
```

前端环境变量：

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://your-domain:3001/api/v1
EOF
```

### 3.4 初始化数据库

```bash
# 创建数据库用户和库
sudo -u postgres psql -c "CREATE USER openskillhub WITH PASSWORD 'your-db-password';"
sudo -u postgres psql -c "CREATE DATABASE openskillhub OWNER openskillhub;"

# 执行迁移
cd backend && npx prisma migrate deploy && cd ..

# 可选：导入种子数据
cd backend && npx prisma db seed && cd ..
```

### 3.5 构建

```bash
# 构建 shared 包
pnpm --filter @openskillhub/shared build

# 构建后端
pnpm --filter @openskillhub/backend build

# 构建前端
pnpm --filter @openskillhub/frontend build
```

### 3.6 启动服务

#### 方式 A: systemd（推荐生产环境）

**后端 service** — `/etc/systemd/system/openskillhub-backend.service`：

```ini
[Unit]
Description=OpenSkillHub Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=openskillhub
WorkingDirectory=/opt/openskillhub/backend
ExecStart=/usr/bin/node dist/app.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/openskillhub/.env

[Install]
WantedBy=multi-user.target
```

**前端 service** — `/etc/systemd/system/openskillhub-frontend.service`：

```ini
[Unit]
Description=OpenSkillHub Frontend
After=network.target openskillhub-backend.service

[Service]
Type=simple
User=openskillhub
WorkingDirectory=/opt/openskillhub/frontend
ExecStart=/usr/bin/node .next/standalone/frontend/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openskillhub-backend
sudo systemctl enable --now openskillhub-frontend
```

#### 方式 B: pm2

```bash
npm install -g pm2

# 后端
cd /opt/openskillhub/backend
pm2 start dist/app.js --name osh-backend

# 前端
cd /opt/openskillhub/frontend
pm2 start .next/standalone/frontend/server.js --name osh-frontend \
  --env NODE_ENV=production \
  --env HOSTNAME=0.0.0.0

# 设置开机自启
pm2 save
pm2 startup
```

#### 方式 C: 开发模式（tsx watch）

```bash
# 后端（热重载）
pnpm --filter @openskillhub/backend dev

# 前端（热重载）
pnpm --filter @openskillhub/frontend dev
```

---

## 4. 环境变量参考

### 后端

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | ✅ | — | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | — | JWT 签名密钥 |
| `SERVER_PORT` | — | `3001` | 监听端口 |
| `SERVER_HOST` | — | `0.0.0.0` | 监听地址 |
| `NODE_ENV` | — | — | `production` 启用 JSON 日志 |
| `CORS_ORIGIN` | — | `http://localhost:3000` | 允许的前端源 |
| `STORAGE_TYPE` | — | `local` | 存储类型: `local` / `s3` |
| `STORAGE_LOCAL_PATH` | — | `./storage` | 本地存储路径 |
| `S3_ENDPOINT` | — | `http://localhost:9000` | S3/MinIO 端点 |
| `S3_REGION` | — | `us-east-1` | S3 区域 |
| `S3_BUCKET` | — | `openskillhub-packages` | S3 桶名 |
| `S3_ACCESS_KEY` | — | `minioadmin` | S3 访问密钥 |
| `S3_SECRET_KEY` | — | `minioadmin` | S3 秘密密钥 |
| `S3_FORCE_PATH_STYLE` | — | `true` | MinIO 需要 true |
| `JWT_EXPIRES_IN` | — | `7d` | JWT 过期时间 |
| `LOG_LEVEL` | — | `info` | 日志级别 (debug/info/warn/error) |
| `LOG_DIR` | — | `./logs` | 日志文件目录 |

### 前端

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | 后端 API 地址 (含 `/api/v1`) |

---

## 5. Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;
    }
}
```

---

## 6. 常用运维命令

```bash
# 查看日志
docker compose logs -f backend          # Docker 模式
journalctl -u openskillhub-backend -f   # systemd 模式
pm2 logs osh-backend                     # pm2 模式

# 数据库迁移（版本更新后）
cd backend && npx prisma migrate deploy

# 备份数据库
pg_dump -U openskillhub openskillhub > backup_$(date +%F).sql

# 更新部署
git pull origin main
pnpm install
pnpm --filter @openskillhub/shared build
pnpm --filter @openskillhub/backend build
pnpm --filter @openskillhub/frontend build
cd backend && npx prisma migrate deploy && cd ..
sudo systemctl restart openskillhub-backend openskillhub-frontend
```
