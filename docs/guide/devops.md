---
title: DevOps 部署
description: Nginx、Docker、CI/CD 核心知识
---

# DevOps 部署

## 一、Nginx 核心能力

### 正向代理 vs 反向代理

| | 正向代理 | 反向代理 |
|---|---|---|
| 代理对象 | 客户端 | 服务端 |
| 客户端感知 | 需手动配置 | 无感知 |
| 典型用途 | 翻墙、访问内网 | 负载均衡、安全防护、缓存 |

### 静态资源服务器

```nginx
server {
    listen 80;
    server_name example.com;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA history 模式回退
    }

    location ~* \.(js|css|png|jpg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 反向代理

```nginx
location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

> **经典坑**：`proxy_pass` 末尾加 `/` 会剥离 location 前缀（`/api/user` → `/user`），不加则原样转发（`/api/user` → `/api/user`）。配错后端直接 404。

### 负载均衡

```nginx
upstream backend {
    server backend1:3000 weight=3;  # 加权轮询
    server backend2:3000 weight=1;
    # ip_hash;     # 同一客户端始终同服务器
    # least_conn;  # 最少连接
}
```

| 算法 | 适用场景 |
|------|---------|
| 轮询（默认） | 服务器性能相近 |
| weight | 性能差异大 |
| ip_hash | 需要 session 保持 |
| least_conn | 长连接场景 |

> ip_hash 的坑：后端增减导致 hash 重分配，已有 session 丢失；NAT 网络下多用户共享出口 IP 全打到同一台。

### HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;
}
server { listen 80; server_name example.com; return 301 https://$host$request_uri; }
```

### 性能基础配置

```nginx
worker_processes auto;              # 按 CPU 核数
worker_connections 4096;            # 每 worker 最大连接数
sendfile on;                        # 零拷贝，静态文件直出
tcp_nopush on;
keepalive_timeout 65;               # 长连接复用
client_max_body_size 20m;           # 上传限制（默认 1MB）
```

> **踩坑**：没配 `client_max_body_size`，用户上传 5MB 图片直接 413。`proxy_pass` 后没配 `X-Real-IP` 和 `X-Forwarded-For`，后端日志全是 `127.0.0.1`，无法做 IP 限流。

---

## 二、Docker 容器化

### 多阶段构建

第一阶段用完整 Node.js 镜像装依赖编译，第二阶段用纯净 Nginx alpine，只拷构建产物：

```dockerfile
# 阶段 1：构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 阶段 2：运行
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**为什么镜像小**：每个 `FROM` 是独立阶段，只有 `COPY --from` 的内容进入最终镜像。node_modules（几百 MB）、devDependencies、构建工具链全部丢弃。最终镜像只有 Nginx alpine + 静态文件，~20-50MB。

### Docker Compose

```yaml
services:
  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    depends_on: [frontend, backend]
  frontend:
    build: ./frontend
    ports: ["3000:80"]
  backend:
    build: ./backend
    environment: [DB_HOST=db, REDIS_HOST=redis]
    depends_on: [db, redis]
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
```

> **踩坑**：`depends_on` 只等容器启动（running），不等服务就绪（端口监听）。backend 起得比 db 快直接报 `ECONNREFUSED`。修复：backend 的 entrypoint 加 `wait-for-it.sh db:5432`，或给 db 加 healthcheck。

### 常用命令

```bash
docker build -t my-app .                # 构建
docker run -d -p 3000:80 --name app my-app  # 运行
docker compose up -d                    # 启动所有服务
docker compose logs -f backend          # 查看日志
docker compose down                     # 停止并清理
```

---

## 三、CI/CD 流水线

### GitHub Actions 部署

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile && pnpm build
      - name: Deploy
        uses: easingthemes/ssh-deploy@v5
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          SOURCE: 'dist/'
          TARGET: '/var/www/html'
```

### 完整部署流程

```
PR → lint + test → Code Review → 合并 main
                                    ↓
                              build + docker push
                                    ↓
                             docker compose pull & up -d
                                    ↓
                                 冒烟测试
                                 ↓       ↘ 失败
                              上线     → 回滚
```

> CI 和 CD 的分界线：CI 止于"产物就绪且通过测试"，CD 从"部署到目标环境"开始。**数据库迁移永远不要集成到 CI/CD**——DDL 可能锁表导致生产故障，改为人工触发或 feature flag 兼容新旧 schema。

---

## 四、部署策略

| 策略 | 回滚速度 | 资源成本 | 适用 |
|------|---------|---------|------|
| 滚动更新 | 逐步 | 1.x 倍 | 常规业务（K8s RollingUpdate） |
| 蓝绿部署 | 秒级切流量 | 2 倍 | 对 downtime 零容忍 |
| 灰度发布 | 切回小流量 | 1.x 倍 | 大版本验证 |

> **sendfile on 原理**：正常读文件走 磁盘→内核→用户态→socket→网卡，四次拷贝两次上下文切换。sendfile 让内核直接把数据从内核缓冲区推到 socket，完全不过用户态，大文件场景 CPU 占用降 50%+。

> **选型**：小团队 2~5 台机器用 Compose 单机部署足够，K8s 概念堆叠维护成本高。等需要多机编排时再用 Kompose 一键迁移。GitHub Actions vs Jenkins——GH Actions 零运维、和 GitHub 深度集成，Jenkins 需自建 master/agent/插件升级。Docker vs rsync——Docker 把 OS+运行时+依赖全打包，消灭"我本地能跑"的环境问题。
