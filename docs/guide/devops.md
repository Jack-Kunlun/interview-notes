---
title: DevOps 部署
description: Nginx 配置、Docker 容器化、CI/CD 流水线及常见面试题
---

# DevOps 部署（Nginx / Docker / CI/CD）

## 必会基础 ⭐⭐⭐

### Nginx 是什么？正向代理 vs 反向代理

Nginx 是一个高性能的 HTTP 和反向代理服务器，以事件驱动（epoll）模型处理请求，单机可支撑数万并发连接。正向代理位于客户端一侧，代表客户端访问外部资源；反向代理位于服务端一侧，代表服务端接收请求并转发给内部服务。

| 对比项 | 正向代理 | 反向代理 |
|---|---|---|
| 代理对象 | 客户端 | 服务端 |
| 客户端感知 | 需手动配置代理地址 | 无感知，只访问代理地址 |
| 典型用途 | 翻墙、访问内网资源 | 负载均衡、安全防护、缓存 |
| 配置位置 | 客户端浏览器/系统设置 | 服务端 Nginx 配置 |

### Nginx 配置：静态资源服务器

最基础的使用方式——托管前端构建产物。

```nginx
server {
    listen       80;
    server_name  example.com;
    root         /usr/share/nginx/html;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA history 模式回退
    }

    # 静态资源强缓存
    location ~* \.(js|css|png|jpg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Nginx 配置：反向代理

将请求转发给后端服务，解决跨域并隐藏后端真实地址。

```nginx
location /api/ {
    proxy_pass         http://backend:3000/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    # 超时配置
    proxy_connect_timeout 30s;
    proxy_read_timeout    60s;
}
```

### Nginx 配置：HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # HSTS：强制浏览器使用 HTTPS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        root /usr/share/nginx/html;
    }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### Nginx 配置：负载均衡

```nginx
upstream backend {
    # 加权轮询（默认）
    server backend1:3000 weight=3;
    server backend2:3000 weight=1;

    # IP Hash：同一客户端始终路由到同一服务器
    # ip_hash;

    # 最少连接
    # least_conn;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://backend;
    }
}
```

| 算法 | 原理 | 适用场景 |
|---|---|---|
| 轮询（默认） | 依次分配 | 服务器性能相近 |
| weight | 按权重比例分配 | 服务器性能差异大 |
| ip_hash | 按客户端 IP hash | 需要 session 保持 |
| least_conn | 分配给连接数最少的 | 长连接场景 |

### Gzip 压缩

```nginx
http {
    gzip on;
    gzip_comp_level 6;                    # 压缩级别 1-9
    gzip_min_length 256;                  # 小于此值不压缩
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_vary on;                         # 响应头加 Vary: Accept-Encoding
    gzip_proxied any;
}
```

### 缓存策略

```nginx
# 静态资源强缓存（带版本 hash 的文件）
location ~* \.[a-f0-9]{8,}\.(js|css)$ {
    expires 1y;
}

# HTML 协商缓存（确保更新及时生效）
location / {
    add_header Cache-Control "no-cache";  # 每次验证
}
```

| 缓存类型 | 响应头 | 状态码 | 请求是否发送 |
|---|---|---|---|
| 强缓存 | Cache-Control: max-age | 200 (from disk/memory cache) | 否 |
| 协商缓存 | ETag / Last-Modified | 304 Not Modified | 是 |

## Docker 配置 ⭐⭐⭐

### Dockerfile 核心指令

| 指令 | 用途 | 示例 |
|---|---|---|
| FROM | 基础镜像 | `FROM node:20-alpine` |
| WORKDIR | 工作目录 | `WORKDIR /app` |
| COPY | 复制文件 | `COPY package*.json ./` |
| RUN | 构建时执行命令 | `RUN npm ci --production` |
| EXPOSE | 声明端口 | `EXPOSE 3000` |
| CMD | 容器启动默认命令 | `CMD ["node", "server.js"]` |

### 前端多阶段构建 Dockerfile

```dockerfile
# 阶段 1：构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 阶段 2：运行（仅含 Nginx + 构建产物）
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### .dockerignore

```txt
# 依赖
node_modules
.pnpm-store

# 构建产物
dist
.vitepress/dist

# 环境 & 配置
.env
.env.local
.git

# IDE
.vscode
.idea
```

### docker-compose.yml（前端 + 后端 + Nginx）

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"

  backend:
    build:
      context: ./backend
    ports:
      - "3001:3000"
    environment:
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

### 常用 Docker 命令速查

```bash
# 构建
docker build -t my-app .                # 从 Dockerfile 构建
docker build --no-cache -t my-app .     # 无缓存构建

# 运行
docker run -d -p 3000:80 --name app my-app   # 后台运行 + 端口映射
docker run -e DB_HOST=localhost my-app        # 传环境变量

# 管理
docker ps                          # 运行中的容器
docker logs -f app                 # 实时日志
docker exec -it app sh             # 进入容器
docker stop app && docker rm app   # 停止并删除容器

# Compose
docker compose up -d               # 启动所有服务
docker compose logs -f backend     # 查看后端日志
docker compose down                # 停止并清理
docker compose restart backend     # 重启单服务
```

## CI/CD 基础 ⭐⭐

### GitHub Actions 部署 frontend

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install & Build
        run: |
          pnpm install --frozen-lockfile
          pnpm build

      - name: Deploy to Server
        uses: easingthemes/ssh-deploy@v5
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          SOURCE: 'dist/'
          REMOTE_HOST: ${{ secrets.HOST }}
          REMOTE_USER: ${{ secrets.USER }}
          TARGET: '/var/www/html'
```

### 部署流程

```
PR 提交 → CI: lint + test → Code Review → 合并 main
                                              ↓
                                       CI: build + docker push
                                              ↓
                                       CD: docker compose pull
                                              ↓
                                          冒烟测试
                                           ↓       ↘ 失败
                                      生产上线     → 回滚
```

## 常见面试题 ⭐⭐⭐

### 1. Nginx 如何做反向代理和负载均衡？

反向代理通过 `proxy_pass` 将请求转发给内部服务，对客户端完全透明。负载均衡通过 `upstream` 块定义多台服务器，Nginx 默认使用加权轮询算法分配请求。配合 `proxy_set_header` 传递真实客户端信息。

### 2. Docker 多阶段构建有什么优点？

- **镜像体积小**：构建依赖（node_modules、编译器）不进入最终镜像
- **安全性高**：不携带构建工具链，减少攻击面
- **构建缓存**：每阶段独立缓存，未变更层直接复用

| 对比 | 单阶段 | 多阶段 |
|---|---|---|
| Node.js 应用镜像 | ~900MB | ~150MB |
| 含构建工具 | ✅ | ❌ |
| 分层复用 | 全部 | 每阶段独立 |

### 3. 描述一个完整的部署流程

① **触发**：代码推送到 main 分支 → GitHub Actions 自动执行
② **CI**：lint → test → build → 构建 Docker 镜像并推送到镜像仓库
③ **CD**：服务器拉取最新镜像 → docker compose up -d 启动
④ **验证**：冒烟测试（健康检查 / 关键页面可访问）
⑤ **监控**：Sentry + Grafana 监控错误和资源

### 4. Nginx `try_files` 指令的作用？

`try_files` 按顺序检查文件是否存在。SPA history 模式下直接访问 `/about`，Nginx 找不到对应静态文件会 404；`try_files $uri $uri/ /index.html` 让所有未匹配路由回退到 `index.html`，由前端路由接管。

```nginx
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

## 补充知识 ⭐

### Nginx 全局性能配置

```nginx
worker_processes   auto;           # 按 CPU 核数自动设置
worker_rlimit_nofile 65535;        # worker 最大文件打开数

events {
    worker_connections  4096;      # 每个 worker 最大连接数
    use                 epoll;
    multi_accept        on;
}

http {
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    client_max_body_size 20m;
    server_tokens       off;
}
```

### Docker 网络模式

| 网络模式 | 容器间通信 | 端口映射 | 适用场景 |
|---|---|---|---|
| bridge | ✅ 服务名 DNS | ✅ -p 映射 | 单机多容器 |
| host | ✅ localhost | 直接监听宿主机 | 高性能网络 |
| overlay | ✅ 跨主机 | — | Docker Swarm |
| none | ❌ | ❌ | 安全隔离 |

### 部署策略对比

| 策略 | 回滚速度 | 资源成本 | 风险 |
|---|---|---|---|
| 蓝绿部署 | 秒级（切换流量） | 2 倍 | 全量切换后暴露 |
| 滚动更新 | 逐步回滚 | 1.x 倍 | 过程中可发现 |
| 灰度发布 | 切回小流量 | 1.x 倍 | 小范围暴露 |
